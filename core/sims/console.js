/* Cert Gauntlet — incident console sim ("console").
   Tabbed hosts (Linux and Windows flavors) with a restricted shell. The candidate lists services / connections / processes,
   compares them with the IoC list in the Tasks pane, stops or disables the malicious ones, blocks the bad IPs, and leaves the
   legitimate services alone. Graded by END STATE only — any command path that reaches the state scores.

   Item schema (see dev/specs/secplus.md):
   { id, obj, type:"console", title, prompt, d?, cat?, why?,
     tasks:[string], iocs:{ ports:[n], procs:[name], ips:[ip] },
     requireDisable?: bool,            // bad services must be disabled as well as stopped (0.5 + 0.5)
     hosts:[{ id, os:"linux"|"windows", name, ip, user?, domain?,
              services:[{ name, display?, proc, pid, port?, proto?:"tcp"|"udp", bind?, user?, cmd?, desc?, bad?:true, keep?:true, remote?:"ip:port", enabled?:bool, running?:bool }],
              conns?:[{ proto, local, remote, state, pid }],
              files?:{ "/var/log/auth.log": "text" } }] }
   State: { host, hosts:{ [id]:{ svc:{ [name]:{run, en} }, blocked:[{ip, dir, via, name}], hist:[{c, o}] } } }

   exec(item, state, hostId, line) is exported for the grader tests (DOM-free). */
import { registerSim } from "./registry.js";
import { esc } from "../util.js";
import { injectCss, instructionsPane, TERM_KEYS } from "./ui.js";
import { attachKeyRow } from "../ui/keyrow.js";

/* ---------- state ---------- */
function hostState(item, st, hid) {
  if (!st.hosts[hid]) {
    const h = findHost(item, hid); const svc = {};
    (h.services || []).forEach(s => { svc[s.name] = { run: s.running !== false, en: s.enabled !== false }; });
    st.hosts[hid] = { svc, blocked: [], hist: [] };
  }
  return st.hosts[hid];
}
const findHost = (item, hid) => item.hosts.find(h => h.id === hid) || item.hosts[0];
const svcByName = (h, name) => { const n = String(name || "").toLowerCase().replace(/\.service$/, ""); return (h.services || []).find(s => s.name.toLowerCase() === n || (s.display || "").toLowerCase() === n || s.proc.toLowerCase() === n || s.proc.toLowerCase().replace(/\.exe$/, "") === n); };
const svcByPid = (h, pid) => (h.services || []).find(s => String(s.pid) === String(pid));
const running = (hs, s) => hs.svc[s.name] ? hs.svc[s.name].run : s.running !== false;
const enabled = (hs, s) => hs.svc[s.name] ? hs.svc[s.name].en : s.enabled !== false;

/* ---------- small helpers ---------- */
function tokenize(line) {
  const out = []; let cur = "", q = null;
  for (const ch of line.trim()) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === '"' || ch === "'") q = ch;
    else if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = ""; } }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
function ip2n(ip) { const p = ip.split(".").map(Number); if (p.length !== 4 || p.some(x => isNaN(x) || x < 0 || x > 255)) return null; return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; }
/* does a block entry (ip or cidr) cover the IoC ip? Prefixes shorter than /24 are "block the internet", not a targeted block. */
export function covers(spec, ip) {
  if (!spec) return false; spec = String(spec).trim();
  if (spec === ip) return true;
  const m = spec.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/); if (!m) return false;
  const bits = +m[2]; if (bits < 24) return false; const a = ip2n(m[1]), b = ip2n(ip); if (a === null || b === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0; return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}
const isBlocked = (hs, ip) => hs.blocked.some(b => covers(b.ip, ip));
const splitHP = s => { const i = s.lastIndexOf(":"); return [s.slice(0, i), s.slice(i + 1)]; };

/* ---------- per-host views ---------- */
function listeners(h, hs) { return (h.services || []).filter(s => s.port && running(hs, s)); }
function connections(h, hs) {
  const out = [];
  (h.services || []).forEach(s => { if (s.remote && running(hs, s)) out.push({ proto: s.proto || "tcp", local: h.ip + ":" + (s.sport || (40000 + s.pid % 20000)), remote: s.remote, state: "ESTABLISHED", pid: s.pid, proc: s.proc }); });
  (h.conns || []).forEach(c => { const s = c.pid ? svcByPid(h, c.pid) : null; if (s && !running(hs, s)) return; out.push({ ...c, proc: s ? s.proc : (c.proc || "-") }); });
  return out;
}
const SYS_LINUX = [["root", 1, "/sbin/init"], ["root", 2, "[kthreadd]"], ["root", 412, "/lib/systemd/systemd-journald"], ["root", 598, "/usr/sbin/cron -f"], ["root", 611, "/lib/systemd/systemd-logind"], ["root", 640, "/usr/sbin/rsyslogd -n"]];
const SYS_WIN = [["System", 4, "N/A", 148], ["smss.exe", 372, "N/A", 1180], ["csrss.exe", 528, "N/A", 5020], ["wininit.exe", 612, "N/A", 6412], ["services.exe", 700, "N/A", 9104], ["lsass.exe", 724, "KeyIso, SamSs", 18240], ["svchost.exe", 904, "RpcEptMapper, RpcSs", 11320], ["svchost.exe", 1012, "Dhcp, EventLog", 14480], ["explorer.exe", 3340, "N/A", 88220]];

