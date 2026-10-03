/* CCNA speed rounds (Chat 9). Format: dev/ENGINE.md → manifest.sprints [{kind, name, color, wide?, make(content) => {q, ans, opts}}].
   Masks are generated; AD, ports and syslog levels are drawn from the fixed tables below. */
import { pick, shuffle } from "../../core/util.js";

const dotted = n => { const m = n === 0 ? 0 : (0xFFFFFFFF << (32 - n)) >>> 0; return [24, 16, 8, 0].map(s => (m >>> s) & 255).join("."); };
const hosts = n => n >= 31 ? (n === 31 ? 2 : 1) : 2 ** (32 - n) - 2;
const wild = n => dotted(n).split(".").map(o => 255 - +o).join(".");
const opts4 = (ans, pool) => shuffle([ans, ...shuffle([...new Set(pool.filter(x => x !== ans))]).slice(0, 3)]);

export const AD = [["Connected", "0"], ["Static route", "1"], ["eBGP", "20"], ["EIGRP (internal)", "90"], ["OSPF", "110"], ["IS-IS", "115"], ["RIP", "120"], ["EIGRP external", "170"], ["iBGP", "200"]];
export const PORTS = [["SSH", "TCP 22"], ["Telnet", "TCP 23"], ["DNS", "UDP 53"], ["DHCP server", "UDP 67"], ["DHCP client", "UDP 68"], ["TFTP", "UDP 69"], ["HTTP", "TCP 80"],
  ["HTTPS", "TCP 443"], ["NTP", "UDP 123"], ["SNMP agent", "UDP 161"], ["SNMP traps", "UDP 162"], ["Syslog", "UDP 514"], ["TACACS+", "TCP 49"], ["RADIUS auth", "UDP 1812"],
  ["FTP control", "TCP 21"], ["SMTP", "TCP 25"], ["CAPWAP control", "UDP 5246"], ["NETCONF over SSH", "TCP 830"]];
export const SYSLOG = ["emergencies", "alerts", "critical", "errors", "warnings", "notifications", "informational", "debugging"];

export const SPRINTS = [
  { kind: "mask", name: "Mask sprint · /n ↔ dotted ↔ hosts ↔ wildcard", color: "#FF8093", wide: true, make() {
    const n = 10 + Math.floor(Math.random() * 19);   /* /10–/28 so there are always four near neighbours for distractors */ const near = [n - 2, n - 1, n + 1, n + 2].filter(x => x >= 8 && x <= 30);
    const k = pick(["dot", "cidr", "hosts", "wild"]);
    if (k === "dot") return { q: `/${n} as a dotted mask?`, ans: dotted(n), opts: opts4(dotted(n), near.map(dotted)) };
    if (k === "cidr") return { q: `${dotted(n)} = /?`, ans: "/" + n, opts: opts4("/" + n, near.map(x => "/" + x)) };
    if (k === "hosts") return { q: `Usable hosts in a /${n}?`, ans: hosts(n).toLocaleString(), opts: opts4(hosts(n).toLocaleString(), [2 ** (32 - n), ...near.map(hosts)].map(x => x.toLocaleString())) };
    return { q: `Wildcard for a /${n}?`, ans: wild(n), opts: opts4(wild(n), [dotted(n), ...near.map(wild)]) };
  } },
  { kind: "ad", name: "Administrative distance sprint", color: "var(--amber)", make() {
    const [src, ad] = pick(AD); return { q: `Default AD: ${src}?`, ans: ad, opts: opts4(ad, AD.map(x => x[1])) };
  } },
  { kind: "port", name: "Port sprint", color: "var(--panel-2)", ink: true, make() {
    const [p, n] = pick(PORTS); return { q: p, ans: n, opts: opts4(n, PORTS.map(x => x[1]).filter(x => x.split(" ")[0] === n.split(" ")[0]).concat(PORTS.map(x => x[1]))) };
  } },
  { kind: "syslog", name: "Syslog severity sprint", color: "var(--green)", ink: true, make() {
    const i = Math.floor(Math.random() * 8);
    return Math.random() < .5 ? { q: `Severity ${i}?`, ans: SYSLOG[i], opts: opts4(SYSLOG[i], SYSLOG) } : { q: `"${SYSLOG[i]}" = level?`, ans: String(i), opts: opts4(String(i), SYSLOG.map((_, k) => String(k))) };
  } },
  "acro",
];
