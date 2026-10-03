/* Cert Gauntlet — IOS simulator: device model.
   A Device holds CONFIGURATION (what the student typed) plus a `rt` bag of RUNTIME state that
   Topology.converge() recomputes from the whole topology (link status, ARP, MAC table, STP, OSPF,
   EtherChannel bundles, CDP/LLDP neighbors, NAT translations, DHCP bindings).
   Nothing here renders text — see show.js / config.js. */
import { fmtMac } from "./net.js";

let devSeq = 0;

/* ---------- interface naming ---------- */
const TYPES = [
  ["GigabitEthernet", "Gi", /^(g|gi|gig|giga|gigabit|gigabitethernet)$/i],
  ["FastEthernet", "Fa", /^(f|fa|fas|fast|fastethernet)$/i],
  ["TenGigabitEthernet", "Te", /^(te|ten|tengig|tengigabitethernet)$/i],
  ["Serial", "Se", /^(s|se|ser|serial)$/i],
  ["Loopback", "Lo", /^(l|lo|loop|loopback)$/i],
  ["Vlan", "Vl", /^(v|vl|vlan)$/i],
  ["Port-channel", "Po", /^(p|po|port|port-channel|portchannel)$/i],
  ["Ethernet", "Et", /^(e|et|eth|ethernet)$/i],
];
/* "g0/1" | "gi 0/1" | "GigabitEthernet0/1.10" | "vlan 10" -> {name:"GigabitEthernet0/1.10", type, short, num} or null */
export function parseIfName(a, b) {
  let s = (a || "").trim(); if (b !== undefined && /^[a-z-]+$/i.test(s)) s = s + b.trim();
  const m = s.match(/^([a-z-]+)\s*(\d+(?:\/\d+)*(?:\.\d+)?)$/i); if (!m) return null;
  const t = TYPES.find(t => t[2].test(m[1])); if (!t) return null;
  return { name: t[0] + m[2], type: t[0], short: t[1] + m[2], num: m[2] };
}
export function shortIf(name) { const p = parseIfName(name); return p ? p.short : name; }
/* "Gig 0/1" style used by show cdp neighbors */
export function cdpIf(name) { const p = parseIfName(name); if (!p) return name; const abbr = { GigabitEthernet: "Gig", FastEthernet: "Fas", Serial: "Ser", TenGigabitEthernet: "Ten", Loopback: "Loo", Vlan: "Vla", "Port-channel": "Por", Ethernet: "Eth" }[p.type]; return abbr + " " + p.num; }
export function ifType(name) { const p = parseIfName(name); return p ? p.type : ""; }
export function ifSpeedMbps(name) { const t = ifType(name); return t === "FastEthernet" ? 100 : t === "GigabitEthernet" ? 1000 : t === "TenGigabitEthernet" ? 10000 : t === "Serial" ? 1.544 : t === "Loopback" ? 8000 : 1000; }
export function isPhysical(name) { const t = ifType(name); return (t === "GigabitEthernet" || t === "FastEthernet" || t === "TenGigabitEthernet" || t === "Serial" || t === "Ethernet") && !name.includes("."); }
export function isSub(name) { return name.includes("."); }
export function parentOf(name) { return name.split(".")[0]; }
/* sort order like IOS: by type then numeric parts */
export function ifSort(a, b) {
  const order = ["Ethernet", "FastEthernet", "GigabitEthernet", "TenGigabitEthernet", "Serial", "Port-channel", "Loopback", "Vlan"];
  const pa = parseIfName(a), pb = parseIfName(b);
  const ta = order.indexOf(pa.type), tb = order.indexOf(pb.type); if (ta !== tb) return ta - tb;
  const na = pa.num.split(/[\/.]/).map(Number), nb = pb.num.split(/[\/.]/).map(Number);
  for (let i = 0; i < Math.max(na.length, nb.length); i++) { const d = (na[i] ?? -1) - (nb[i] ?? -1); if (d) return d; }
  return 0;
}

