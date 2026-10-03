/* Cert Gauntlet — Security, Compliance & Identity Fundamentals (SC-900) pack manifest. See dev/ENGINE.md; content spec in dev/specs/sc200.md §7.
   Skills measured as of Oct 21, 2026: SCI concepts 10–15% · Microsoft Entra 25–30% · Microsoft security solutions 35–40% · Microsoft compliance solutions 20–25%.
   Objective ids are three-level (domain.group.bullet) from dev/specs/skills-sc900.json. */
export default {
  id: "sc900", name: "Security, Compliance & Identity Fundamentals", short: "SC-900", code: "SC-900", color: "#7FD1AE", status: "ready",
  tagline: "Microsoft SCI Fundamentals — sit the week of Nov 2",
  examDateDefault: "2026-11-07",
  blurb: "Warm-up deck for SC-900: 155 cards and a 50-question Microsoft-style set covering Entra, Defender, Sentinel and Purview. Booking gate is Microsoft's free practice assessment at 85%+.",
  objectivesDoc: "dev/specs/skills-sc900.json",
  objPattern: "^[1-4]\\.[1-4]\\.[0-9]{1,2}$",
  validator: "dev/check-sc200.js",

  cats: {
    concepts: { name: "Security & identity concepts", color: "#8AA6FF" },
    entra: { name: "Microsoft Entra", color: "#B48CFF" },
    entragov: { name: "Entra governance & protection", color: "#C9B8FF" },
    aznet: { name: "Azure infrastructure security", color: "#4FA3FF" },
    dfc: { name: "Defender for Cloud & Sentinel", color: "#5EE0D8" },
    xdr: { name: "Defender XDR", color: "#FF6B5E" },
    purview: { name: "Purview compliance & data", color: "#7FD1AE" },
    risk: { name: "Insider risk, eDiscovery, audit", color: "#FFD166" },
  },
  sections: [
    { d: 1, name: "Describe the concepts of security, compliance, and identity", weight: 12.5, decks: ["concepts"] },
    { d: 2, name: "Describe the capabilities of Microsoft Entra", weight: 27.5, decks: ["entra", "entragov"] },
    { d: 3, name: "Describe the capabilities of Microsoft security solutions", weight: 37.5, decks: ["aznet", "dfc", "xdr"] },
    { d: 4, name: "Describe the capabilities of Microsoft compliance solutions", weight: 22.5, decks: ["purview", "risk"] },
  ],
  domName: { 1: "Concepts", 2: "Entra", 3: "Security solutions", 4: "Compliance" },
  subtitles: {
    concepts: "Shared responsibility, defense in depth, Zero Trust, authN vs authZ", entra: "Identity types, hybrid identity, auth methods, Conditional Access, roles",
    entragov: "ID Governance, access reviews, PIM, ID Protection", aznet: "DDoS, Firewall, WAF, NSGs, Bastion, Key Vault",
    dfc: "Defender for Cloud, CSPM/CWP, Sentinel SIEM + SOAR", xdr: "DfO365, DfE, DfCA, DfI, Vulnerability Management, portal",
    purview: "Service Trust Portal, Compliance Manager, labels, DLP, retention", risk: "Insider risk, eDiscovery, Audit",
  },

  /* Fundamentals format (verified Oct 2, 2026): 45 min, 700/1000, no Learn pane. One 50-question set here; Microsoft's practice assessment is the booking gate. */
  exam: {
    count: 50, minutes: 45, pass: 700, scaleMin: 0, scaleMax: 1000,
    pbqFirst: false, backtrack: true, pbqPts: 0, pbqCount: 0,
    gate: { all: 85, dom: 70 }, minMs: 6, minEx: 3,
    mixQuota: { 1: 6, 2: 14, 3: 19, 4: 11 },
    banks: { s: { name: "Practice set", sub: "50 Microsoft-style questions across all four domains." } },
  },
  sprints: [],

  async load() {
    const [c, q] = await Promise.all([import("./cards.js"), import("./questions.js")]);
    return { cards: c.SC900_CARDS, exq: [], twins: [], lab: [], generators: [], banks: { s: q.SC900_QUESTIONS }, pbqs: {}, diagrams: {}, acronyms: [], reference: [] };
  },
};
