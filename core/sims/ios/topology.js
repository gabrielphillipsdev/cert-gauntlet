/* Cert Gauntlet — IOS simulator: topology, convergence and packet forwarding.

   Topology = devices (Device / Host) + links. converge() derives every runtime fact from configuration:
     link + line-protocol status, EtherChannel bundles, DTP trunk negotiation, SVI status,
     per-VLAN STP roles, CDP/LLDP neighbor tables, OSPF adjacencies + SPF routes, routing tables (v4/v6),
     DHCP leases, port-security state.
   ping()/traceroute() then push a packet hop by hop through that state: ARP on the L2 segment (flooding
   through switches honoring access/trunk/native/allowed/STP), routing table lookup, inbound/outbound ACLs,
   NAT (static, dynamic, PAT), TTL. A ping succeeds only if the reply makes it back the same way. */
import {
  ip4, str4, lenMask, network, networkStr, sameSubnet, inPrefix, wildcardMatch, isIPv4, classfulLen,
  parse6, fmt6, prefix6, samePrefix6, isLinkLocal6, linkLocalFromMac, eui64, eq6, isValidHostAddr, broadcast,
} from "./net.js";
import { Device, Host, ifType, isPhysical, isSub, parentOf, ifSpeedMbps, parseIfName } from "./device.js";

export class Topology {
  constructor() { this.devices = {}; this.links = []; this.clock = 0; this.pingSeq = 0; this.converged = false; }

  /* ---------- building ---------- */
  add(name, opts = {}) { const n = Object.keys(this.devices).length + 1; const d = new Device(name, { hostname: opts.hostname ?? name, macBase: 0x000142000000 + n * 0x100, ...opts }); this.devices[name] = d; d.topo = this; this.converged = false; return d; }
  addHost(name, opts = {}) { const n = Object.keys(this.devices).length + 1; const h = new Host(name, { mac: fmtMacHex(0x00e04c000000 + n * 0x100 + 1), ...opts }); this.devices[name] = h; h.topo = this; this.converged = false; return h; }
  get(name) { const d = this.devices[name]; if (!d) throw new Error("no device " + name); return d; }
  byHostname(h) { return Object.values(this.devices).find(d => d.hostname === h) || null; }
  link(a, ifA, b, ifB) {
    const da = this.get(a), db = this.get(b);
    const na = da.isHost ? "Ethernet0" : parseIfName(ifA).name, nb = db.isHost ? "Ethernet0" : parseIfName(ifB).name;
    if (!da.isHost && !da.interfaces[na]) throw new Error(`${a} has no ${na}`);
    if (!db.isHost && !db.interfaces[nb]) throw new Error(`${b} has no ${nb}`);
    this.links.push({ a: da, ia: na, b: db, ib: nb }); this.converged = false; return this;
  }
  unlink(a, ifA) { const da = this.get(a); const na = da.isHost ? "Ethernet0" : parseIfName(ifA).name; this.links = this.links.filter(l => !(l.a === da && l.ia === na) && !(l.b === da && l.ib === na)); this.converged = false; }
  peer(dev, ifName) {
    for (const l of this.links) { if (l.a === dev && l.ia === ifName) return { dev: l.b, iface: l.ib }; if (l.b === dev && l.ib === ifName) return { dev: l.a, iface: l.ia }; }
    return null;
  }
  dirty() { this.converged = false; }
  tick(sec = 1) { this.clock += sec; }
  routers() { return Object.values(this.devices).filter(d => !d.isHost); }
  switches() { return Object.values(this.devices).filter(d => d.isSwitch); }

