/* Cert Gauntlet — Azure Fundamentals (AZ-900) pack manifest. See dev/ENGINE.md for every field; content spec in dev/specs/sc200.md §7.
   Skills measured as of Jul 20, 2026: Describe cloud concepts 25–30% · Describe Azure architecture and services 35–40% · Describe Azure management and governance 30–35%.
   Objective ids are three-level (domain.group.bullet) from dev/specs/skills-az900.json. */
export default {
  id: "az900", name: "Azure Fundamentals", short: "AZ-900", code: "AZ-900", color: "#4FA3FF", status: "ready",
  tagline: "Microsoft Azure Fundamentals — sit the week of Nov 2",
  examDateDefault: "2026-11-05",
  blurb: "Warm-up deck for AZ-900: 155 cards and a 50-question Microsoft-style set. The booking gate is Microsoft's free official practice assessment at 85%+.",
  objectivesDoc: "dev/specs/skills-az900.json",
  objPattern: "^[1-3]\\.[1-4]\\.[0-9]{1,2}$",
  validator: "dev/check-sc200.js",

  cats: {
    cloud: { name: "Cloud concepts", color: "#4FA3FF" },
    arch: { name: "Core architecture", color: "#8AA6FF" },
    compute: { name: "Compute & networking", color: "#5EE0D8" },
    storage: { name: "Storage & migration", color: "#7FD1AE" },
    idsec: { name: "Identity, access & security", color: "#B48CFF" },
    cost: { name: "Cost management", color: "#FFD166" },
    govern: { name: "Governance & deployment tools", color: "#F4A261" },
    monitor: { name: "Monitoring", color: "#9DB2CE" },
  },
  sections: [
    { d: 1, name: "Describe cloud concepts", weight: 27.5, decks: ["cloud"] },
    { d: 2, name: "Describe Azure architecture and services", weight: 37.5, decks: ["arch", "compute", "storage", "idsec"] },
    { d: 3, name: "Describe Azure management and governance", weight: 32.5, decks: ["cost", "govern", "monitor"] },
  ],
  domName: { 1: "Cloud concepts", 2: "Architecture & services", 3: "Management & governance" },
  subtitles: {
    cloud: "Models, shared responsibility, benefits, IaaS/PaaS/SaaS", arch: "Regions, zones, resource groups, subscriptions, management groups",
    compute: "VMs, scale sets, containers, functions, VNets, VPN/ExpressRoute", storage: "Blob/Files/Queue/Table, tiers, redundancy, AzCopy, Data Box",
    idsec: "Entra ID, MFA, Conditional Access, RBAC, Zero Trust, Defender for Cloud", cost: "Cost factors, calculators, budgets, tags",
    govern: "Purview, Policy, locks, portal/CLI/PowerShell, Arc, ARM/Bicep", monitor: "Advisor, Service Health, Monitor/Log Analytics/App Insights",
  },

  /* Fundamentals format (verified Oct 2, 2026): 45 min, 700/1000, no Learn pane, no labs. One 50-question set here; Microsoft's practice assessment is the booking gate. */
  exam: {
    count: 50, minutes: 45, pass: 700, scaleMin: 0, scaleMax: 1000,
    pbqFirst: false, backtrack: true, pbqPts: 0, pbqCount: 0,
    gate: { all: 85, dom: 70 }, minMs: 6, minEx: 3,
    mixQuota: { 1: 14, 2: 19, 3: 17 },
    banks: { z: { name: "Practice set", sub: "50 Microsoft-style questions across all three domains." } },
  },
  sprints: [],

  async load() {
    const [c, q] = await Promise.all([import("./cards.js"), import("./questions.js")]);
    return { cards: c.AZ900_CARDS, exq: [], twins: [], lab: [], generators: [], banks: { z: q.AZ900_QUESTIONS }, pbqs: {}, diagrams: {}, acronyms: [], reference: [] };
  },
};