/* ---------- the interpreter ---------- */
export function exec(item, st, hid, line) {
  const h = findHost(item, hid); const hs = hostState(item, st, hid);
  const raw = line.trim(); if (!raw) return "";
  const out = h.os === "windows" ? winExec(item, h, hs, raw) : linuxExec(item, h, hs, raw);
  hs.hist.push({ c: raw, o: out }); if (hs.hist.length > 80) hs.hist.splice(0, hs.hist.length - 80);
  return out;
}
function fileOf(h, path) {
  const files = h.files || {}; if (files[path] !== undefined) return files[path];
  const k = Object.keys(files).find(f => f.toLowerCase() === String(path).toLowerCase() || f.split(/[\\/]/).pop().toLowerCase() === String(path).toLowerCase()); return k ? files[k] : undefined;
}
function grep(text, pat, ci) { try { const re = new RegExp(pat, ci ? "i" : ""); return text.split("\n").filter(l => re.test(l)).join("\n"); } catch (e) { return text.split("\n").filter(l => ci ? l.toLowerCase().includes(pat.toLowerCase()) : l.includes(pat)).join("\n"); } }

const LINUX_HELP = `Restricted shell. Available commands:
  ss -tulpn | ss -tunap | netstat -tulpn | netstat -antp     listening sockets / connections
  ps aux | ps -ef | top                                       processes
  systemctl status|stop|start|disable|enable|restart <unit>   services (also: service <unit> stop)
  kill [-9] <pid> | pkill <name> | killall <name>             processes
  ufw status | ufw deny from <ip> | ufw deny out to <ip>      host firewall (ufw)
  iptables -A INPUT -s <ip> -j DROP | iptables -A OUTPUT -d <ip> -j DROP | iptables -L -n
  cat|tail|head|grep <file>  ls <dir>  ip a | ifconfig  hostname  whoami  last  history  clear`;