  /* =====================================================================
     CONVERGENCE
     ===================================================================== */
  converge() {
    const devs = this.routers();
    // 0. reset runtime
    for (const d of devs) {
      for (const i of Object.values(d.interfaces)) i.rt = { up: false, proto: false, linked: false, bundled: false, opMode: null, stp: {}, errDisabled: i.rt?.errDisabled || false, members: [], ospf: null };
      d.rt.cdp = []; d.rt.lldp = []; d.rt.routes = []; d.rt.routes6 = []; d.rt.ospfNbrs = []; d.rt.ospfIfs = []; d.rt.ospfRoutes = []; d.rt.ospfDb = { routers: [], nets: [] }; d.rt.stp = {}; d.rt.dhcpBindings = d.rt.dhcpBindings || [];
      d.rt.arp = d.rt.arp || []; d.rt.mac = (d.rt.mac || []).filter(m => m.type === "STATIC"); d.rt.nat = d.rt.nat || []; d.rt.aclHits = d.rt.aclHits || {};
    }
    // 1. physical link status (two passes so peer shutdown is seen)
    for (const d of devs) for (const i of Object.values(d.interfaces)) if (isPhysical(i.name)) {
      const p = this.peer(d, i.name); i.rt.linked = !!p;
      i.rt.up = !i.shutdown && !i.rt.errDisabled && !!p && (p.dev.isHost || !p.dev.interfaces[p.iface].shutdown) && !(p.dev.isHost ? false : p.dev.interfaces[p.iface].rt.errDisabled);
      i.rt.proto = i.rt.up;
      if (ifType(i.name) === "Serial" && i.rt.up && p && !p.dev.isHost) { const pi = p.dev.interfaces[p.iface]; if (!(i.clockRate || pi.clockRate)) { /* real IOS: up/down without clock; we are lenient */ } }
    }
    // 2. port security (static violations) — host behind port must be allowed
    for (const d of this.switches()) for (const i of Object.values(d.interfaces)) if (i.portsec.on && i.switchport?.on && isPhysical(i.name)) {
      const p = this.peer(d, i.name); if (!p || !p.dev.isHost || !i.rt.up) continue;
      const mac = p.dev.mac;
      if (i.portsec.sticky && !i.portsec.macs.some(m => m.mac === mac) && i.portsec.macs.length < i.portsec.max) i.portsec.macs.push({ mac, sticky: true });
      const allowed = i.portsec.macs.some(m => m.mac === mac) || i.portsec.macs.length < i.portsec.max;
      i.rt.psecViolation = !allowed;
      if (!allowed) { i.rt.psecCount = (i.rt.psecCount || 0) + 1; if (i.portsec.violation === "shutdown") { i.rt.errDisabled = true; i.rt.up = false; i.rt.proto = false; } }
      else i.rt.psecCount = i.rt.psecCount || 0;
    }
    // 3. EtherChannel bundles
    for (const d of this.switches()) {
      const groups = {};
      for (const i of Object.values(d.interfaces)) if (i.channelGroup && isPhysical(i.name)) (groups[i.channelGroup.id] ||= []).push(i);
      for (const [gid, members] of Object.entries(groups)) {
        const po = d.ensureIface("Port-channel" + gid); po.rt.members = members; po.rt.protocol = members[0].channelGroup.mode === "on" ? "-" : /active|passive/.test(members[0].channelGroup.mode) ? "LACP" : "PAgP";
        let anyBundled = false;
        for (const m of members) {
          m.rt.poFlag = "D"; const p = this.peer(d, m.name);
          if (!m.rt.up || !p || p.dev.isHost || !p.dev.isSwitch) continue;
          const pm = p.dev.interfaces[p.iface];
          if (!pm.channelGroup) { m.rt.poFlag = "I"; continue; }      // stand-alone
          const ok = compatible(m.channelGroup.mode, pm.channelGroup.mode);
          const consistent = members.every(x => x.channelGroup.mode === m.channelGroup.mode);
          const peerGroupIds = members.map(x => { const pp = this.peer(d, x.name); return pp && !pp.dev.isHost ? pp.dev.label + "/" + pp.dev.interfaces[pp.iface].channelGroup?.id : null; });
          const samePeer = peerGroupIds.every(x => x === peerGroupIds[0]);
          if (ok && consistent && samePeer) { m.rt.poFlag = "P"; m.rt.bundled = true; anyBundled = true; } else m.rt.poFlag = ok ? "s" : "I";
        }
        po.rt.up = anyBundled && !po.shutdown; po.rt.proto = po.rt.up; po.rt.linked = anyBundled;
        if (po.switchport) for (const m of members) if (m.rt.bundled && m.switchport) m.switchport = { ...po.switchport, allowed: po.switchport.allowed ? new Set(po.switchport.allowed) : null };
      }
    }
    // 4. DTP / operational switchport mode
    for (const d of this.switches()) for (const i of Object.values(d.interfaces)) if (i.switchport?.on) {
      const p = this.peer(d, i.name) || (ifType(i.name) === "Port-channel" && i.rt.members[0] ? this.peer(d, i.rt.members[0].name) : null);
      const peerSw = p && !p.dev.isHost && p.dev.isSwitch ? p.dev.interfaces[p.iface] : null;
      const peerMode = peerSw?.switchport?.on ? (peerSw.channelGroup && p.dev.interfaces["Port-channel" + peerSw.channelGroup.id]?.switchport ? p.dev.interfaces["Port-channel" + peerSw.channelGroup.id].switchport.mode : peerSw.switchport.mode) : "none";
      const peerNoneg = peerSw?.switchport?.nonegotiate;
      const m = i.switchport.mode;
      let op = "static access";
      if (m === "trunk") op = "trunk";
      else if (m === "access") op = "static access";
      else if (m === "dynamic desirable") op = (!peerNoneg && (peerMode === "trunk" || peerMode.startsWith("dynamic"))) ? "trunk" : "static access";
      else if (m === "dynamic auto") op = (!peerNoneg && (peerMode === "trunk" || peerMode === "dynamic desirable")) ? "trunk" : "static access";
      i.rt.opMode = op;
    }
    // 5. subinterfaces, loopbacks, SVIs
    for (const d of devs) for (const i of Object.values(d.interfaces)) {
      const t = ifType(i.name);
      if (t === "Loopback") { i.rt.up = !i.shutdown; i.rt.proto = i.rt.up; i.rt.linked = true; }
      else if (isSub(i.name)) { const par = d.interfaces[parentOf(i.name)]; i.rt.up = !i.shutdown && !!par?.rt.up; i.rt.proto = i.rt.up; }
    }
    for (const d of this.switches()) for (const i of Object.values(d.interfaces)) if (ifType(i.name) === "Vlan") {
      const v = +i.name.slice(4);
      const exists = !!d.vlans[v];
      const anyPort = Object.values(d.interfaces).some(x => x.switchport?.on && x.rt.up && (ifType(x.name) !== "Port-channel" ? !x.rt.bundled : true) && this.portCarries(x, v));
      i.rt.up = !i.shutdown; i.rt.proto = i.rt.up && exists && anyPort; i.rt.linked = exists;
      if (!exists || !anyPort) { i.rt.up = !i.shutdown; }
    }
    // 6. STP per VLAN
    this.computeStp();
    // 7. CDP / LLDP
    for (const l of this.links) {
      if (l.a.isHost || l.b.isHost) continue;
      const ia = l.a.interfaces[l.ia], ib = l.b.interfaces[l.ib]; if (!ia.rt.up || !ib.rt.up) continue;
      if (l.a.cdp && l.b.cdp && ia.cdp !== false && ib.cdp !== false) { l.a.rt.cdp.push({ dev: l.b, local: l.ia, remote: l.ib }); l.b.rt.cdp.push({ dev: l.a, local: l.ib, remote: l.ia }); }
      if (l.a.lldp && l.b.lldp) { l.a.rt.lldp.push({ dev: l.b, local: l.ia, remote: l.ib }); l.b.rt.lldp.push({ dev: l.a, local: l.ib, remote: l.ia }); }
    }
    // 8. IPv6 link-locals
    for (const d of devs) for (const i of Object.values(d.interfaces)) {
      i.rt.ll6 = (i.ipv6.length || i.ipv6Enable) ? (i.ipv6LinkLocal ? parse6(i.ipv6LinkLocal) : linkLocalFromMac(i.mac || d.baseMac)) : null;
      i.rt.v6 = i.ipv6.map(a => a.eui64 ? { g: eui64(i.mac || d.baseMac, parse6(a.addr)), len: a.len, eui64: true } : { g: parse6(a.addr), len: a.len });
    }
    // 9. routing: connected + static, then OSPF, then DHCP
    this.converged = true;                 // forwarding helpers below need link state only
    for (const d of devs) this.buildRoutes(d, false);
    this.computeOspf();
    for (const d of devs) this.buildRoutes(d, true);
    for (const d of devs) this.buildRoutes6(d);
    this.assignDhcp();
    return this;
  }

  /* does a switchport (operationally) carry vlan v? */
  portCarries(i, v) {
    if (!i.switchport?.on) return false;
    if (i.rt.opMode === "trunk") return (!i.switchport.allowed || i.switchport.allowed.has(v));
    return i.switchport.access === v || i.switchport.voice === v;
  }