/* ---------- defaults ---------- */
export function newInterface(dev, name) {
  const t = ifType(name);
  const sw = dev.isSwitch && (t === "GigabitEthernet" || t === "FastEthernet" || t === "TenGigabitEthernet" || t === "Port-channel") && !isSub(name);
  const iface = {
    name, desc: "",
    shutdown: dev.isSwitch ? (t === "Vlan" && name === "Vlan1") : (t !== "Loopback" && t !== "Vlan" && t !== "Port-channel" && !isSub(name)),
    ip: null, secondary: [], ipv6: [], ipv6LinkLocal: null, ipv6Enable: false,
    speed: "auto", duplex: "auto", mac: null, encap: null, // encap: {vlan, native} for subinterfaces
    switchport: sw ? { on: true, mode: "dynamic auto", access: 1, voice: null, native: 1, allowed: null /* null = all */, nonegotiate: false } : null,
    stp: { portfast: false, bpduguard: false, cost: null, priority: null },
    portsec: { on: false, max: 1, sticky: false, violation: "shutdown", macs: [] },
    channelGroup: null, // {id, mode}
    acl: { in: null, out: null }, acl6: { in: null, out: null }, nat: null, helper: [], ospf: null, // ospf: {pid, area} via `ip ospf X area Y`
    ospfCost: null, ospfPriority: 1, ospfNetwork: null, ipv6Ospf: null, clockRate: null, bandwidth: null, mtu: 1500,
    rt: {},
  };
  iface.mac = dev.nextMac();
  return iface;
}