function linuxExec(item, h, hs, raw) {
  const t = tokenize(raw); const cmd = t[0]; const a = t.slice(1); const flags = a.filter(x => x.startsWith("-")).join(" ");
  const has = f => flags.includes(f);
  switch (cmd) {
    case "help": case "?": return LINUX_HELP;
    case "clear": return "\u0000clear";
    case "exit": case "logout": return "The session stays open for this task.";
    case "hostname": return h.name;
    case "whoami": return h.user || "sysadmin";
    case "id": return `uid=1000(${h.user || "sysadmin"}) gid=1000(${h.user || "sysadmin"}) groups=1000(${h.user || "sysadmin"}),27(sudo)`;
    case "uname": return `Linux ${h.name} 6.1.0-18-amd64 #1 SMP x86_64 GNU/Linux`;
    case "pwd": return "/home/" + (h.user || "sysadmin");
    case "history": return hs.hist.map((x, i) => lpad(i + 1, 4) + "  " + x.c).join("\n");
    case "sudo": return a.length ? linuxExec(item, h, hs, a.join(" ")) : "usage: sudo <command>";
    case "ip": case "ifconfig": return `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet ${h.ip}  netmask 255.255.255.0  broadcast ${h.ip.replace(/\d+$/, "255")}\n        ether 02:42:ac:11:00:${(h.pid || 7).toString(16).padStart(2, "0")}  txqueuelen 1000  (Ethernet)\nlo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0`;
    case "last": case "w": return fileOf(h, "/var/log/wtmp") || `${h.user || "sysadmin"}  pts/0  10.0.10.50  ${new Date().toDateString().slice(0, 10)} 08:02   still logged in`;
    case "ls": { const dir = (a.find(x => !x.startsWith("-")) || "/home/" + (h.user || "sysadmin")).replace(/\/$/, ""); const files = Object.keys(h.files || {}).filter(f => f.startsWith(dir + "/")).map(f => f.slice(dir.length + 1).split("/")[0]); if (!files.length && dir === "/home/" + (h.user || "sysadmin")) return ""; return files.length ? [...new Set(files)].join("  ") : `ls: cannot access '${dir}': No such file or directory`; }
    case "cat": case "less": case "more": case "head": case "tail": {
      const path = a.filter(x => !x.startsWith("-") && !/^\d+$/.test(x)).pop(); if (!path) return `${cmd}: missing file operand`;
      const txt = fileOf(h, path); if (txt === undefined) return `${cmd}: ${path}: No such file or directory`;
      if (cmd === "cat" || cmd === "less" || cmd === "more") return txt;
      let n = 10; const ni = a.findIndex(x => x === "-n"); if (ni >= 0 && a[ni + 1]) n = parseInt(a[ni + 1], 10) || 10; const dash = a.find(x => /^-\d+$/.test(x)); if (dash) n = parseInt(dash.slice(1), 10) || 10;
      const lines = txt.split("\n"); return (cmd === "head" ? lines.slice(0, n) : lines.slice(-n)).join("\n");
    }
    case "grep": { const ci = has("-i"); const rest = a.filter(x => !x.startsWith("-")); if (rest.length < 2) return "usage: grep [-i] PATTERN FILE"; const txt = fileOf(h, rest[rest.length - 1]); if (txt === undefined) return `grep: ${rest[rest.length - 1]}: No such file or directory`; return grep(txt, rest.slice(0, -1).join(" "), ci); }
    case "ss": case "netstat": {
      /* like the real tools: -l = listeners only, -a = listeners + connections, neither = connections only */
      const showL = has("l"), showA = has("a"), showP = has("p");
      const rows = []; const svcs = listeners(h, hs); const conns = connections(h, hs);
      if (showL || showA) svcs.forEach(s => rows.push([s.proto || "tcp", "LISTEN", (s.bind || "0.0.0.0") + ":" + s.port, "0.0.0.0:*", s.proc, s.pid]));
      if (showA || !showL) conns.forEach(c => rows.push([c.proto, c.state, c.local, c.remote, c.proc, c.pid]));
      if (!rows.length) return showL ? "" : "(no established connections; use -tulpn / -tunap for listening sockets)";
      if (cmd === "ss") return pad("Netid", 6) + pad("State", 8) + pad("Recv-Q", 7) + pad("Send-Q", 7) + pad("Local Address:Port", 24) + pad("Peer Address:Port", 24) + (showP ? "Process" : "") + "\n" + rows.map(r => pad(r[0], 6) + pad(r[1], 8) + pad("0", 7) + pad(r[1] === "LISTEN" ? "128" : "0", 7) + pad(r[2], 24) + pad(r[3], 24) + (showP ? `users:(("${r[4]}",pid=${r[5]},fd=3))` : "")).join("\n");
      return "Active Internet connections (" + (showA ? "servers and established" : "only servers") + ")\n" + pad("Proto", 6) + pad("Recv-Q", 7) + pad("Send-Q", 7) + pad("Local Address", 24) + pad("Foreign Address", 24) + pad("State", 12) + (showP ? "PID/Program name" : "") + "\n" + rows.map(r => pad(r[0], 6) + pad("0", 7) + pad("0", 7) + pad(r[2], 24) + pad(r[3], 24) + pad(r[1], 12) + (showP ? r[5] + "/" + r[4] : "")).join("\n");
    }
    case "ps": case "top": {
      const procs = SYS_LINUX.map(x => ({ user: x[0], pid: x[1], cmd: x[2], cpu: "0.0", mem: "0.1" })).concat((h.services || []).filter(s => running(hs, s)).map(s => ({ user: s.user || "root", pid: s.pid, cmd: s.cmd || "/usr/sbin/" + s.proc, cpu: s.cpu || "0.0", mem: s.mem || "0.4" }))).sort((x, y) => x.pid - y.pid);
      if (flags.includes("e") && !flags.includes("a") && !flags.includes("u")) return pad("UID", 10) + lpad("PID", 6) + lpad("PPID", 6) + "  CMD\n" + procs.map(p => pad(p.user, 10) + lpad(p.pid, 6) + lpad(p.pid === 1 ? 0 : 1, 6) + "  " + p.cmd).join("\n");
      return pad("USER", 10) + lpad("PID", 6) + lpad("%CPU", 6) + lpad("%MEM", 6) + " STAT  COMMAND\n" + procs.map(p => pad(p.user, 10) + lpad(p.pid, 6) + lpad(p.cpu, 6) + lpad(p.mem, 6) + " Ss    " + p.cmd).join("\n");
    }
    case "systemctl": case "service": {
      const args = a.filter(x => !x.startsWith("-")); let verb = args[0], unit = args[1]; if (cmd === "service") { unit = args[0]; verb = args[1]; }
      const now = a.includes("--now");
      if (verb === "list-units" || verb === "list-unit-files" || (!verb && cmd === "systemctl")) return pad("UNIT", 24) + pad("LOAD", 8) + pad("ACTIVE", 10) + pad("SUB", 10) + "DESCRIPTION\n" + (h.services || []).map(s => pad(s.name + ".service", 24) + pad("loaded", 8) + pad(running(hs, s) ? "active" : "inactive", 10) + pad(running(hs, s) ? "running" : "dead", 10) + (s.display || s.desc || s.proc)).join("\n");
      if (!unit) return `systemctl: too few arguments`;
      const s = svcByName(h, unit); if (!s) return `Unit ${unit.replace(/\.service$/, "")}.service could not be found.`;
      const set = (k, v) => { hs.svc[s.name] = hs.svc[s.name] || { run: true, en: true }; hs.svc[s.name][k] = v; };
      switch (verb) {
        case "status": case "is-active": case "is-enabled": return `● ${s.name}.service - ${s.display || s.desc || s.proc}\n     Loaded: loaded (/etc/systemd/system/${s.name}.service; ${enabled(hs, s) ? "enabled" : "disabled"}; preset: enabled)\n     Active: ${running(hs, s) ? "active (running)" : "inactive (dead)"}\n   Main PID: ${s.pid} (${s.proc})\n     CGroup: /system.slice/${s.name}.service\n             └─${s.pid} ${s.cmd || "/usr/sbin/" + s.proc}`;
        case "stop": set("run", false); return "";
        case "start": set("run", true); return "";
        case "restart": set("run", true); return "";
        case "disable": set("en", false); if (now) set("run", false); return `Removed "/etc/systemd/system/multi-user.target.wants/${s.name}.service".`;
        case "enable": set("en", true); if (now) set("run", true); return `Created symlink /etc/systemd/system/multi-user.target.wants/${s.name}.service → /etc/systemd/system/${s.name}.service.`;
        case "mask": set("en", false); if (now) set("run", false); return `Created symlink /etc/systemd/system/${s.name}.service → /dev/null.`;
        default: return `Unknown command verb ${verb}.`;
      }
    }
    case "kill": case "pkill": case "killall": {
      const args = a.filter(x => !x.startsWith("-")); if (!args.length) return `${cmd}: usage: ${cmd} [-9] ${cmd === "kill" ? "pid" : "name"}`;
      let done = [], miss = [];
      args.forEach(x => { const s = cmd === "kill" ? svcByPid(h, x) : svcByName(h, x); if (s && running(hs, s)) { hs.svc[s.name] = hs.svc[s.name] || { run: true, en: true }; hs.svc[s.name].run = false; done.push(x); } else miss.push(x); });
      return miss.map(x => cmd === "kill" ? `bash: kill: (${x}) - No such process` : `${cmd}: no process found`).join("\n");
    }
    case "ufw": {
      const v = a[0];
      if (!v || v === "status") return `Status: active\n\n${pad("To", 28)}${pad("Action", 12)}From\n${pad("--", 28)}${pad("------", 12)}----\n` + (h.ufw || [["22/tcp", "ALLOW IN", "10.0.10.0/24"], ["443/tcp", "ALLOW IN", "Anywhere"]]).map(r => pad(r[0], 28) + pad(r[1], 12) + r[2]).join("\n") + (hs.blocked.filter(b => b.via === "ufw").length ? "\n" + hs.blocked.filter(b => b.via === "ufw").map(b => b.dir === "out" ? pad(b.ip, 28) + pad("DENY OUT", 12) + "Anywhere" : pad("Anywhere", 28) + pad("DENY IN", 12) + b.ip).join("\n") : "");
      if (v === "enable") return "Firewall is active and enabled on system startup";
      if (v === "reload") return "Firewall reloaded";
      if (v === "allow") return "Rule added";
      if (v === "delete") { const ip = a.find(x => /^\d+\.\d+\.\d+\.\d+/.test(x)); const before = hs.blocked.length; hs.blocked = hs.blocked.filter(b => !(b.via === "ufw" && b.ip === ip)); return before === hs.blocked.length ? "Could not delete non-existent rule" : "Rule deleted"; }
      if (v === "deny" || v === "reject" || v === "insert") {
        const ip = a.find((x, i) => i > 0 && /^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(x)); if (!ip) return "ERROR: Need an address: ufw deny from <ip>  |  ufw deny out to <ip>";
        const dir = a.includes("out") ? "out" : a.includes("in") || a.includes("from") ? "in" : "in";
        hs.blocked.push({ ip, dir, via: "ufw" }); return "Rule added";
      }
      return `ERROR: Invalid syntax: ${raw}`;
    }
    case "iptables": {
      if (a.includes("-L") || a.includes("-S")) { const rows = hs.blocked.filter(b => b.via === "iptables"); return `Chain INPUT (policy ACCEPT)\ntarget     prot opt source               destination\n${rows.filter(b => b.dir === "in").map(b => pad(b.act || "DROP", 11) + "all  --  " + pad(b.ip, 21) + "anywhere").join("\n")}\n\nChain FORWARD (policy ACCEPT)\ntarget     prot opt source               destination\n\nChain OUTPUT (policy ACCEPT)\ntarget     prot opt source               destination\n${rows.filter(b => b.dir === "out").map(b => pad(b.act || "DROP", 11) + "all  --  " + pad("anywhere", 21) + b.ip).join("\n")}`; }
      const chainI = a.findIndex(x => x === "-A" || x === "-I"); const chain = chainI >= 0 ? a[chainI + 1] : null;
      const si = a.indexOf("-s"), di = a.indexOf("-d"), ji = a.indexOf("-j");
      if (a.includes("-D")) { const ip = si >= 0 ? a[si + 1] : di >= 0 ? a[di + 1] : null; const before = hs.blocked.length; hs.blocked = hs.blocked.filter(b => !(b.via === "iptables" && b.ip === ip)); return before === hs.blocked.length ? "iptables: Bad rule (does a matching rule exist in that chain?)." : ""; }
      if (a.includes("-F")) { hs.blocked = hs.blocked.filter(b => b.via !== "iptables"); return ""; }
      if (!chain || ji < 0) return "iptables v1.8.9: usage: iptables -A INPUT -s <ip> -j DROP   |   iptables -A OUTPUT -d <ip> -j DROP   |   iptables -L -n";
      const target = (a[ji + 1] || "").toUpperCase(); if (!["DROP", "REJECT"].includes(target)) return target === "ACCEPT" ? "" : `iptables: Couldn't load target '${a[ji + 1]}'.`;
      const ip = si >= 0 ? a[si + 1] : di >= 0 ? a[di + 1] : null; if (!ip) return "iptables: a block rule here needs -s <ip> (INPUT) or -d <ip> (OUTPUT).";
      hs.blocked.push({ ip, dir: /OUT/i.test(chain) ? "out" : "in", via: "iptables", act: target }); return "";
    }
    default: return `bash: ${cmd}: command not found`;
  }
}