  /* ---------- STP ---------- */
  computeStp() {
    const sws = this.switches();
    const vlans = new Set(); for (const s of sws) for (const v of Object.keys(s.vlans)) if (+v < 1002) vlans.add(+v);
    for (const v of vlans) {
      const nodes = sws.filter(s => s.vlans[v]);
      if (!nodes.length) continue;
      const bid = s => ({ pri: (s.stpPriority[v] ?? 32768) + v, mac: s.baseMac, key: ((s.stpPriority[v] ?? 32768) + v).toString().padStart(5, "0") + s.baseMac });
      // logical ports carrying v: physical non-bundled up ports + up port-channels
      const ports = s => Object.values(s.interfaces).filter(i => i.switchport?.on && i.rt.up && (ifType(i.name) === "Port-channel" || !i.rt.bundled) && this.portCarries(i, v));
      const peerOf = (s, i) => { const p = ifType(i.name) === "Port-channel" ? this.peer(s, i.rt.members.find(m => m.rt.bundled)?.name) : this.peer(s, i.name); if (!p) return null; if (p.dev.isHost || !p.dev.isSwitch || !nodes.includes(p.dev)) return { dev: p.dev, iface: null, sw: false }; let pi = p.dev.interfaces[p.iface]; if (pi.channelGroup && pi.rt.bundled) pi = p.dev.interfaces["Port-channel" + pi.channelGroup.id]; if (!pi.rt.up || !this.portCarries(pi, v)) return null; return { dev: p.dev, iface: pi, sw: true }; };
      const root = nodes.slice().sort((a, b) => bid(a).key < bid(b).key ? -1 : 1)[0];
      // Dijkstra from root: dist, root port
      const info = new Map(nodes.map(n => [n, { cost: Infinity, rootPort: null, via: null }]));
      info.get(root).cost = 0;
      const done = new Set(); const portId = i => (i.stp.priority ?? 128) + "." + portNum(i.name);
      while (done.size < nodes.length) {
        let cur = null; for (const n of nodes) if (!done.has(n) && (!cur || info.get(n).cost < info.get(cur).cost)) cur = n;
        if (!cur || info.get(cur).cost === Infinity) break; done.add(cur);
        for (const i of ports(cur)) {
          const p = peerOf(cur, i); if (!p || !p.sw) continue;
          const nc = info.get(cur).cost + stpCost(p.iface);
          const ni = info.get(p.dev);
          const better = nc < ni.cost || (nc === ni.cost && ni.via && (bid(cur).key < bid(ni.via).key || (cur === ni.via && portId(i) < portId(ni.viaPort))));
          if (better) { ni.cost = nc; ni.rootPort = p.iface; ni.via = cur; ni.viaPort = i; }
        }
      }
      for (const s of nodes) {
        const me = info.get(s);
        const inst = { vlan: v, root: root === s, rootId: bid(root), bridgeId: bid(s), cost: me.cost === Infinity ? 0 : me.cost, rootPort: me.rootPort?.name || null, ports: [] };
        for (const i of ports(s)) {
          const p = peerOf(s, i);
          let role = "Desg", sts = "FWD", type = "P2p" + (i.stp.portfast || (s.stpPortfastDefault && p && !p.sw) ? " Edge" : "");
          if (p && p.sw) {
            if (me.rootPort === i) role = "Root";
            else {
              const other = info.get(p.dev);
              const iAmDesignated = me.cost < other.cost || (me.cost === other.cost && bid(s).key < bid(p.dev).key);
              if (!iAmDesignated) { role = "Altn"; sts = "BLK"; }
            }
          }
          i.rt.stp[v] = { role, sts, cost: stpCost(i), portId: portId(i), type };
          inst.ports.push({ name: i.name, role, sts, cost: stpCost(i), portId: portId(i), type });
        }
        s.rt.stp[v] = inst;
      }
    }
  }
  stpForwarding(i, v) { const st = i.rt.stp?.[v]; return !st || st.sts === "FWD"; }

  /* ---------- OSPF ---------- */
  ospfIfaces(d) {
    if (!d.ospf) return [];
    const out = [];
    for (const i of Object.values(d.interfaces)) {
      if (!i.ip || !i.rt.up) continue;
      let area = null;
      if (i.ospf && i.ospf.pid === d.ospf.pid) area = i.ospf.area;
      else for (const n of d.ospf.networks) if (wildcardMatch(i.ip.addr, n.addr, n.wild)) { area = n.area; break; }
      if (area === null) continue;
      const passive = d.ospf.passiveDefault ? !d.ospf.noPassive.has(i.name) : d.ospf.passive.has(i.name);
      const cost = i.ospfCost ?? Math.max(1, Math.floor(d.ospf.refBw / (i.bandwidth ? i.bandwidth / 1000 : ifSpeedMbps(i.name))));
      const type = ifType(i.name) === "Loopback" ? "LOOPBACK" : ifType(i.name) === "Serial" ? "POINT_TO_POINT" : i.ospfNetwork === "point-to-point" ? "POINT_TO_POINT" : "BROADCAST";
      out.push({ dev: d, iface: i, area, passive, cost, type, priority: i.ospfPriority, state: null, dr: null, bdr: null, nbrs: [] });
    }
    return out;
  }
  computeOspf() {
    const routers = this.routers().filter(d => d.ospf && d.isL3);
    const all = []; for (const d of routers) { d.rt.ospfIfs = this.ospfIfaces(d); d.rt.ospfRid = d.routerId(); all.push(...d.rt.ospfIfs); }
    // segments: group OSPF interfaces that can reach each other at L2 and share subnet + area
    const segs = []; const seen = new Set();
    for (const oi of all) {
      if (seen.has(oi) || oi.type === "LOOPBACK") continue;
      const seg = [oi]; seen.add(oi);
      const eps = this.l2Endpoints(oi.dev, oi.iface);
      for (const ep of eps) {
        const other = all.find(x => x.dev === ep.dev && x.iface === ep.iface);
        if (other && !seen.has(other) && other.iface.ip.len === oi.iface.ip.len && sameSubnet(other.iface.ip.addr, oi.iface.ip.addr, oi.iface.ip.len) && other.area === oi.area) { seg.push(other); seen.add(other); }
      }
      segs.push(seg);
    }
    for (const seg of segs) {
      const active = seg.filter(x => !x.passive);
      const isP2p = seg.some(x => x.type === "POINT_TO_POINT");
      if (!isP2p) {
        const elig = active.filter(x => x.priority > 0).sort((a, b) => b.priority - a.priority || cmpIpDesc(a.dev.rt.ospfRid, b.dev.rt.ospfRid));
        const dr = elig[0] || null, bdr = elig[1] || null;
        for (const x of seg) { x.dr = dr; x.bdr = bdr; x.state = x.passive ? "DOWN" : x === dr ? "DR" : x === bdr ? "BDR" : "DROTHER"; }
      } else for (const x of seg) x.state = x.passive ? "DOWN" : "P2P";
      for (const x of active) for (const y of active) if (x !== y) {
        const full = isP2p || x.state === "DR" || x.state === "BDR" || y.state === "DR" || y.state === "BDR";
        const st = isP2p ? "FULL/  -" : (full ? "FULL/" : "2WAY/") + (y.state === "DR" ? "DR" : y.state === "BDR" ? "BDR" : "DROTHER");
        x.nbrs.push({ rid: y.dev.rt.ospfRid, pri: y.priority, state: st, addr: y.iface.ip.addr, iface: x.iface.name, dev: y.dev, full });
        x.dev.rt.ospfNbrs.push(x.nbrs[x.nbrs.length - 1]);
      }
    }
    // SPF per router over adjacency graph (any neighbor on a shared segment exchanges LSAs via DR)
    for (const d of routers) {
      const dist = new Map([[d, 0]]); const first = new Map(); // first hop: {via, iface, area}
      const Q = [d]; const settled = new Set();
      while (Q.length) {
        Q.sort((a, b) => dist.get(a) - dist.get(b)); const cur = Q.shift(); if (settled.has(cur)) continue; settled.add(cur);
        for (const oi of cur.rt.ospfIfs) for (const n of oi.nbrs) {
          const nd = dist.get(cur) + oi.cost;
          if (!dist.has(n.dev) || nd < dist.get(n.dev)) {
            dist.set(n.dev, nd); first.set(n.dev, cur === d ? [{ via: n.addr, iface: oi.iface.name, area: oi.area }] : first.get(cur));
            Q.push(n.dev);
          } else if (nd === dist.get(n.dev) && cur === d) { const f = first.get(n.dev); if (!f.some(x => x.via === n.addr)) f.push({ via: n.addr, iface: oi.iface.name, area: oi.area }); }
        }
      }
      d.rt.ospfRoutes = []; d.rt.ospfDb = { routers: [], nets: [] };
      const myNets = new Set(d.rt.ospfIfs.map(x => networkStr(x.iface.ip.addr, x.iface.ip.len) + "/" + x.iface.ip.len));
      const cands = {};
      for (const r of routers) {
        if (!dist.has(r) || r === d) continue;
        for (const oi of r.rt.ospfIfs) {
          const len = oi.type === "LOOPBACK" ? 32 : oi.iface.ip.len;
          const key = networkStr(oi.iface.ip.addr, len) + "/" + len;
          if (myNets.has(key) || d.allIps().some(x => x.ip === oi.iface.ip.addr)) continue;
          if (len !== 32 && d.rt.ospfIfs.some(x => x.iface.ip.len === len && sameSubnet(x.iface.ip.addr, oi.iface.ip.addr, len))) continue;
          const metric = dist.get(r) + oi.cost;
          const hops = first.get(r);
          const c = cands[key] ||= { metric: Infinity, hops: [], area: oi.area };
          if (metric < c.metric) { c.metric = metric; c.hops = hops.slice(); c.area = oi.area; }
          else if (metric === c.metric) for (const h of hops) if (!c.hops.some(x => x.via === h.via)) c.hops.push(h);
        }
        // E2 default
        if (r.ospf.defOrig?.on && (r.ospf.defOrig.always || r.routes.some(s => s.len === 0) || r.rt.routes.some(x => x.len === 0 && x.code !== "O*E2"))) {
          const c = cands["0.0.0.0/0"] ||= { metric: Infinity, hops: [], e2: true, fwd: dist.get(r) };
          if (dist.get(r) < c.fwd || c.metric === Infinity) { c.metric = 1; c.fwd = dist.get(r); c.hops = first.get(r).slice(); }
        }
      }
      for (const [key, c] of Object.entries(cands)) {
        const [p, l] = key.split("/");
        const code = c.e2 ? "O*E2" : (c.hops.every(h => h.area === c.area) ? "O" : "O IA");
        d.rt.ospfRoutes.push({ prefix: p, len: +l, code, ad: 110, metric: c.metric, nhs: c.hops.map(h => ({ via: h.via, iface: h.iface })) });
      }
      // database summary
      for (const r of routers) if (dist.has(r)) {
        for (const area of new Set(r.rt.ospfIfs.map(x => x.area))) d.rt.ospfDb.routers.push({ area, rid: r.rt.ospfRid, links: r.rt.ospfIfs.filter(x => x.area === area).length });
        for (const oi of r.rt.ospfIfs) if (oi.state === "DR" && oi.nbrs.length) d.rt.ospfDb.nets.push({ area: oi.area, linkId: oi.iface.ip.addr, rid: r.rt.ospfRid });
      }
    }
  }

