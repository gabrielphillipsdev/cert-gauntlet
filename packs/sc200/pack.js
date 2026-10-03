/* Cert Gauntlet — Security Operations Analyst (SC-200) pack manifest. See dev/ENGINE.md for every field; content spec in dev/specs/sc200.md.
   Skills measured as of Oct 21, 2026: Manage a security operations environment 40–45% · Respond to security incidents 35–40% · Perform threat hunting 20–25%.
   Objective ids are three-level (domain.group.bullet, e.g. 1.4.3) from dev/specs/skills-sc200.json. */
export default {
  id: "sc200", name: "Security Operations Analyst", short: "SC-200", code: "SC-200", color: "#B48CFF", status: "ready",
  tagline: "Sentinel, Defender XDR, KQL — Nov 9 → sit by Dec 18",
  examDateDefault: "2026-12-18",
  blurb: "SC-200 as Microsoft tests it: Defender XDR, Defender for Endpoint, Sentinel SIEM and data lake, Purview, Entra ID Protection and KQL everywhere. Cards and twins are live now; the Microsoft-format exam (case study, solution series, drag-drop, build list, hot area) lands with Chat 6.",
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
     solution series last (no backtrack), Learn pane allowed with the clock running. The engine's runner handles mc/ms today; the Microsoft item types
     (order, build, hot, case, series) and the Learn-pane timer are Chat 6. Banks stay out of load() until then so the current runner never meets them. */
  exam: {
    count: 50, minutes: 100, pass: 700, scaleMin: 0, scaleMax: 1000,
    pbqFirst: false, backtrack: true, pbqPts: 0, pbqCount: 0,
    caseFirst: true, seriesLast: true, learnPane: true, itemTypes: ["mc", "ms", "order", "build", "hot", "case", "series"],
    gate: { all: 80, dom: 70 },
    mixQuota: { 1: 21, 2: 19, 3: 10 },
    banks: {},   /* Chat 6: a/b/c from bank-a.js, bank-b.js, bank-c.js (SC200_BANK_A/B/C) once the runner supports the item types above */
  },
  sprints: [],

  async load() {
    const [c1, c2, c3, t, p] = await Promise.all([
      import("./cards-d1.js"), import("./cards-d2.js"), import("./cards-d3.js"), import("./twins.js"), import("./portal.js"),
    ]);
    return {
      cards: [...c1.SC200_CARDS_D1, ...c2.SC200_CARDS_D2, ...c3.SC200_CARDS_D3],
      exq: [], twins: t.SC200_TWINS, lab: [], generators: [],
      banks: {}, pbqs: {}, diagrams: {}, acronyms: [], reference: [],
      portal: p.SC200_PORTAL,   /* 60 "where do you…" hot-area items; rendered by Chat 6's hot-area component (img:null until screenshots) */
    };
  },
};
