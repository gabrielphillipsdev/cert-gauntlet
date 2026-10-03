/* Cert Gauntlet — IOS CLI simulator (CCNA 200-301 blueprint subset). Public API.

   import { Topology, createLab } from "../core/sims/ios/index.js";

   const lab = createLab({
     devices: { R1: { type: "router" }, SW1: { type: "switch" }, PC1: { host: true, ip: "10.1.1.10", mask: "255.255.255.0", gw: "10.1.1.1" } },
     links: [["R1", "g0/0", "SW1", "g0/1"], ["SW1", "f0/1", "PC1"]],
     configs: { R1: ["enable", "configure terminal", "interface g0/0", "ip address 10.1.1.1 255.255.255.0", "no shutdown"] },
   });
   const cli = lab.cli("R1");                 // one Session per terminal tab
   cli.prompt()                               // "R1#"
   cli.exec("show ip int brief")              // -> {out, prompt, echo?, help?}
   cli.complete("sh ip int br")               // Tab completion -> "show ip int br"  (completes the last word when unique)
   cli.exec("show ip ?")                      // -> help text
   lab.topo.ping("PC1", "10.1.1.1")           // programmatic ping -> {sent, received, marks, pct, text}
   lab.state("R1")                            // config snapshot for end-state graders (no runtime data)

   Chat 8 builds the lab UI and the lab items on top of this; nothing here touches the DOM. */
export { Topology } from "./topology.js";
export { Device, Host, parseIfName, shortIf } from "./device.js";
export { Session, CommandTree, MODES } from "./cli.js";
export { tree, makeSession, replayConfig, factoryReset } from "./commands.js";
export { runningConfig, type7, type5 } from "./config.js";
export * as show from "./show.js";
export * as net from "./net.js";
import { Topology } from "./topology.js";
import { makeSession, replayConfig } from "./commands.js";

export function createLab(spec = {}) {
  const topo = new Topology();
  for (const [name, o] of Object.entries(spec.devices || {})) {
    if (o.host) topo.addHost(name, o); else topo.add(name, o);
  }
  for (const l of spec.links || []) topo.link(l[0], l[1], l[2], l[3] ?? "Ethernet0");
  const sessions = {};
  const lab = {
    topo,
    cli(name) { return sessions[name] ||= makeSession(topo.get(name), topo); },
    /* run a list of CLI lines on a device (used for pre-configured labs and for tests) */
    run(name, lines) { const s = this.cli(name); const outs = []; for (const l of Array.isArray(lines) ? lines : lines.split("\n")) outs.push(s.exec(l).out); return outs; },
    /* feed a running-config text into a device (as if it booted with it) */
    load(name, text) { replayConfig(topo.get(name), topo, text); },
    converge() { topo.converge(); return this; },
    state(name) { const d = topo.get(name); return d.isHost ? { ip: d.ip, gw: d.gw } : d.snapshot(); },
  };
  for (const [name, lines] of Object.entries(spec.configs || {})) lab.run(name, lines);
  for (const [name, text] of Object.entries(spec.startup || {})) { lab.load(name, text); topo.get(name).startup = text; }
  for (const s of Object.values(sessions)) { s.enter("user"); s.pending = null; }
  topo.converge();
  return lab;
}