  /* ---------- routing tables ---------- */
  buildRoutes(d, withOspf) {
    const R = [];
    const canRoute = d.isL3 && d.ipRouting;
    const l3Ifaces = Object.values(d.interfaces).filter(i => i.ip && i.rt.up && i.rt.proto !== false && (!d.isSwitch || !i.switchport?.on));
    for (const i of l3Ifaces) {
      const addrs = [i.ip, ...i.secondary];
      for (const a of addrs) {
        R.push({ prefix: networkStr(a.addr, a.len), len: a.len, code: "C", ad: 0, metric: 0, nhs: [{ iface: i.name }] });
        R.push({ prefix: a.addr, len: 32, code: "L", ad: 0, metric: 0, nhs: [{ iface: i.name }] });
      }
    }
    if (canRoute) {
      // statics: group by prefix, install lowest AD whose next hop resolves
      const groups = {};
      for (const s of d.routes) (groups[s.prefix + "/" + s.len] ||= []).push(s);
      for (const [key, list] of Object.entries(groups)) {
        if (R.some(r => r.prefix + "/" + r.len === key && r.code === "C")) continue;
        const usable = list.filter(s => (s.iface ? d.interfaces[s.iface]?.rt.up : this.resolveNextHop(d, s.nh, R) !== null)).sort((a, b) => a.ad - b.ad);
        if (!usable.length) continue;
        const best = usable.filter(s => s.ad === usable[0].ad);
        R.push({ prefix: best[0].prefix, len: best[0].len, code: best[0].len === 0 ? "S*" : "S", ad: best[0].ad, metric: 0, ifaceShown: best.some(s => s.iface && s.nh), nhs: best.map(s => ({ via: s.nh || null, iface: s.iface || this.resolveNextHop(d, s.nh, R)?.iface })) });
      }
      if (withOspf && d.rt.ospfRoutes) for (const o of d.rt.ospfRoutes) {
        const ex = R.find(r => r.prefix === o.prefix && r.len === o.len);
        if (ex && ex.ad <= o.ad) continue;
        if (ex) R.splice(R.indexOf(ex), 1);
        R.push({ ...o });
      }
    } else if (d.isSwitch && d.defaultGateway) {
      // L2 switch: everything off-net goes to the default gateway (rendered separately by show ip route)
      R.push({ prefix: "0.0.0.0", len: 0, code: "S*", ad: 1, metric: 0, nhs: [{ via: d.defaultGateway, iface: this.resolveNextHop(d, d.defaultGateway, R)?.iface }], gwOnly: true });
    }
    R.sort((a, b) => cmpIp(a.prefix, b.prefix) || a.len - b.len);
    d.rt.routes = R;
  }
  resolveNextHop(d, nh, table) {
    if (!nh) return null;
    const conn = (table || d.rt.routes).filter(r => r.code === "C" && inPrefix(nh, r.prefix, r.len));
    if (!conn.length) return null;
    const best = conn.sort((a, b) => b.len - a.len)[0];
    return { iface: best.nhs[0].iface };
  }
  /* longest-prefix match; returns {route, nh:{via,iface}} resolved to an exit interface */
  lookup(d, dst) {
    const R = d.rt.routes || [];
    let best = null;
    for (const r of R) if (inPrefix(dst, r.prefix, r.len) && (!best || r.len > best.len)) best = r;
    if (!best) return null;
    const nh = best.nhs[0];
    if (nh.iface) return { route: best, via: nh.via || null, iface: nh.iface, connected: best.code === "C" || best.code === "L" };
    // recursive (next hop only)
    const rec = this.lookup(d, nh.via);
    if (!rec || !rec.connected) return null;
    return { route: best, via: nh.via, iface: rec.iface, connected: false };
  }
  buildRoutes6(d) {
    const R = [];
    for (const i of Object.values(d.interfaces)) if (i.rt.up && i.rt.v6?.length) for (const a of i.rt.v6) {
      if (isLinkLocal6(a.g)) continue;
      R.push({ prefix: prefix6(a.g, a.len), len: a.len, code: "C", ad: 0, metric: 0, iface: i.name });
      R.push({ prefix: a.g, len: 128, code: "L", ad: 0, metric: 0, iface: i.name });
    }
    for (const s of d.routes6) {
      if (s.iface && !d.interfaces[s.iface]?.rt.up) continue;
      if (!s.iface && !R.some(r => r.code === "C" && samePrefix6(parse6(s.nh), r.prefix, r.len))) continue;
      const ex = R.find(r => r.len === s.len && eq6(r.prefix, s.prefix)); if (ex && ex.ad <= s.ad) continue; if (ex) R.splice(R.indexOf(ex), 1);
      R.push({ prefix: s.prefix, len: s.len, code: "S", ad: s.ad, metric: 0, iface: s.iface || R.find(r => r.code === "C" && samePrefix6(parse6(s.nh), r.prefix, r.len)).iface, via: s.nh || null });
    }
    d.rt.routes6 = R;
  }
  lookup6(d, g) {
    let best = null;
    for (const r of d.rt.routes6 || []) if (samePrefix6(g, r.prefix, r.len) && (!best || r.len > best.len)) best = r;
    return best;
  }