const WIN_HELP = `Restricted command prompt. Available commands:
  netstat -ano | netstat -anob                       connections and listening ports with PIDs
  tasklist | tasklist /svc                           processes (and the services each one hosts)
  taskkill /PID <pid> /F | taskkill /IM <image> /F   end a process
  sc query [name] | sc stop <name> | sc config <name> start= disabled | net stop <name>
  Get-Service | Stop-Service <name> | Set-Service <name> -StartupType Disabled
  netsh advfirewall firewall add rule name="X" dir=out action=block remoteip=<ip>
  netsh advfirewall firewall show rule name=all | New-NetFirewallRule -DisplayName X -Direction Outbound -RemoteAddress <ip> -Action Block
  type <file> | Get-Content <file> | findstr <text> <file> | dir <folder> | ipconfig /all | hostname | whoami | cls`;
function winExec(item, h, hs, raw) {
  const t = tokenize(raw); const cmd = (t[0] || "").toLowerCase(); const a = t.slice(1); const al = a.map(x => x.toLowerCase());
  const kv = (k) => { const i = al.findIndex(x => x.startsWith(k + "=")); if (i >= 0) return a[i].slice(k.length + 1) || a[i + 1]; const j = al.indexOf(k + "="); return j >= 0 ? a[j + 1] : null; };
  const opt = (k) => { const i = al.indexOf(k.toLowerCase()); return i >= 0 ? a[i + 1] : null; };
  switch (cmd) {
    case "help": case "?": return WIN_HELP;
    case "cls": case "clear": return "\u0000clear";
    case "exit": return "The session stays open for this task.";
    case "hostname": return h.name;
    case "whoami": return (h.domain || h.name).toLowerCase() + "\\" + (h.user || "administrator");
    case "ver": return "Microsoft Windows [Version 10.0.20348.2340]";
    case "systeminfo": return `Host Name:                 ${h.name.toUpperCase()}\nOS Name:                   Microsoft Windows Server 2022 Standard\nDomain:                    ${h.domain || "WORKGROUP"}\nIP address(es):            ${h.ip}`;
    case "ipconfig": return `\nWindows IP Configuration\n\nEthernet adapter Ethernet0:\n\n   Connection-specific DNS Suffix  . : ${(h.domain || "corp.example").toLowerCase()}\n   IPv4 Address. . . . . . . . . . . : ${h.ip}\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : ${h.ip.replace(/\d+$/, "1")}`;
    case "dir": case "ls": { const dir = (a.find(x => !x.startsWith("/")) || "C:\\Users\\" + (h.user || "administrator")).replace(/\\$/, ""); const files = Object.keys(h.files || {}).filter(f => f.toLowerCase().startsWith(dir.toLowerCase() + "\\")).map(f => f.slice(dir.length + 1).split("\\")[0]); return files.length ? ` Directory of ${dir}\n\n` + [...new Set(files)].map(f => "02/14/2026  08:12 AM             4,096 " + f).join("\n") : "File Not Found"; }
    case "type": case "more": case "get-content": case "gc": case "cat": { const p = a.find(x => !x.startsWith("-") && !x.startsWith("/")); if (!p) return "The syntax of the command is incorrect."; const txt = fileOf(h, p); return txt === undefined ? "The system cannot find the file specified." : txt; }
    case "findstr": case "select-string": { const ci = al.includes("/i"); const rest = a.filter(x => !x.startsWith("/")); if (rest.length < 2) return "FINDSTR: Bad command line"; const txt = fileOf(h, rest[rest.length - 1]); return txt === undefined ? "FINDSTR: Cannot open " + rest[rest.length - 1] : grep(txt, rest.slice(0, -1).join(" "), ci); }
    case "netstat": case "get-nettcpconnection": {
      const f = al.join(" "); const showP = f.includes("o") || cmd !== "netstat", showB = f.includes("b");
      const rows = []; listeners(h, hs).forEach(s => rows.push([(s.proto || "tcp").toUpperCase(), (s.bind || "0.0.0.0") + ":" + s.port, "0.0.0.0:0", (s.proto || "tcp") === "udp" ? "" : "LISTENING", s.pid, s.proc]));
      connections(h, hs).forEach(c => rows.push([c.proto.toUpperCase(), c.local, c.remote, c.state, c.pid, c.proc]));
      return "\nActive Connections\n\n  " + pad("Proto", 7) + pad("Local Address", 23) + pad("Foreign Address", 23) + pad("State", 16) + (showP ? "PID" : "") + "\n" + rows.map(r => "  " + pad(r[0], 7) + pad(r[1], 23) + pad(r[2], 23) + pad(r[3], 16) + (showP ? r[4] : "") + (showB ? `\n [${r[5]}]` : "")).join("\n");
    }
    case "tasklist": case "get-process": case "ps": {
      const svcCol = al.includes("/svc");
      const procs = SYS_WIN.map(x => ({ img: x[0], pid: x[1], svc: x[2], mem: x[3] })).concat((h.services || []).filter(s => running(hs, s)).map(s => ({ img: s.proc, pid: s.pid, svc: s.name, mem: s.mem || 24680 }))).sort((x, y) => x.pid - y.pid);
      if (svcCol) return "\n" + pad("Image Name", 26) + lpad("PID", 8) + " Services\n" + "=".repeat(25) + " " + "=".repeat(8) + " " + "=".repeat(44) + "\n" + procs.map(p => pad(p.img, 26) + lpad(p.pid, 8) + " " + p.svc).join("\n");
      return "\n" + pad("Image Name", 26) + lpad("PID", 8) + " " + pad("Session Name", 17) + lpad("Session#", 9) + lpad("Mem Usage", 13) + "\n" + "=".repeat(25) + " " + "=".repeat(8) + " " + "=".repeat(16) + " " + "=".repeat(11) + " " + "=".repeat(12) + "\n" + procs.map(p => pad(p.img, 26) + lpad(p.pid, 8) + " " + pad("Services", 17) + lpad(0, 9) + lpad(p.mem.toLocaleString() + " K", 13)).join("\n");
    }
    case "taskkill": case "stop-process": case "kill": {
      const pid = opt("/pid") || opt("-id"); const im = opt("/im") || opt("-name"); const force = al.includes("/f") || al.includes("-force");
      const s = pid ? svcByPid(h, pid) : im ? svcByName(h, im) : null;
      if (!s || !running(hs, s)) return pid ? `ERROR: The process "${pid}" not found.` : im ? `ERROR: The process "${im}" not found.` : "ERROR: Invalid syntax. Use taskkill /PID <pid> /F  or  taskkill /IM <image> /F";
      if (!force && s.svcHost !== false && s.port) { return `ERROR: The process with PID ${s.pid} could not be terminated.\nReason: This process can only be terminated forcefully (with /F option).`; }
      hs.svc[s.name] = hs.svc[s.name] || { run: true, en: true }; hs.svc[s.name].run = false;
      return `SUCCESS: The process ${pid ? "with PID " + s.pid : '"' + s.proc + '" with PID ' + s.pid} has been terminated.`;
    }
    case "sc": case "sc.exe": {
      const verb = al[0], name = a[1];
      if (verb === "query" && !name) return (h.services || []).map(s => `SERVICE_NAME: ${s.name}\nDISPLAY_NAME: ${s.display || s.name}\n        TYPE               : 10  WIN32_OWN_PROCESS\n        STATE              : ${running(hs, s) ? "4  RUNNING" : "1  STOPPED"}\n`).join("\n");
      if (!name) return "ERROR: Usage: sc <query|stop|start|config|qc> <service>";
      const s = svcByName(h, name); if (!s) return "[SC] OpenService FAILED 1060:\n\nThe specified service does not exist as an installed service.";
      const set = (k, v) => { hs.svc[s.name] = hs.svc[s.name] || { run: true, en: true }; hs.svc[s.name][k] = v; };
      if (verb === "query") return `SERVICE_NAME: ${s.name}\n        TYPE               : 10  WIN32_OWN_PROCESS\n        STATE              : ${running(hs, s) ? "4  RUNNING" : "1  STOPPED"}\n        WIN32_EXIT_CODE    : 0  (0x0)\n        PID                : ${running(hs, s) ? s.pid : 0}`;
      if (verb === "qc") return `[SC] QueryServiceConfig SUCCESS\n\nSERVICE_NAME: ${s.name}\n        TYPE               : 10  WIN32_OWN_PROCESS\n        START_TYPE         : ${enabled(hs, s) ? "2   AUTO_START" : "4   DISABLED"}\n        BINARY_PATH_NAME   : ${s.cmd || "C:\\Windows\\System32\\" + s.proc}\n        DISPLAY_NAME       : ${s.display || s.name}`;
      if (verb === "stop") { if (!running(hs, s)) return "[SC] ControlService FAILED 1062:\n\nThe service has not been started."; set("run", false); return `SERVICE_NAME: ${s.name}\n        STATE              : 3  STOP_PENDING\n        STATE              : 1  STOPPED`; }
      if (verb === "start") { set("run", true); return `SERVICE_NAME: ${s.name}\n        STATE              : 2  START_PENDING\n        PID                : ${s.pid}`; }
      if (verb === "config") { const start = (kv("start") || "").toLowerCase(); if (!start) return "ERROR: Usage: sc config <service> start= <disabled|demand|auto>"; set("en", start !== "disabled"); return "[SC] ChangeServiceConfig SUCCESS"; }
      if (verb === "delete") { set("run", false); set("en", false); return "[SC] DeleteService SUCCESS"; }
      return `Unrecognized command: ${a[0]}`;
    }
    case "net": { const verb = al[0], name = a.slice(1).join(" "); if (!["stop", "start"].includes(verb)) return "The syntax of this command is:\n\nNET STOP|START <service>"; const s = svcByName(h, name); if (!s) return "The service name is invalid."; hs.svc[s.name] = hs.svc[s.name] || { run: true, en: true }; hs.svc[s.name].run = verb === "start"; return `The ${s.display || s.name} service ${verb === "stop" ? "was stopped" : "was started"} successfully.`; }
    case "get-service": { const name = a.find(x => !x.startsWith("-")); const list = name ? (h.services || []).filter(s => svcByName(h, name) === s) : (h.services || []); if (!list.length) return `Get-Service : Cannot find any service with service name '${name}'.`; return pad("Status", 9) + pad("Name", 22) + "DisplayName\n" + pad("------", 9) + pad("----", 22) + "-----------\n" + list.map(s => pad(running(hs, s) ? "Running" : "Stopped", 9) + pad(s.name, 22) + (s.display || s.name)).join("\n"); }
    case "stop-service": case "start-service": case "restart-service": case "set-service": {
      const name = opt("-name") || a.find(x => !x.startsWith("-")); const s = name ? svcByName(h, name) : null; if (!s) return `${t[0]} : Cannot find any service with service name '${name}'.`;
      const set = (k, v) => { hs.svc[s.name] = hs.svc[s.name] || { run: true, en: true }; hs.svc[s.name][k] = v; };
      if (cmd === "stop-service") set("run", false); if (cmd === "start-service" || cmd === "restart-service") set("run", true);
      if (cmd === "set-service") { const st = (opt("-startuptype") || "").toLowerCase(); const status = (opt("-status") || "").toLowerCase(); if (st) set("en", st !== "disabled"); if (status === "stopped") set("run", false); if (status === "running") set("run", true); if (!st && !status) return "Set-Service : Specify -StartupType Disabled or -Status Stopped."; }
      return "";
    }
    case "netsh": {
      if (al[0] !== "advfirewall") return "The following command was not found: " + raw;
      if (al[1] === "show") return `\nDomain Profile Settings:\n----------------------------------------------------------------------\nState                                 ON\nFirewall Policy                       BlockInbound,AllowOutbound\n\nPrivate Profile Settings:\n----------------------------------------------------------------------\nState                                 ON\n\nPublic Profile Settings:\n----------------------------------------------------------------------\nState                                 ON\nOk.`;
      if (al[1] === "set") return "Ok.";
      if (al[1] !== "firewall") return "The following command was not found: " + raw;
      const verb = al[2];
      if (verb === "show") { const rows = hs.blocked.filter(b => b.via === "netsh"); return rows.length ? rows.map(b => `\nRule Name:                            ${b.name}\n----------------------------------------------------------------------\nEnabled:                              Yes\nDirection:                            ${b.dir === "out" ? "Out" : "In"}\nProfiles:                             Domain,Private,Public\nRemoteIP:                             ${b.ip}/32\nProtocol:                             Any\nAction:                               Block`).join("\n") + "\nOk." : "\nNo rules match the specified criteria."; }
      if (verb === "delete") { const name = kv("name"); const before = hs.blocked.length; hs.blocked = hs.blocked.filter(b => !(b.via === "netsh" && b.name === name)); return before === hs.blocked.length ? "No rules match the specified criteria." : "\nDeleted 1 rule(s).\nOk."; }
      if (verb !== "add") return "The following command was not found: " + raw;
      const name = kv("name"), dir = (kv("dir") || "").toLowerCase(), action = (kv("action") || "").toLowerCase(), rip = kv("remoteip");
      if (!name || !dir || !action) return "\nA specified value is not valid.\n\nUsage: add rule name=<string> dir=in|out action=allow|block [remoteip=addresses]";
      if (action !== "block") return "Ok.";
      if (!rip) return "\nOk.\n(A block rule with no remoteip and no port matches nothing useful — specify remoteip=<address>.)";
      rip.split(",").forEach(ip => hs.blocked.push({ ip: ip.trim(), dir: dir === "out" ? "out" : "in", via: "netsh", name }));
      return "Ok.";
    }
    case "new-netfirewallrule": {
      const name = opt("-displayname") || opt("-name") || "Rule"; const dir = (opt("-direction") || "inbound").toLowerCase(); const action = (opt("-action") || "allow").toLowerCase(); const rip = opt("-remoteaddress");
      if (action !== "block") return `Name: ${name}  Action: Allow`;
      if (!rip) return "New-NetFirewallRule : A block rule needs -RemoteAddress <ip>.";
      rip.split(",").forEach(ip => hs.blocked.push({ ip: ip.trim(), dir: dir.startsWith("out") ? "out" : "in", via: "netsh", name }));
      return `\nName                  : {${Math.random().toString(16).slice(2, 10)}}\nDisplayName           : ${name}\nEnabled               : True\nDirection             : ${dir.startsWith("out") ? "Outbound" : "Inbound"}\nAction                : Block`;
    }
    case "get-netfirewallrule": return winExec(item, h, hs, "netsh advfirewall firewall show rule name=all");
    case "remove-netfirewallrule": { const name = opt("-displayname") || opt("-name"); hs.blocked = hs.blocked.filter(b => !(b.via === "netsh" && b.name === name)); return ""; }
    default: return `'${t[0]}' is not recognized as an internal or external command,\noperable program or batch file.`;
  }
}

