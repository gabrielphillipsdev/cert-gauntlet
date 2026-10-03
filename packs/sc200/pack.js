/* Cert Gauntlet — Security Operations Analyst (SC-200) pack manifest. See dev/ENGINE.md for every field; content spec in dev/specs/sc200.md.
   Skills measured as of Oct 21, 2026: Manage a security operations environment 40–45% · Respond to security incidents 35–40% · Perform threat hunting 20–25%.
   Objective ids are three-level (domain.group.bullet, e.g. 1.4.3) from dev/specs/skills-sc200.json. */
export default {
  id: "sc200", name: "Security Operations Analyst", short: "SC-200", code: "SC-200", color: "#B48CFF", status: "ready",
  tagline: "Sentinel, Defender XDR, KQL — Nov 9 → sit by Dec 18",
  examDateDefault: "2026-12-18",
  blurb: "SC-200 as Microsoft tests it: Defender XDR, Defender for Endpoint, Sentinel SIEM and data lake, Purview, Entra ID Protection and KQL everywhere. Cards, twins, three Microsoft-format exams (case study first, solution series last, drag-drop, build list, hot area, open-book Learn timer), a KQL Lab with a real interpreter, and the portal-navigation deck.",
  objectivesDoc: "dev/specs/skills-sc200.json",
  objPattern: "^[1-3]\\.[1-4]\\.[0-9]{1,2}$",
  validator: "dev/check-sc200.js",

  cats: {
    xdrauto: { name: "Defender XDR automation", color: "#B48CFF" },
    dfecfg: { name: "Defender for Endpoint config", color: "#8AA6FF" },
    sentauto: { name: "Sentinel automation & playbooks", color: "#5EE0D8" },
    sentplat: { name: "Sentinel platform & retention", color: "#4FA3FF" },
    ingest: { name: "Data ingestion & connectors", color: "#7FD1AE" },
    detect: { name: "Detections & analytics rules", color: "#FFD166" },
    xdrresp: { name: "Respond in Defender XDR", color: "#FF6B5E" },
    dferesp: { name: "Respond in Defender for Endpoint", color: "#FF9BE0" },
    m365inv: { name: "Investigate M365 (Purview, Graph)", color: "#F4A261" },
    kql: { name: "KQL & Advanced Hunting", color: "#43D97B" },
    xdrhunt: { name: "XDR hunting & threat analytics", color: "#9DB2CE" },
    senthunt: { name: "Sentinel hunting, jobs, notebooks", color: "#6EE7B7" },
  },
  sections: [
    { d: 1, name: "Manage a security operations environment", weight: 42.5, decks: ["xdrauto", "dfecfg", "sentauto", "sentplat", "ingest", "detect"] },
    { d: 2, name: "Respond to security incidents", weight: 37.5, decks: ["xdrresp", "dferesp", "m365inv"] },
    { d: 3, name: "Perform threat hunting", weight: 20, decks: ["kql", "xdrhunt", "senthunt"] },
  ],
  domName: { 1: "Manage SecOps env", 2: "Respond", 3: "Hunt" },
  subtitles: {
    xdrauto: "Notifications, alert tuning, AIR levels, attack disruption", dfecfg: "Advanced features, indicators, ASR, device groups, RBAC",
    sentauto: "Automation rules vs playbooks, Logic App triggers, permissions", sentplat: "Roles, Analytics vs Data lake tiers, workbooks, SOC optimization",
    ingest: "AMA + DCR, WEF, Syslog/CEF, Azure Activity, TI, custom tables", detect: "Scheduled vs NRT, custom detections, MITRE coverage, anomalies",
    xdrresp: "DfO365, Purview, DfC, DfCA, Entra ID Protection, DfI, Copilot, cases", dferesp: "Device timeline, live response, packages, isolation",
    m365inv: "Purview Audit, eDiscovery search, Graph activity logs", kql: "Pick the table, read the query, fix the bug",
    xdrhunt: "Threat analytics, hunting graphs, blast radius", senthunt: "Hunts, bookmarks, KQL jobs, summary rules, notebooks + MCP",
  },

  /* Real SC-200 rules (verified Oct 2, 2026 — dev/specs/sc200.md §1): 40–60 items, 100 min, 700/1000 passes, case study first (locked once left),
     solution series last (no backtrack), Learn pane allowed with the clock running. Chat 6 added the Microsoft item types
     (order, build, hot, case, series — core/exam/msitems.js) and the Learn-pane timer (core/exam/learnpane.js); banks are wired below. */
  exam: {
    count: 50, minutes: 100, pass: 700, scaleMin: 0, scaleMax: 1000,
    pbqFirst: false, backtrack: true, pbqPts: 0, pbqCount: 0,
    caseFirst: true, seriesLast: true, learnPane: true, itemTypes: ["mc", "ms", "order", "build", "hot", "case", "series"],
    gate: { all: 80, dom: 70 },
    mixQuota: { 1: 21, 2: 19, 3: 10 },
    minMs: 6, minEx: 8,
    banks: {
      a: { name: "Exam A", sub: "Fabrikam SIEM migration case study · ingestion, detection engineering, Sentinel platform" },
      b: { name: "Exam B", sub: "Incident response heavy · Defender XDR, DfE live response, Purview" },
      c: { name: "Exam C", sub: "Hunting heavy · KQL, advanced hunting, custom detections, Sentinel data lake" },
    },
  },
  sprints: [],

  async load() {
    const [c1, c2, c3, t, p, ba, bb, bc, kd, flat] = await Promise.all([
      import("./cards-d1.js"), import("./cards-d2.js"), import("./cards-d3.js"), import("./twins.js"), import("./portal.js"),
      import("./bank-a.js"), import("./bank-b.js"), import("./bank-c.js"), import("./kql-drills.js"),
      import("../../core/exam/msitems.js"),           /* flattenBank + registers the "hotarea" sim */
      import("../../core/sims/kql/drill.js"),          /* registers the "kql" sim (KQL Lab) */
    ]);
    const domOf = obj => +String(obj).split(".")[0];
    const portal = p.SC200_PORTAL.map(x => ({ ...x, type: "hotarea", title: x.q, d: domOf(x.obj), cat: "portal" }));
    return {
      cards: [...c1.SC200_CARDS_D1, ...c2.SC200_CARDS_D2, ...c3.SC200_CARDS_D3],
      exq: [], twins: t.SC200_TWINS,
      lab: [...kd.SC200_KQL_DRILLS, ...portal],     /* KQL Lab (60 drills) + portal-navigation hot-area deck (60) in the PBQ Lab */
      generators: [],
      banks: { a: flat.flattenBank(ba.SC200_BANK_A), b: flat.flattenBank(bb.SC200_BANK_B), c: flat.flattenBank(bc.SC200_BANK_C) },   /* 50 units → 50 scored questions each: case ×8 + 38 + series ×4 */
      pbqs: {}, diagrams: {}, acronyms: [], reference: [],
      portal: p.SC200_PORTAL,
    };
  },
};
