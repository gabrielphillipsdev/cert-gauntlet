/* Cert Gauntlet — IOS simulator: command tree + CLI session.

   Command tree: one root per mode. Nodes are keywords or typed parameters. A syntax string defines a path:
     def(["config"], "ip route A.B.C.D A.B.C.D (A.B.C.D|IFNAME) [<1-255>]", handler, {no: true})
   Tokens: lowercase = keyword · UPPER / <a-b> / A.B.C.D / X:X:X:X::X / H.H.H / IFNAME / LINE = parameter.
   (a|b) alternatives and [x] optionals expand into several paths that share the handler.

   Parsing mimics IOS: unique-prefix abbreviation, exact match wins, "% Ambiguous command", "% Incomplete command",
   "% Invalid input detected at '^' marker" with the caret under the offending token, "?" help, Tab completion,
   `no` / `default` prefixes in config modes, `do` in config modes. */

export const MODES = {
  user: { prompt: ">", parent: null },
  priv: { prompt: "#", parent: "user" },
  config: { prompt: "(config)#", parent: "priv" },
  "config-if": { prompt: "(config-if)#", parent: "config" },
  "config-subif": { prompt: "(config-subif)#", parent: "config" },
  "config-if-range": { prompt: "(config-if-range)#", parent: "config" },
  "config-line": { prompt: "(config-line)#", parent: "config" },
  "config-router": { prompt: "(config-router)#", parent: "config" },
  "config-vlan": { prompt: "(config-vlan)#", parent: "config" },
  "config-std-nacl": { prompt: "(config-std-nacl)#", parent: "config" },
  "config-ext-nacl": { prompt: "(config-ext-nacl)#", parent: "config" },
  "config-dhcp": { prompt: "(dhcp-config)#", parent: "config" },
};
const CONFIG_MODES = Object.keys(MODES).filter(m => m.startsWith("config"));

/* ---------------- parameter types ---------------- */
import { isIPv4, isMask, isIPv6, isMac } from "./net.js";
import { parseIfName } from "./device.js";

const PARAM = {
  "A.B.C.D": { test: isIPv4, help: "A.B.C.D" },
  "MASK": { test: isMask, help: "A.B.C.D" },
  "X:X:X:X::X": { test: s => isIPv6(s) && !s.includes("/"), help: "X:X:X:X::X" },
  "X:X:X:X::X/<0-128>": { test: s => /\/\d{1,3}$/.test(s) && isIPv6(s) && +s.split("/")[1] <= 128, help: "X:X:X:X::X/<0-128>" },
  "H.H.H": { test: isMac, help: "H.H.H" },
  "WORD": { test: s => s.length > 0, help: "WORD" },
  "LINE": { test: s => true, help: "LINE", rest: true },
  "IFNAME": { test: s => !!parseIfName(s), help: "", iface: true },
  "RANGE": { test: s => /^[a-z-]+\s*[\d\/.]+(\s*-\s*\d+)?(\s*,\s*[a-z-]*[\d\/.]+(\s*-\s*\d+)?)*$/i.test(s), help: "", rest: true },
};
function paramFor(tok) {
  if (PARAM[tok]) return { type: tok, ...PARAM[tok] };
  const m = tok.match(/^<(-?\d+)-(\d+)>$/);
  if (m) { const lo = +m[1], hi = +m[2]; return { type: tok, test: s => /^-?\d+$/.test(s) && +s >= lo && +s <= hi, help: tok }; }
  return null;
}
const isParamTok = t => /^[A-Z]/.test(t) || t.startsWith("<");