/* ---------- grading: end state only ---------- */
export function checks(item, st) {
  const out = [];
  item.hosts.forEach(h => {
    const hs = hostState(item, st, h.id);
    (h.services || []).forEach(s => {
      if (s.bad) {
        if (item.requireDisable) {
          out.push({ host: h.name, kind: "stop", what: s.name, ok: !running(hs, s), w: 0.5, text: `${h.name}: stop ${s.name} (${s.proc})` });
          out.push({ host: h.name, kind: "disable", what: s.name, ok: !enabled(hs, s), w: 0.5, text: `${h.name}: disable ${s.name} so it does not return at boot` });
        } else out.push({ host: h.name, kind: "stop", what: s.name, ok: !running(hs, s), w: 1, text: `${h.name}: stop ${s.name} (${s.proc})` });
      } else if (s.keep) out.push({ host: h.name, kind: "keep", what: s.name, ok: running(hs, s), w: 1, text: `${h.name}: leave ${s.name} running` });
    });
  });
  (item.iocs && item.iocs.ips || []).forEach(ip => {
    const talkers = item.hosts.filter(h => (h.services || []).some(s => s.remote && s.remote.startsWith(ip + ":")) || (h.conns || []).some(c => c.remote.startsWith(ip + ":")));
    const where = talkers.length ? talkers : item.hosts;
    const ok = talkers.length ? where.every(h => isBlocked(hostState(item, st, h.id), ip)) : where.some(h => isBlocked(hostState(item, st, h.id), ip));
    out.push({ host: where.map(h => h.name).join(", "), kind: "block", what: ip, ok, w: 1, text: `block ${ip} on ${where.map(h => h.name).join(" and ")}` });
  });
  return out;
}
export function collateral(item, st) {
  const hit = [];
  item.hosts.forEach(h => { const hs = hostState(item, st, h.id); (h.services || []).forEach(s => { if (!s.bad && !s.keep && !running(hs, s) && s.running !== false) hit.push(`${h.name}: ${s.name}`); }); });
  return hit;
}
export function scoreConsole(item, st) {
  /* points for the positive tasks (stop / disable / block); deductions for harm (a keep service down −1, any other legit service down −½) */
  const cs = checks(item, st); const col = collateral(item, st);
  const pos = cs.filter(c => c.kind !== "keep"), keep = cs.filter(c => c.kind === "keep");
  const max = pos.reduce((a, c) => a + c.w, 0) || 1; let got = pos.reduce((a, c) => a + (c.ok ? c.w : 0), 0);
  got = Math.max(0, got - keep.filter(c => !c.ok).length - 0.5 * col.length);
  const notes = pos.filter(c => !c.ok).map(c => "Missed: " + c.text + ".");
  keep.filter(c => !c.ok).forEach(c => notes.push(`Broke the business: ${c.text.replace("leave ", "")} was required and you stopped it (−1).`));
  col.forEach(c => notes.push(`Collateral damage: ${c} was legitimate and you stopped it (−½).`));
  if (!notes.length) notes.push("Every malicious service is down, every IoC address is blocked, nothing legitimate was touched.");
  return { f: Math.round((got / max) * 1000) / 1000, notes, why: item.why || "" };
}