  /* ---------- DHCP ---------- */
  assignDhcp() {
    for (const d of this.routers()) d.rt.dhcpBindings = [];
    for (const h of Object.values(this.devices)) {
      if (!h.isHost || !h.dhcp) continue;
      h.rt.lease = null; h.ip = null; h.gw = null;
      const eps = this.l2Endpoints(h, h.iface()).filter(e => !e.dev.isHost && e.dev.isL3 && e.iface.ip && e.iface.rt.up);
      let server = null, pool = null, relayIf = null;
      for (const ep of eps) {
        const p = findPool(ep.dev, ep.iface.ip.addr); if (p) { server = ep.dev; pool = p; relayIf = ep.iface; break; }
      }
      if (!server) for (const ep of eps) for (const helper of ep.iface.helper) {
        const srv = this.routers().find(r => r.hasIp(helper)); if (!srv) continue;
        if (!this.reach(ep.dev, helper)) continue;
        const p = findPool(srv, ep.iface.ip.addr); if (p) { server = srv; pool = p; relayIf = ep.iface; break; }
      }
      if (!server) continue;
      const used = new Set([...server.rt.dhcpBindings.map(b => b.ip), ...eps.map(e => e.iface.ip.addr)]);
      const net = network(pool.network, pool.len), bc = broadcast(pool.network, pool.len);
      let ip = null;
      for (let n = net + 1; n < bc; n++) {
        const s = str4(n);
        if (used.has(s) || server.dhcp.excluded.some(x => ip4(x.lo) <= n && n <= ip4(x.hi))) continue;
        ip = s; break;
      }
      if (!ip) continue;
      h.ip = ip; h.len = pool.len; h.gw = pool.router || null; h.dns = pool.dns?.[0] || null;
      h.rt.lease = { server: server.label, pool: pool.name };
      server.rt.dhcpBindings.push({ ip, mac: h.mac, iface: relayIf.name, pool: pool.name, host: h.label });
    }
    function findPool(dev, ifIp) { return Object.values(dev.dhcp.pools).find(p => p.network && inPrefix(ifIp, p.network, p.len)) || null; }
  }
  /* loose reachability test used by DHCP relay: does dev have a route to ip */
  reach(dev, ip) { return !!this.lookup(dev, ip); }

  /* =====================================================================
     LAYER 2: flooding / endpoints
     ===================================================================== */
  /* Flood a frame out of (dev, iface) and return the L3 endpoints that would receive it:
     [{dev, iface, vlan}] — hosts, router ports/subinterfaces, SVIs, routed ports.
     learn: optional {mac} to populate MAC tables along the way. */
  l2Endpoints(dev, iface, learn = null) {
    const startTag = this.egressTag(dev, iface);
    if (startTag === undefined) return [];
    const start = dev.isHost ? this.peer(dev, "Ethernet0") : this.peer(dev, this.physicalFor(dev, iface));
    if (!start) return [];
    const srcIfUp = dev.isHost ? true : (iface.rt.up && (iface.rt.proto !== false));
    if (!srcIfUp) return [];
    return this.l2EndpointsFrom(start.dev, start.dev.isHost ? start.dev.iface() : start.dev.interfaces[start.iface], startTag, learn, new Set(), "origin");
  }
  /* the tag a frame carries when it leaves this L3 interface (undefined = can't send) */
  egressTag(dev, iface) {
    if (dev.isHost) return null;
    if (ifType(iface.name) === "Vlan") return "svi";            // handled by physicalFor
    if (isSub(iface.name)) return iface.encap ? (iface.encap.native ? null : iface.encap.vlan) : undefined;
    return null;
  }
  physicalFor(dev, iface) { return isSub(iface.name) ? parentOf(iface.name) : iface.name; }
  /* endpoints reachable from an L3 interface, handling SVIs (flood into the VLAN from the switch itself) */
  segmentFrom(dev, iface, learn) {
    if (!dev.isHost && ifType(iface.name) === "Vlan") {
      const v = +iface.name.slice(4); const out = []; const seen = new Set();
      if (!iface.rt.up || !iface.rt.proto) return out;
      for (const o of Object.values(dev.interfaces)) {
        if (!o.switchport?.on || !o.rt.up || (ifType(o.name) !== "Port-channel" && o.rt.bundled) || !this.portCarries(o, v) || !this.stpForwarding(o, v)) continue;
        const phys = ifType(o.name) === "Port-channel" ? o.rt.members.find(m => m.rt.bundled)?.name : o.name;
        const p = this.peer(dev, phys); if (!p) continue;
        const tag = o.rt.opMode === "trunk" ? (o.switchport.native === v ? null : v) : null;
        // emulate: frame enters peer with tag
        const sub = this.l2EndpointsFrom(p.dev, p.dev.isHost ? p.dev.iface() : p.dev.interfaces[p.iface], tag, learn, seen, dev.id + ":" + v);
        out.push(...sub);
      }
      return out;
    }
    return this.l2Endpoints(dev, iface, learn);
  }
  l2EndpointsFrom(dev, iface, tag, learn, visited, selfKey) {
    // same BFS as l2Endpoints but with an explicit entry frame
    const out = []; visited.add(selfKey);
    const Q = [{ dev, iface, tag }];
    while (Q.length) {
      const f = Q.shift(); const d = f.dev, i = f.iface;
      if (d.isHost) { if (f.tag === null) out.push({ dev: d, iface: i, vlan: null }); continue; }
      if (!i.rt.up) continue;
      if (!d.isSwitch || !i.switchport?.on) {
        if (f.tag === null) out.push({ dev: d, iface: i, vlan: null });
        for (const s of Object.values(d.interfaces)) if (isSub(s.name) && parentOf(s.name) === i.name && s.rt.up && s.encap) if ((s.encap.native && f.tag === null) || (!s.encap.native && s.encap.vlan === f.tag)) out.push({ dev: d, iface: s, vlan: f.tag });
        continue;
      }
      let port = i; if (i.channelGroup && i.rt.bundled) port = d.interfaces["Port-channel" + i.channelGroup.id];
      if (port.rt.errDisabled) continue;
      let v;
      if (port.rt.opMode === "trunk") { if (f.tag === null) v = port.switchport.native; else { v = f.tag; if (port.switchport.allowed && !port.switchport.allowed.has(v)) continue; } }
      else { if (f.tag === null) v = port.switchport.access; else if (f.tag === port.switchport.voice) v = f.tag; else continue; }
      if (!d.vlans[v] || !this.stpForwarding(port, v)) continue;
      if (port.portsec.on && learn?.mac && port.rt.psecViolation && port.portsec.violation !== "shutdown" && !port.portsec.macs.some(m => m.mac === learn.mac)) continue; // protect/restrict: drop offending frames
      const key = d.id + ":" + v; if (visited.has(key)) continue; visited.add(key);
      if (learn?.mac) this.learnMac(d, v, learn.mac, port.name);
      const svi = d.interfaces["Vlan" + v]; if (svi && svi.rt.up && svi.rt.proto) out.push({ dev: d, iface: svi, vlan: v });
      for (const o of Object.values(d.interfaces)) {
        if (o === port || !o.switchport?.on || !o.rt.up) continue;
        if (ifType(o.name) !== "Port-channel" && o.rt.bundled) continue;
        if (!this.portCarries(o, v) || !this.stpForwarding(o, v)) continue;
        const t2 = o.rt.opMode === "trunk" ? (o.switchport.native === v ? null : v) : null;
        const phys = ifType(o.name) === "Port-channel" ? o.rt.members.find(m => m.rt.bundled)?.name : o.name;
        const p = this.peer(d, phys); if (!p) continue;
        Q.push({ dev: p.dev, iface: p.dev.isHost ? p.dev.iface() : p.dev.interfaces[p.iface], tag: t2 });
      }
    }
    return out;
  }
  learnMac(sw, vlan, mac, port) {
    if (sw.baseMac === mac) return;
    const ex = sw.rt.mac.find(m => m.vlan === vlan && m.mac === mac);
    if (ex) { if (ex.type === "DYNAMIC") ex.port = port; return; }
    sw.rt.mac.push({ vlan, mac, type: "DYNAMIC", port });
  }
  macOf(dev, iface) { return dev.isHost ? dev.mac : (ifType(iface.name) === "Vlan" ? dev.baseMac : (isSub(iface.name) ? dev.interfaces[parentOf(iface.name)].mac : iface.mac)); }