/* ---------------- tree ---------------- */
export class CommandTree {
  constructor() { this.roots = {}; for (const m of Object.keys(MODES)) this.roots[m] = mkNode(); }
  /* def(modes, syntax, handler, opts) — opts: {no: true|"alt syntax"|[syntaxes], desc:{kw: text}, noOnly} */
  def(modes, syntax, handler, opts = {}) {
    const list = Array.isArray(modes) ? modes : modes === "config*" ? CONFIG_MODES : modes === "exec" ? ["user", "priv"] : [modes];
    for (const mode of list) {
      for (const path of expand(syntax)) {
        if (!opts.noOnly) this.insert(this.roots[mode], path, handler, false, opts);
        else this.insert(this.roots[mode], path, handler, true, opts);
        if (opts.no && mode.startsWith("config")) {
          const noForms = opts.no === true ? [path] : (Array.isArray(opts.no) ? opts.no : [opts.no]).flatMap(expand);
          for (const nf of noForms) { this.insert(child(this.roots[mode], "no"), nf, handler, true, opts); this.insert(child(this.roots[mode], "default"), nf, handler, true, opts); }
        }
      }
    }
    return this;
  }
  insert(root, path, handler, neg, opts) {
    let node = root;
    for (const tok of path) {
      if (isParamTok(tok)) {
        const p = paramFor(tok); if (!p) throw new Error("bad param " + tok);
        let pn = node.params.find(x => x.type === tok);
        if (!pn) { pn = mkNode(); pn.param = p; pn.type = tok; node.params.push(pn); }
        node = pn;
      } else node = child(node, tok);
      if (opts.desc?.[tok]) node.desc = opts.desc[tok];
    }
    node.handler = handler; node.neg = neg; node.terminal = true;
  }
  /* parse tokens in mode → {ok, handler, args, p, neg} | {error, col} */
  parse(mode, tokens, rawLine) {
    const root = this.roots[mode]; const positions = tokenPositions(rawLine, tokens);
    const res = walk(root, tokens, 0, [], [], positions, rawLine);
    if (res.ok && res.neg) res.args = res.args.slice(1);
    return res;
  }
  /* completion candidates for the partial last token */
  options(mode, tokens, partial) {
    const root = this.roots[mode];
    const nodes = reach(root, tokens, 0);
    const out = [];
    for (const n of nodes) {
      const isShow = tokens[0] && "show".startsWith(tokens[0].toLowerCase()) && tokens[0].length >= 2;
      for (const [kw, c] of Object.entries(n.children)) if (kw.startsWith(partial.toLowerCase())) out.push({ kw, desc: c.desc || (isShow && SHOW_DESC[kw]) || DESC[kw] || "" });
      if (!partial) { for (const p of n.params) out.push({ kw: p.param.help || p.type, desc: p.desc || PDESC[p.type] || "", param: true }); if (n.terminal) out.push({ kw: "<cr>", desc: "" }); }
    }
    const seen = new Set(); return out.filter(o => !seen.has(o.kw) && seen.add(o.kw)).sort((a, b) => a.kw === "<cr>" ? 1 : b.kw === "<cr>" ? -1 : a.kw.localeCompare(b.kw));
  }
}
function mkNode() { return { children: {}, params: [], handler: null, terminal: false, desc: "" }; }
function child(node, kw) { return node.children[kw] ||= mkNode(); }
function expand(syntax) {
  // returns array of token arrays
  const toks = syntax.trim().split(/\s+/);
  let paths = [[]];
  for (const t of toks) {
    let opt = false, body = t;
    if (body.startsWith("[") && body.endsWith("]")) { opt = true; body = body.slice(1, -1); }
    const alts = body.startsWith("(") && body.endsWith(")") ? body.slice(1, -1).split("|") : [body];
    const next = [];
    for (const p of paths) { if (opt) next.push(p); for (const a of alts) next.push([...p, a]); }
    paths = next;
  }
  return paths;
}
function tokenPositions(line, tokens) {
  const pos = []; let i = 0;
  for (const t of tokens) { const k = line.indexOf(t, i); pos.push(k < 0 ? i : k); i = (k < 0 ? i : k) + t.length; }
  return pos;
}
/* depth-first match with backtracking; returns success or the deepest error */
function walk(node, tokens, idx, args, p, positions, raw) {
  if (idx >= tokens.length) {
    if (node.terminal) return { ok: true, handler: node.handler, args, p, neg: !!node.neg };
    return { error: "% Incomplete command.", col: null, depth: idx };
  }
  const tok = tokens[idx]; const low = tok.toLowerCase();
  const cands = [];
  if (node.children[low]) cands.push({ node: node.children[low], kw: low });
  else {
    const m = Object.keys(node.children).filter(k => k.startsWith(low));
    if (m.length === 1) cands.push({ node: node.children[m[0]], kw: m[0] });
    else if (m.length > 1 && !node.params.length) return { error: `% Ambiguous command:  "${raw}"`, col: null, depth: idx, ambiguous: true };
    else if (m.length > 1) return { error: `% Ambiguous command:  "${raw}"`, col: null, depth: idx, ambiguous: true };
  }
  for (const pn of node.params) {
    if (pn.param.rest) { const rest = tokens.slice(idx).join(" "); if (pn.param.test(rest)) cands.push({ node: pn, value: rawRest(raw, positions[idx]), rest: true }); continue; }
    if (pn.param.iface) {
      const two = tokens[idx + 1] !== undefined && /^[a-z-]+$/i.test(tok) ? tok + tokens[idx + 1] : null;
      if (two && parseIfName(two)) cands.push({ node: pn, value: parseIfName(two).name, consume: 2 });
      if (parseIfName(tok)) cands.push({ node: pn, value: parseIfName(tok).name, consume: 1 });
      continue;
    }
    if (pn.param.test(tok)) cands.push({ node: pn, value: tok });
  }
  if (!cands.length) return { error: "% Invalid input detected at '^' marker.", col: positions[idx], depth: idx };
  let best = null;
  for (const c of cands) {
    const r = c.kw !== undefined ? walk(c.node, tokens, idx + 1, [...args, c.kw], p, positions, raw)
      : c.rest ? walk(c.node, tokens, tokens.length, [...args, c.value], [...p, c.value], positions, raw)
        : walk(c.node, tokens, idx + (c.consume || 1), [...args, c.value], [...p, c.value], positions, raw);
    if (r.ok) return r;
    if (!best || r.depth > best.depth) best = r;
  }
  return best;
}
function rawRest(raw, from) { return raw.slice(from).trim(); }
function reach(node, tokens, idx) {
  if (idx >= tokens.length) return [node];
  const tok = tokens[idx].toLowerCase(); const out = [];
  const kws = node.children[tok] ? [tok] : Object.keys(node.children).filter(k => k.startsWith(tok));
  if (kws.length === 1) out.push(...reach(node.children[kws[0]], tokens, idx + 1));
  for (const pn of node.params) {
    if (pn.param.rest) continue;
    if (pn.param.iface) { if (parseIfName(tokens[idx])) out.push(...reach(pn, tokens, idx + 1)); const two = tokens[idx + 1] && /^[a-z-]+$/i.test(tokens[idx]) ? tokens[idx] + tokens[idx + 1] : null; if (two && parseIfName(two)) out.push(...reach(pn, tokens, idx + 2)); continue; }
    if (pn.param.test(tokens[idx])) out.push(...reach(pn, tokens, idx + 1));
  }
  return out;
}