/* ---------- rendering ---------- */
const PROMPT = h => h.os === "windows" ? `C:\\Users\\${h.user || "administrator"}>` : `${h.user || "sysadmin"}@${h.name}:~$ `;
registerSim("console", {
  label: "Incident console", color: "#2EE6D6",
  create(item) { const st = { host: item.hosts[0].id, hosts: {} }; item.hosts.forEach(h => hostState(item, st, h.id)); return st; },
  render(el, item, st, ctx) {
    el.innerHTML = "";
    if (item.prompt) { const p = document.createElement("p"); p.className = "pbqp"; p.textContent = item.prompt; el.appendChild(p); }
    instructionsPane(el, item, { title: "Tasks", note: "Type help in either console for the command list. Grading looks only at the final state of each host." });
    if (ctx.reveal) {
      const cs = checks(item, st); const col = collateral(item, st);
      const box = document.createElement("div"); box.className = "con-checks";
      box.innerHTML = cs.map(c => `<div class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "✗"} ${esc(c.text)}</div>`).join("") + col.map(c => `<div class="bad">✗ collateral: ${esc(c)} stopped</div>`).join("");
      el.appendChild(box);
    }
    const wrap = document.createElement("div"); wrap.className = "con"; el.appendChild(wrap);
    const draw = () => {
      const h = findHost(item, st.host); const hs = hostState(item, st, h.id);
      wrap.innerHTML = `<div class="con-tabs" role="tablist">${item.hosts.map(x => `<button type="button" role="tab" class="con-tab ${x.id === h.id ? "on" : ""}" data-h="${esc(x.id)}"><span class="os ${x.os}">${x.os === "windows" ? "⊞" : "λ"}</span>${esc(x.name)}<small>${esc(x.ip)}</small></button>`).join("")}</div>` +
        `<div class="con-term ${h.os}"><pre class="con-out" tabindex="0">${hs.hist.length ? hs.hist.map(e => `<span class="c">${esc(PROMPT(h))}${esc(e.c)}</span>\n${e.o && e.o !== "\u0000clear" ? esc(e.o) + "\n" : ""}`).join("") : `<span class="m">${h.os === "windows" ? "Microsoft Windows [Version 10.0.20348.2340]\n(c) Microsoft Corporation. All rights reserved." : `Welcome to ${h.name} (Debian GNU/Linux 12)\nLast login: ${new Date().toDateString()} from 10.0.10.50`}\nType help for the commands this console accepts.</span>\n`}</pre>` +
        `<form class="con-in"><span class="con-ps">${esc(PROMPT(h))}</span><input type="text" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="go" aria-label="Command" ${ctx.locked ? "disabled" : ""}><button type="submit" ${ctx.locked ? "disabled" : ""}>Run</button></form></div>`;
      wrap.querySelectorAll(".con-tab").forEach(b => b.onclick = () => { st.host = b.dataset.h; ctx.onChange(); draw(); });
      const out = wrap.querySelector(".con-out"); out.scrollTop = out.scrollHeight;
      const inp = wrap.querySelector("input"); let hi = hs.hist.length;
      wrap.querySelector("form").onsubmit = ev => {
        ev.preventDefault(); if (ctx.locked) return; const line = inp.value; if (!line.trim()) return;
        const o = exec(item, st, h.id, line); if (o === "\u0000clear") hs.hist = []; inp.value = ""; hi = hs.hist.length; ctx.onChange();
        const o2 = wrap.querySelector(".con-out");
        if (o === "\u0000clear") o2.innerHTML = ""; else { o2.insertAdjacentHTML("beforeend", `<span class="c">${esc(PROMPT(h))}${esc(line)}</span>\n${o ? esc(o) + "\n" : ""}`); }
        o2.scrollTop = o2.scrollHeight; inp.focus({ preventScroll: true });
      };
      inp.onkeydown = ev => {
        if (ev.key === "ArrowUp") { ev.preventDefault(); if (hi > 0) { hi--; inp.value = hs.hist[hi].c; } }
        else if (ev.key === "ArrowDown") { ev.preventDefault(); if (hi < hs.hist.length - 1) { hi++; inp.value = hs.hist[hi].c; } else { hi = hs.hist.length; inp.value = ""; } }
        else if (ev.key === "Tab") { ev.preventDefault(); const v = inp.value; const parts = v.split(/\s+/); const last = parts[parts.length - 1]; if (!last) return; const names = (h.services || []).map(s => s.name).concat(Object.keys(h.files || {}), h.os === "windows" ? ["netstat", "tasklist", "taskkill", "netsh", "advfirewall", "firewall", "ipconfig", "Get-Service", "Stop-Service", "Set-Service", "findstr"] : ["systemctl", "status", "stop", "disable", "iptables", "netstat", "ufw", "tail", "grep", "/var/log/"]); const hit = names.find(n => n.toLowerCase().startsWith(last.toLowerCase()) && n !== last); if (hit) { parts[parts.length - 1] = hit; inp.value = parts.join(" "); } }
      };
    };
    draw();
    if (!ctx.locked && window.matchMedia && !window.matchMedia("(pointer:fine)").matches) { if (el._kr) el._kr(); el._kr = attachKeyRow(el, TERM_KEYS); }
  },
  answered: (item, st) => Object.values(st.hosts || {}).some(h => h.hist.length > 0),
  score: scoreConsole,
});