  /* ARP: resolve ip on the segment of (dev, iface). Returns endpoint or null. Populates ARP caches both ways. */
  arp(dev, iface, ip) {
    const myMac = this.macOf(dev, iface);
    const eps = this.segmentFrom(dev, iface, { mac: myMac });
    const hit = eps.find(e => e.dev.isHost ? e.dev.ip === ip : (e.iface.ip?.addr === ip || e.iface.secondary?.some(s => s.addr === ip)));
    if (!hit) return null;
    const theirMac = this.macOf(hit.dev, hit.iface);
    const myIp = dev.isHost ? dev.ip : ifaceIp(iface, ip);
    addArp(dev, ip, theirMac, dev.isHost ? "Ethernet0" : iface.name);
    addArp(hit.dev, myIp, myMac, hit.dev.isHost ? "Ethernet0" : hit.iface.name);
    // reply frame learning: flood back from hit so switches learn their MAC too
    this.segmentFrom(hit.dev, hit.iface, { mac: theirMac });
    return hit;
  }
  hasArp(dev, ip) { return dev.rt.arp.some(a => a.ip === ip); }

  /* =====================================================================
     LAYER 3: forwarding
     ===================================================================== */
  /* Forward packet starting at `dev` (origin or transit). Returns {ok:true, at:dev} when delivered to the
     device owning dst, or {ok:false, code:'.'|'U', why, at}. trace collects hop IPs (ingress addresses). */
  forward(dev, pkt, inIface, trace) {
    let ttl = pkt.ttl; const hops = trace || [];
    let cur = dev, curIn = inIface;
    for (let guard = 0; guard < 64; guard++) {
      pkt.ttl = ttl;
      // ---- host ----
      if (cur.isHost) {
        if (curIn) { if (pkt.dst === cur.ip) return { ok: true, at: cur, hops }; return { ok: false, code: ".", why: "host dropped foreign packet", at: cur }; }
        if (!cur.ip) return { ok: false, code: ".", why: "host has no address", at: cur };
        if (!pkt.src) pkt.src = cur.ip;
        const target = sameSubnet(pkt.dst, cur.ip, cur.len) ? pkt.dst : cur.gw;
        if (!target) return { ok: false, code: ".", why: "no default gateway", at: cur };
        const hadArp = this.hasArp(cur, target);
        const hit = this.arp(cur, cur.iface(), target);
        if (!hit) return { ok: false, code: ".", why: `ARP for ${target} failed`, at: cur, arpMiss: true };
        if (!hadArp) pkt.firstArp = true;
        cur = hit.dev; curIn = hit.iface; continue;
      }
      // ---- IOS device ----
      // inbound: NAT outside→inside (before routing), inbound ACL
      if (curIn) {
        if (curIn.acl.in) { const r = this.aclCheck(cur, curIn.acl.in, pkt); if (!r) return { ok: false, code: "U", why: `denied by inbound ACL ${curIn.acl.in} on ${cur.hostname} ${curIn.name}`, at: cur }; }
        if (curIn.nat === "outside") this.natInbound(cur, pkt);
      }
      // for me?
      if (this.ownsIp(cur, pkt.dst)) { hops.push(pkt.dst); return { ok: true, at: cur, hops }; }
      if (curIn) {
        if (cur.isSwitch && !cur.ipRouting) return { ok: false, code: ".", why: `${cur.hostname} is not routing`, at: cur };
        if (!cur.isL3) return { ok: false, code: ".", why: "not a router", at: cur };
        ttl--; if (ttl <= 0) return { ok: false, code: "T", why: "ttl exceeded", at: cur, ttlAt: ifaceIp(curIn, pkt.src) || cur.allIps()[0]?.ip };
        if (!curIn.rt.up) return { ok: false, code: ".", why: "ingress down", at: cur };
      }
      // route
      const lk = this.lookup(cur, pkt.dst);
      if (!lk) return { ok: false, code: cur === dev ? "." : "U", why: `${cur.hostname}: no route to ${pkt.dst}`, at: cur, noRoute: true };
      const out = cur.interfaces[lk.iface];
      if (!out || !out.rt.up) return { ok: false, code: ".", why: `${cur.hostname}: exit interface ${lk.iface} down`, at: cur };
      if (!pkt.src) pkt.src = ifaceIp(out, pkt.dst) || out.ip?.addr;
      // NAT inside→outside (after routing)
      if (curIn?.nat === "inside" && out.nat === "outside") { const r = this.natOutbound(cur, pkt, out); if (r === false) return { ok: false, code: ".", why: "NAT pool exhausted", at: cur }; }
      else if (!curIn && cur.nat && out.nat === "outside" && cur.nat.static.length === 0 && false) { /* locally originated traffic is not translated */ }
      // outbound ACL (transit only — IOS does not apply outbound ACLs to locally generated packets)
      if (curIn && out.acl.out) { const r = this.aclCheck(cur, out.acl.out, pkt); if (!r) return { ok: false, code: "U", why: `denied by outbound ACL ${out.acl.out} on ${cur.hostname} ${out.name}`, at: cur }; }
      if (curIn) hops.push(ifaceIp(curIn, pkt.src) || cur.allIps()[0]?.ip);
      // L2 resolution
      const nhIp = lk.connected || !lk.via ? pkt.dst : lk.via;
      if (ifType(out.name) === "Loopback") { if (this.ownsIp(cur, pkt.dst)) return { ok: true, at: cur, hops }; return { ok: false, code: ".", why: "loopback black hole", at: cur }; }
      const hadArp = this.hasArp(cur, nhIp);
      const hit = this.arp(cur, out, nhIp);
      if (!hit) return { ok: false, code: ".", why: `${cur.hostname}: ARP for ${nhIp} on ${out.name} failed`, at: cur, arpMiss: true };
      if (!hadArp && !curIn) pkt.firstArp = true;
      cur = hit.dev; curIn = hit.iface;
    }
    return { ok: false, code: ".", why: "loop", at: cur };
  }
  ownsIp(dev, ip) { return !dev.isHost && Object.values(dev.interfaces).some(i => i.rt.up && (i.ip?.addr === ip || i.secondary.some(s => s.addr === ip))); }