/* ---------------- help text ---------------- */
export const DESC = {
  show: "Show running system information", configure: "Enter configuration mode", enable: "Turn on privileged commands", disable: "Turn off privileged commands",
  exit: "Exit from the EXEC", end: "Exit from configure mode", ping: "Send echo messages", traceroute: "Trace route to destination", copy: "Copy from one file to another",
  write: "Write running configuration to memory, network, or terminal", reload: "Halt and perform a cold restart", clear: "Reset functions", no: "Negate a command or set its defaults",
  default: "Set a command to its defaults", do: "To run exec commands in config mode", hostname: "Set system's network name", interface: "Select an interface to configure",
  ip: "Global IP configuration subcommands", ipv6: "Global IPv6 configuration commands", line: "Configure a terminal line", router: "Enable a routing process", vlan: "Vlan commands",
  banner: "Define a login banner", service: "Modify use of network based services", username: "Establish User Name Authentication", crypto: "Encryption module",
  "access-list": "Add an access list entry", "spanning-tree": "Spanning Tree Subsystem", cdp: "Global CDP configuration subcommands", lldp: "Global LLDP configuration subcommands",
  ntp: "Configure NTP", "running-config": "Current operating configuration", "startup-config": "Contents of startup configuration", brief: "Brief summary of IP status and configuration",
  route: "IP routing table", interfaces: "Interface status and configuration", arp: "ARP table", version: "System hardware and software status", "mac": "MAC configuration",
  "address-table": "MAC forwarding table", "port-security": "Show secure port information", etherchannel: "EtherChannel information", summary: "One-line summary per channel-group",
  neighbors: "CDP neighbor entries", detail: "Show detailed information", ospf: "OSPF information", neighbor: "Neighbor list", database: "Database summary", "access-lists": "List access lists",
  nat: "IP NAT information", translations: "Translation entries", statistics: "Translation statistics", dhcp: "Show items in the DHCP database", binding: "DHCP address bindings",
  trunk: "Show interface trunk information", switchport: "Show interface switchport information", address: "Set the IP address of an interface", shutdown: "Shutdown the selected interface",
  description: "Interface specific description", speed: "Configure speed operation.", duplex: "Configure duplex operation.", encapsulation: "Set encapsulation type for an interface",
  "channel-group": "Etherchannel/port bundling configuration", secret: "Assign the privileged level secret", password: "Assign the privileged level password", motd: "Set Message of the Day banner",
  login: "Enable password checking", local: "Local password checking", transport: "Define transport protocols for line", input: "Define which protocols to use when connecting to the terminal server",
  ssh: "TCP/IP SSH protocol", telnet: "TCP/IP Telnet protocol", none: "No protocols", all: "All protocols", "domain-name": "Define the default domain name", key: "Long term key operations",
  generate: "Generate new keys", rsa: "Generate a new RSA key", modulus: "Provide number of modulus bits on the command line", mode: "Set trunking mode of the interface", access: "Set trunking mode to ACCESS unconditionally",
  dynamic: "Set trunking mode to dynamically negotiate access or trunk mode", native: "Set trunking native characteristics when interface is in trunking mode", allowed: "Set allowed VLAN characteristics when interface is in trunking mode",
  voice: "Voice appliance attributes", nonegotiate: "Device will not engage in negotiation protocol on this interface", portfast: "Enable an interface to move directly to forwarding on link up",
  bpduguard: "Don't accept BPDUs on this interface", priority: "Set the bridge priority for the spanning tree", maximum: "Max secure addresses", sticky: "Configure dynamic secure addresses as sticky",
  violation: "Security violation mode", protect: "Security violation protect mode", restrict: "Security violation restrict mode", network: "Enable routing on an IP network", "passive-interface": "Suppress routing updates on an interface",
  "router-id": "router-id for this OSPF process", "default-information": "Control distribution of default information", originate: "Distribute a default route", always: "Always advertise default route",
  standard: "Standard Access List", extended: "Extended Access List", permit: "Specify packets to forward", deny: "Specify packets to reject", any: "Any source host", host: "A single source host",
  inside: "Inside address translation", outside: "Outside address translation", source: "Source address translation", static: "Specify static local->global mapping", list: "Specify access list describing local addresses",
  overload: "Overload an address translation", pool: "Name pool of global addresses", "excluded-address": "Prevent DHCP from assigning certain addresses", "default-router": "Default routers", "dns-server": "DNS servers",
  "helper-address": "Specify a destination address for UDP broadcasts", server: "Configure NTP server", run: "Enable CDP", "default-gateway": "Specify default gateway (if not routing IP)", routing: "Enable IP routing",
  "unicast-routing": "Enable unicast routing", "link-local": "Use link-local address", "eui-64": "Use eui-64 interface identifier", name: "Ascii name of the VLAN", memory: "Write to NV memory", terminal: "Configure from the terminal",
  con: "Primary terminal line", vty: "Virtual terminal", range: "interface range command", "access-group": "Specify access control for packets", in: "inbound packets", out: "outbound packets",
  "dot1q": "IEEE 802.1Q Virtual LAN", "password-encryption": "Encrypt system passwords", "domain-lookup": "Enable IP Domain Name System hostname translation", "http": "HTTP server configuration",
  "exec-timeout": "Set the EXEC timeout", "logging": "Modify message logging facilities", synchronous: "Synchronized message output", privilege: "Set user privilege level", cost: "Interface cost", bandwidth: "Set bandwidth informational parameter",
  "clock": "Configure serial interface clock", rate: "Configure clock rate", vlans: "VLAN information", "lldp": "LLDP information", protocols: "Protocol information", "errdisable": "Error disable", "clear": "Reset functions", "user": "User", "users": "Display information about terminal lines",
  "history": "Display the session command history", "flash": "display information about flash: file system", "clock:": "Display the system clock", "sessions": "Information about Telnet connections", "startup": "startup", "tech-support": "Show system information for Tech-Support",
};
const SHOW_DESC = { interface: "IP interface status and configuration", interfaces: "Interface status and configuration", ip: "IP information", ipv6: "IPv6 information", ssh: "Information on SSH", vlan: "VTP VLAN status", "spanning-tree": "Spanning tree topology", cdp: "CDP information", lldp: "LLDP information", "mac": "MAC configuration", "access-lists": "List access lists", ntp: "Network time protocol", crypto: "Encryption module", "port-security": "Show secure port information", etherchannel: "EtherChannel information", "running-config": "Current operating configuration", "startup-config": "Contents of startup configuration", clock: "Display the system clock", flash: "display information about flash: file system", history: "Display the session command history", users: "Display information about terminal lines", version: "System hardware and software status", arp: "ARP table", protocols: "Active network routing protocols", logging: "Show the contents of logging buffers", inventory: "Show the physical inventory", configuration: "Contents of Non-Volatile memory" };
const PDESC = { "A.B.C.D": "IP address", "MASK": "IP subnet mask", "WORD": "", "LINE": "", "H.H.H": "48 bit mac address", "X:X:X:X::X": "IPv6 address", "X:X:X:X::X/<0-128>": "IPv6 prefix", IFNAME: "", RANGE: "" };