export class Device {
  constructor(name, opts = {}) {
    this.id = ++devSeq;
    this.model = opts.type || "router";                 // "router" | "switch" | "l3switch"
    this.isSwitch = this.model !== "router";
    this.isL3 = this.model !== "switch";
    this.hostname = opts.hostname || (this.isSwitch ? "Switch" : "Router");
    this.label = name;                                   // topology label (stable even if hostname changes)
    this.platform = opts.platform || (this.model === "router" ? "ISR4321" : this.model === "l3switch" ? "WS-C3650" : "WS-C2960");
    this.macBase = opts.macBase || (0x000142000000 + this.id * 0x100);
    this.macSeq = 0;
    this.baseMac = this.nextMac();
    this.interfaces = {};
    const ports = opts.ports || (this.model === "router" ? ["GigabitEthernet0/0", "GigabitEthernet0/1", "GigabitEthernet0/2", "Serial0/1/0", "Serial0/1/1"]
      : this.model === "l3switch" ? [...Array.from({ length: 24 }, (_, i) => `GigabitEthernet1/0/${i + 1}`)]
        : [...Array.from({ length: 24 }, (_, i) => `FastEthernet0/${i + 1}`), "GigabitEthernet0/1", "GigabitEthernet0/2"]);
    for (const p of ports) this.interfaces[p] = newInterface(this, p);
    if (this.isSwitch) this.interfaces.Vlan1 = newInterface(this, "Vlan1");
    // global config
    this.enableSecret = null; this.enablePassword = null; this.servicePwEnc = false; this.banner = null;
    this.users = {};                                     // name -> {secret?|password?, priv}
    this.domainName = null; this.domainLookup = true; this.rsaBits = 0; this.sshVersion = null;
    this.lines = { "con 0": { password: null, login: "none", transport: null, execTimeout: null, logSync: false }, "vty 0 4": { password: null, login: "none", transport: ["telnet", "ssh"], execTimeout: null, logSync: false } };
    this.vlans = this.isSwitch ? { 1: { name: "default" }, 1002: { name: "fddi-default" }, 1003: { name: "token-ring-default" }, 1004: { name: "fddinet-default" }, 1005: { name: "trnet-default" } } : {};
    this.routes = [];                                    // {prefix, mask(len), nh?, iface?, ad}
    this.routes6 = [];                                   // {prefix(groups), len, nh?, iface?, ad}
    this.ospf = null;                                    // {pid, routerId, networks:[{addr,wild,area}], passive:Set, passiveDefault, defOrig:{on,always}, refBw}
    this.acls = {};                                      // name|number -> {name, type:'standard'|'extended', numbered, entries:[]}
    this.acls6 = {};
    this.nat = { static: [], dynamic: [], pools: {} };   // static:[{il, ig, proto?, ilPort?, igPort?}] dynamic:[{list, iface?|pool?, overload}]
    this.dhcp = { pools: {}, excluded: [] };             // pools: name->{network,len,router,dns:[],domain, lease}
    this.ntp = []; this.cdp = true; this.lldp = false; this.ipRouting = this.model === "router"; this.ipv6Routing = false;
    this.defaultGateway = null; this.stpMode = "pvst"; this.stpPriority = {}; this.stpPortfastDefault = false; this.stpBpduguardDefault = false;
    this.httpServer = false; this.loggingConsole = true; this.startup = null; this.timeSource = null;
    this.rt = { arp: [], mac: [], nat: [], dhcpBindings: [], aclHits: {}, natHits: 0, natMisses: 0, uptime: 0 };
  }
  nextMac() { return fmtMac((this.macBase + (this.macSeq++)).toString(16).padStart(12, "0")); }
  iface(name) { return this.interfaces[name] || null; }
  ensureIface(name) {
    if (!this.interfaces[name]) this.interfaces[name] = newInterface(this, name);
    return this.interfaces[name];
  }
  ifaces() { return Object.keys(this.interfaces).sort(ifSort).map(n => this.interfaces[n]); }
  /* may the student create this interface? */
  creatable(name) {
    const t = ifType(name);
    if (t === "Loopback") return true;
    if (t === "Vlan") return this.isSwitch;
    if (t === "Port-channel") return this.isSwitch;
    if (isSub(name)) return !!this.interfaces[parentOf(name)] && (!this.isSwitch || !this.interfaces[parentOf(name)].switchport?.on);
    return false;
  }
  allIps() {                                           // [{ip, len, iface}] of configured addresses
    const out = [];
    for (const i of this.ifaces()) { if (i.ip) out.push({ ip: i.ip.addr, len: i.ip.len, iface: i.name }); for (const s of i.secondary) out.push({ ip: s.addr, len: s.len, iface: i.name }); }
    return out;
  }
  hasIp(ip) { return this.allIps().some(x => x.ip === ip); }
  routerId() {
    if (this.ospf?.routerId) return this.ospf.routerId;
    const up = this.ifaces().filter(i => i.ip && i.rt.up);
    const lo = up.filter(i => ifType(i.name) === "Loopback").map(i => i.ip.addr);
    const pick = arr => arr.sort((a, b) => cmpIp(b, a))[0];
    if (lo.length) return pick(lo);
    const rest = up.map(i => i.ip.addr); if (rest.length) return pick(rest);
    return null;
  }
  snapshot() { return JSON.parse(JSON.stringify(this, (k, v) => (k === "rt" || k === "topo") ? undefined : v instanceof Set ? [...v] : v)); }
}
function cmpIp(a, b) { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }

/* ---------- hosts (PCs / servers) ---------- */
export class Host {
  constructor(name, opts = {}) {
    this.id = ++devSeq; this.model = "host"; this.isSwitch = false; this.isL3 = false; this.isHost = true;
    this.hostname = name; this.label = name;
    this.mac = opts.mac || fmtMac((0x00e04c000000 + this.id * 0x100 + 1).toString(16).padStart(12, "0"));
    this.dhcp = !!opts.dhcp;
    this.ip = opts.ip || null; this.len = opts.len ?? (opts.mask ? maskLenSafe(opts.mask) : 24); this.gw = opts.gw || null; this.dns = opts.dns || null;
    this.ipv6 = opts.ipv6 || null; this.len6 = opts.len6 || 64; this.gw6 = opts.gw6 || null;
    this.vlan = null;   // tagging never; hosts send untagged
    this.interfaces = { Ethernet0: { name: "Ethernet0", mac: this.mac, shutdown: false, rt: {} } };
    this.rt = { arp: [], lease: null };
  }
  iface() { return this.interfaces.Ethernet0; }
}
function maskLenSafe(m) { const b = m.split(".").map(Number).map(x => x.toString(2).padStart(8, "0")).join(""); const i = b.indexOf("0"); return i === -1 ? 32 : i; }