  /* ---------- ACL ---------- */
  aclCheck(dev, name, pkt) {
    const acl = dev.acls[name]; if (!acl || !acl.entries.length) return true;
    for (const e of acl.entries) {
      if (matchEntry(acl, e, pkt)) { dev.rt.aclHits[name + "#" + e.seq] = (dev.rt.aclHits[name + "#" + e.seq] || 0) + 1; return e.action === "permit"; }
    }
    return false;
  }

  /* ---------- NAT ---------- */
  natOutbound(dev, pkt, out) {
    const T = dev.rt.nat; const proto = pkt.proto || "icmp"; const port = pkt.id ?? 1;
    const st = dev.nat.static.find(s => s.il === pkt.src && (!s.proto || (s.proto === proto && s.ilPort === port)));
    if (st) { dev.rt.natHits++; pkt.src = st.ig; return true; }
    const ex = T.find(t => t.overload && t.proto === proto && t.il === pkt.src && t.ilPort === port && t.og === pkt.dst);
    if (ex) { dev.rt.natHits++; pkt.src = ex.ig; pkt.id = ex.igPort; return true; }
    const exD = T.find(t => !t.overload && t.il === pkt.src);
    if (exD) { dev.rt.natHits++; pkt.src = exD.ig; return true; }
    for (const rule of dev.nat.dynamic) {
      if (!this.aclCheck(dev, rule.list, { ...pkt, proto: "ip" })) continue;
      dev.rt.natMisses++;
      let ig;
      if (rule.iface) ig = dev.interfaces[rule.iface]?.ip?.addr;
      else if (rule.pool) {
        const pool = dev.nat.pools[rule.pool]; if (!pool) continue;
        if (!rule.overload) {
          const used = new Set(T.filter(t => t.pool === rule.pool).map(t => t.ig));
          const mine = T.find(t => t.pool === rule.pool && t.il === pkt.src);
          if (mine) ig = mine.ig; else { for (let n = ip4(pool.start); n <= ip4(pool.end); n++) if (!used.has(str4(n))) { ig = str4(n); break; } }
          if (!ig) return false;
        } else ig = pool.start;
      }
      if (!ig) continue;
      const igPort = rule.overload ? nextPort(T, ig, proto, port) : port;
      T.push(rule.overload ? { proto, il: pkt.src, ilPort: port, ig, igPort, ol: pkt.dst, og: pkt.dst, pool: rule.pool || null, dynamic: true, overload: true }
        : { proto: null, il: pkt.src, ig, pool: rule.pool || null, dynamic: true, overload: false });
      pkt.src = ig; pkt.id = igPort; return true;
    }
    return null;
  }
  natInbound(dev, pkt) {
    const proto = pkt.proto || "icmp"; const port = pkt.id ?? 1;
    const st = dev.nat.static.find(s => s.ig === pkt.dst && (!s.proto || (s.proto === proto && s.igPort === port)));
    if (st) { dev.rt.natHits++; pkt.dst = st.il; if (st.proto) pkt.id = st.ilPort; return; }
    const t = dev.rt.nat.find(t => t.dynamic && t.ig === pkt.dst && (!t.overload || (t.proto === proto && t.igPort === port)));
    if (t) { dev.rt.natHits++; pkt.dst = t.il; pkt.id = t.ilPort; }
  }