/* ---------------- session ---------------- */
export class Session {
  constructor(dev, topo, tree) {
    this.dev = dev; this.topo = topo; this.tree = tree;
    this.mode = "user"; this.ctx = {}; this.pending = null; this.history = []; this.loggedIn = true; this.lastOutput = "";
  }
  get promptText() {
    if (this.pending) return this.pending.prompt;
    return this.dev.hostname + MODES[this.mode].prompt;
  }
  prompt() { return this.promptText; }
  enter(mode, ctx = {}) { this.mode = mode; this.ctx = ctx; }
  exitMode() {
    if (this.mode === "user") return;
    if (this.mode === "priv") { this.mode = "user"; return; }
    if (this.mode === "config") { this.mode = "priv"; return; }
    this.mode = MODES[this.mode].parent; this.ctx = {};
  }
  end() { if (this.mode.startsWith("config")) { this.mode = "priv"; this.ctx = {}; } }
  ask(prompt, fn, opts = {}) { this.pending = { prompt, fn, echo: opts.echo !== false }; }

  /* Run one line. Returns {out, prompt, echo} — `echo:false` means the line was a hidden password. */
  exec(line) {
    const raw = line.replace(/\t/g, " ");
    if (this.pending) {
      const p = this.pending; this.pending = null;
      const out = p.fn(raw.trim()) ?? "";
      return { out, prompt: this.promptText, echo: p.echo };
    }
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("!")) return { out: "", prompt: this.promptText };
    this.history.push(trimmed);
    if (trimmed.endsWith("?")) return { out: this.help(raw.slice(0, raw.lastIndexOf("?"))), prompt: this.promptText, help: true };
    let out = this.run(trimmed, raw);
    return { out: out ?? "", prompt: this.promptText };
  }
  run(trimmed, raw) {
    let tokens = tokenize(trimmed); let mode = this.mode;
    // `do` in config modes
    if (mode.startsWith("config") && tokens.length > 1 && tokens[0].toLowerCase() === "do") {
      tokens = tokens.slice(1); mode = "priv"; raw = raw.replace(/^\s*do\s+/i, "");
    }
    const r = this.tree.parse(mode, tokens, raw.trim());
    if (!r.ok) {
      // unknown first word in exec modes → IOS tries to telnet to it
      if ((mode === "user" || mode === "priv") && r.depth === 0 && r.col !== null) {
        if (this.dev.domainLookup) return `Translating "${tokens[0]}"...domain server (255.255.255.255)\n% Unknown command or computer name, or unable to find computer address`;
        return `Translating "${tokens[0]}"\n% Unknown command or computer name, or unable to find computer address`;
      }
      if (r.col !== null) return " ".repeat(this.promptText.length + r.col) + "^\n" + r.error;
      return r.error;
    }
    const ctx = { dev: this.dev, topo: this.topo, session: this, args: r.args, p: r.p, neg: r.neg, mode, raw: raw.trim(), ...this.ctx };
    const out = r.handler(ctx);
    if (this.topo && this.topo.converged === false) { /* lazily re-converged by show/ping */ }
    return out;
  }
  help(before) {
    const endsSpace = /\s$/.test(before) || before.trim() === "";
    const tokens = tokenize(before.trim());
    let mode = this.mode;
    if (mode.startsWith("config") && tokens[0]?.toLowerCase() === "do") { tokens.shift(); mode = "priv"; }
    const partial = endsSpace ? "" : (tokens.pop() || "");
    const opts = this.tree.options(mode, tokens, partial);
    if (!opts.length) return partial ? "% Unrecognized command" : "% Unrecognized command";
    if (partial) return opts.map(o => o.kw).join("  ");
    const w = Math.max(...opts.map(o => o.kw.length), 10) + 2;
    return opts.map(o => "  " + o.kw.padEnd(w) + o.desc).join("\n");
  }
  /* Tab completion: returns the completed line (unchanged when ambiguous/none) */
  complete(line) {
    if (/\s$/.test(line)) return line;
    const tokens = tokenize(line.trim()); let mode = this.mode;
    if (mode.startsWith("config") && tokens[0]?.toLowerCase() === "do") { tokens.shift(); mode = "priv"; }
    const partial = tokens.pop() || "";
    const opts = this.tree.options(mode, tokens, partial).filter(o => !o.param && o.kw !== "<cr>");
    if (opts.length === 1) return line.slice(0, line.length - partial.length) + opts[0].kw + " ";
    if (opts.length > 1) { const exact = opts.find(o => o.kw === partial.toLowerCase()); if (exact) return line + " "; }
    return line;
  }
}
export function tokenize(s) { return s.trim().split(/\s+/).filter(Boolean); }