injectCss("cg-sim-console", `
.con{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#0A1017}
.con-tabs{display:flex;gap:0;overflow-x:auto;background:var(--panel);border-bottom:1px solid var(--line);-webkit-overflow-scrolling:touch}
.con-tab{flex:1 0 auto;border:none;background:none;color:var(--muted);font-size:13px;font-weight:700;padding:10px 14px;display:inline-flex;flex-direction:column;align-items:flex-start;gap:1px;border-right:1px solid var(--line);min-width:120px;position:relative}
.con-tab small{font-size:10.5px;font-weight:600;color:var(--dim)}
.con-tab .os{position:absolute;right:10px;top:9px;font-size:12px;color:var(--dim)}
.con-tab.on{color:var(--ink);background:#0A1017}
.con-tab.on::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--teal)}
.con-tab.on .os.windows{color:var(--blue)}.con-tab.on .os.linux{color:var(--amber)}
.con-out{margin:0;padding:12px;height:300px;overflow:auto;font-size:12px;line-height:1.45;color:#C9D6E6;white-space:pre;user-select:text;-webkit-user-select:text;-webkit-overflow-scrolling:touch}
.con-out .c{color:#9EF0E4}.con-out .m{color:var(--muted)}
.con-term.windows .con-out{color:#E8E8E8}.con-term.windows .con-out .c{color:#FFFFFF}
.con-in{display:flex;align-items:center;gap:6px;border-top:1px solid var(--line);padding:6px 8px 6px 12px;background:#0D1620}
.con-ps{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#9EF0E4;white-space:nowrap;flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis}
.con-term.windows .con-ps{color:#fff}
.con-in input{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--ink);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:16px;padding:6px 0}
.con-in button{border:1px solid var(--line-2);border-radius:8px;background:var(--panel-2);color:var(--ink);font-size:12px;font-weight:800;padding:7px 11px}
.con-in button:disabled,.con-in input:disabled{opacity:.5}
.con-checks{background:var(--panel);border-radius:12px;padding:10px 12px;margin-bottom:10px;font-size:13.5px;line-height:1.6}
.con-checks .ok{color:var(--green)}.con-checks .bad{color:var(--red)}
@media(min-width:768px){.con-out{height:380px;font-size:12.5px}}
@media(min-width:1024px){.con-out{height:440px}}
`);