  /* =====================================================================
     PING / TRACEROUTE
     ===================================================================== */
  ping(from, dst, opts = {}) {
    if (!this.converged) this.converge();
    const src = typeof from === "string" ? this.get(from) : from;
    const count = opts.count || 5; const marks = []; let replyPath = null;
    const sourceIp = opts.source ? (src.interfaces?.[opts.source]?.ip?.addr || (isIPv4(opts.source) ? opts.source : null)) : null;
    let detail = null;
    for (let n = 0; n < count; n++) {
      this.pingSeq++;
      const pkt = { src: sourceIp, dst, ttl: 255, proto: "icmp", id: this.pingSeq };
      const r = this.forward(src, pkt, null, []);
      if (!r.ok) { marks.push(r.code === "U" ? "U" : "."); detail ||= r.why; continue; }
      // reply
      const rep = { src: pkt.dst, dst: pkt.src, ttl: 255, proto: "icmp", id: pkt.id };
      const back = this.forward(r.at, rep, null, []);
      const arpDrop = pkt.firstArp && n === 0 && !opts.noArpDrop && !src.isHost;   // IOS loses the first echo while it ARPs
      if (back.ok && (back.at === src)) { marks.push(arpDrop ? "." : "!"); if (arpDrop) detail ||= "first echo lost to ARP resolution"; }
      else { marks.push("."); detail ||= "reply: " + back.why; }
      replyPath = back;
    }
    const got = marks.filter(m => m === "!").length;
    return { sent: count, received: got, marks: marks.join(""), pct: Math.round(got / count * 100), why: detail, text: pingText(dst, marks, got, count, opts) };
  }
  traceroute(from, dst, opts = {}) {
    if (!this.converged) this.converge();
    const src = typeof from === "string" ? this.get(from) : from;
    const lines = []; let done = false; const hops = [];
    for (let ttl = 1; ttl <= (opts.maxHops || 30) && !done; ttl++) {
      const pkt = { src: null, dst, ttl, proto: "udp", id: 33434 + ttl };
      const r = this.forward(src, pkt, null, []);
      if (r.ok) { hops.push(dst); lines.push(`  ${ttl} ${dst} 1 msec 1 msec 2 msec`); done = true; }
      else if (r.code === "T") { hops.push(r.ttlAt); lines.push(`  ${ttl} ${r.ttlAt} 1 msec 0 msec 1 msec`); }
      else if (r.code === "U" && r.at !== src) { const ip = r.at.allIps()[0]?.ip; hops.push(ip); lines.push(`  ${ttl} ${ip} !A  !A  !A`); done = true; }
      else { hops.push(null); lines.push(`  ${ttl}  *  *  *`); if (hops.filter(h => h === null).length >= (opts.starLimit || 3)) done = true; }
    }
    return { hops, text: `Type escape sequence to abort.\nTracing the route to ${dst}\nVRF info: (vrf in name/id, vrf out name/id)\n${lines.join("\n")}` };
  }
  /* IPv6 ping: connected prefixes + static routes, ND over the same L2 segments */
  ping6(from, dstStr, opts = {}) {
    if (!this.converged) this.converge();
    const src = typeof from === "string" ? this.get(from) : from; const count = opts.count || 5;
    let g; try { g = parse6(dstStr); } catch { return { sent: count, received: 0, marks: ".....", pct: 0, text: "% Unrecognized host or address, or protocol not running." }; }
    const r = this.forward6(src, g, null, 0);
    const marks = r.ok ? "!".repeat(count) : ".".repeat(count);
    return { sent: count, received: r.ok ? count : 0, marks, pct: r.ok ? 100 : 0, why: r.why, text: pingText(fmt6(g).toUpperCase(), [...marks], r.ok ? count : 0, count, opts) };
  }
  forward6(dev, g, inIface, depth) {
    let cur = dev, curIn = inIface;
    for (let guard = 0; guard < 32; guard++) {
      if (cur.isHost) { if (curIn) return cur.ipv6 && eq6(parse6(cur.ipv6), g) ? { ok: true, at: cur } : { ok: false, why: "not for host" }; return { ok: false, why: "host v6 origin unsupported" }; }
      if (Object.values(cur.interfaces).some(i => i.rt.up && (i.rt.v6?.some(a => eq6(a.g, g)) || (i.rt.ll6 && eq6(i.rt.ll6, g))))) return { ok: true, at: cur };
      if (curIn && !cur.ipv6Routing) return { ok: false, why: `${cur.hostname}: ipv6 unicast-routing not enabled` };
      if (curIn && curIn.acl6.in && !this.acl6Check(cur, curIn.acl6.in, g)) return { ok: false, why: "ipv6 acl" };
      let out, nh;
      if (isLinkLocal6(g)) { out = curIn || Object.values(cur.interfaces).find(i => i.rt.up && i.rt.ll6); nh = g; }
      else { const r = this.lookup6(cur, g); if (!r) return { ok: false, why: `${cur.hostname}: no ipv6 route` }; out = cur.interfaces[r.iface]; nh = r.code === "C" ? g : (r.via ? parse6(r.via) : g); }
      if (!out?.rt.up) return { ok: false, why: "exit down" };
      const eps = this.segmentFrom(cur, out);
      const hit = eps.find(e => e.dev.isHost ? (e.dev.ipv6 && eq6(parse6(e.dev.ipv6), nh)) : (e.iface.rt.v6?.some(a => eq6(a.g, nh)) || (e.iface.rt.ll6 && eq6(e.iface.rt.ll6, nh))));
      if (!hit) return { ok: false, why: `${cur.hostname}: neighbor discovery for ${fmt6(nh)} failed on ${out.name}` };
      cur = hit.dev; curIn = hit.iface;
    }
    return { ok: false, why: "loop" };
  }
  acl6Check() { return true; }
}

/* ---------- helpers ---------- */
function fmtMacHex(n) { const h = n.toString(16).padStart(12, "0"); return h.slice(0, 4) + "." + h.slice(4, 8) + "." + h.slice(8, 12); }
function compatible(a, b) {
  const lacp = { active: ["active", "passive"], passive: ["active"] }, pagp = { desirable: ["desirable", "auto"], auto: ["desirable"] };
  if (a === "on" || b === "on") return a === "on" && b === "on";
  if (lacp[a]) return (lacp[a] || []).includes(b);
  if (pagp[a]) return (pagp[a] || []).includes(b);
  return false;
}
function portNum(name) { const p = parseIfName(name); const parts = p.num.split("/").map(Number); return parts[parts.length - 1] + (p.type === "GigabitEthernet" && parts.length > 1 && parts[0] === 0 && name.startsWith("Gig") ? 24 : 0); }
export function stpCost(i) {
  if (i.stp?.cost) return i.stp.cost;
  let bw = ifSpeedMbps(i.name);
  if (ifType(i.name) === "Port-channel") { const m = (i.rt.members || []).filter(x => x.rt.bundled); bw = m.length ? ifSpeedMbps(m[0].name) * m.length : 1000; }
  return bw >= 10000 ? 2 : bw >= 2000 ? 3 : bw >= 1000 ? 4 : bw >= 200 ? 12 : bw >= 100 ? 19 : 100;
}
function matchEntry(acl, e, pkt) {
  const proto = pkt.proto || "icmp";
  if (!wildcardMatch(pkt.src, e.src, e.srcWild)) return false;
  if (acl.type === "standard") return true;
  if (e.proto !== "ip" && e.proto !== proto) return false;
  if (!wildcardMatch(pkt.dst, e.dst, e.dstWild)) return false;
  if (e.dstPort && (proto === "tcp" || proto === "udp")) { const p = pkt.dport ?? 0; const { op, a, b } = e.dstPort; if (op === "eq" && p !== a) return false; if (op === "gt" && !(p > a)) return false; if (op === "lt" && !(p < a)) return false; if (op === "neq" && p === a) return false; if (op === "range" && !(p >= a && p <= b)) return false; }
  if (e.srcPort && (proto === "tcp" || proto === "udp")) { const p = pkt.sport ?? 0; const { op, a, b } = e.srcPort; if (op === "eq" && p !== a) return false; if (op === "gt" && !(p > a)) return false; if (op === "lt" && !(p < a)) return false; if (op === "range" && !(p >= a && p <= b)) return false; }
  return true;
}
function nextPort(T, ig, proto, want) {
  let p = want; const used = new Set(T.filter(t => t.ig === ig && t.proto === proto).map(t => t.igPort));
  while (used.has(p)) p++; return p;
}
function addArp(dev, ip, mac, iface) {
  const ex = dev.rt.arp.find(a => a.ip === ip); if (ex) { ex.mac = mac; ex.iface = iface; return; }
  dev.rt.arp.push({ ip, mac, iface, age: 0 });
}
function ifaceIp(iface, towards) {
  if (!iface || !iface.ip) return null;
  if (towards && !sameSubnet(towards, iface.ip.addr, iface.ip.len)) { const s = iface.secondary.find(s => sameSubnet(towards, s.addr, s.len)); if (s) return s.addr; }
  return iface.ip.addr;
}
export function cmpIp(a, b) { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }
function cmpIpDesc(a, b) { return cmpIp(b || "0.0.0.0", a || "0.0.0.0"); }
function pingText(dst, marks, got, count, opts) {
  const head = opts.source ? `Packet sent with a source address of ${opts.sourceIp || opts.source}\n` : "";
  return `Type escape sequence to abort.\nSending ${count}, 100-byte ICMP Echos to ${dst}, timeout is 2 seconds:\n${head}${marks.join("")}\nSuccess rate is ${Math.round(got / count * 100)} percent (${got}/${count})` + (got ? `, round-trip min/avg/max = 1/${got > 1 ? 2 : 1}/4 ms` : "");
}
