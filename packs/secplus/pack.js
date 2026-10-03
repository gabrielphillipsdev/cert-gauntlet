/* Cert Gauntlet — Security+ SY0-701 pack manifest. See dev/ENGINE.md for every field. */
export default {
  id: "secplus",
  name: "Security+",
  short: "Sec+",
  code: "SY0-701",
  color: "#FFB454",
  status: "ready",
  tagline: "CompTIA Security+ — sit by Oct 30, 2026 (701 retires Jun 2027)",
  examDateDefault: "2026-10-30",
  blurb: "Security+ SY0-701. Cards climb from multiple choice to full recall, and mastered cards come back on a spaced schedule so nothing fades before exam day.",
  objectivesDoc: "dev/specs/secplus-objectives.md",

  cats: {
    controls: { name: "Controls & Concepts", color: "#8AA6FF" },
    crypto: { name: "Cryptography & PKI", color: "#5EE0D8" },
    ports: { name: "Secure Ports & Protocols", color: "#4FA3FF" },
    actors: { name: "Threat Actors & Vectors", color: "#FF9BE0" },
    social: { name: "Social Engineering", color: "#FFD166" },
    attacks: { name: "Attacks, Malware & Indicators", color: "#FF6B5E" },
    vulns: { name: "Vulnerabilities & Mitigations", color: "#F4A261" },
    arch: { name: "Architecture & Cloud", color: "#7FD1AE" },
    netsec: { name: "Secure Network Design", color: "#C9B8FF" },
    data: { name: "Data Protection & Resilience", color: "#F2B8C6" },
    harden: { name: "Hardening & Endpoints", color: "#43D97B" },
    iam: { name: "Identity & Access", color: "#B48CFF" },
    ops: { name: "Monitoring & Vuln Mgmt", color: "#9DB2CE" },
    ir: { name: "Incident Response & Forensics", color: "#FF8093" },
    gov: { name: "Governance, Risk & Compliance", color: "#6EE7B7" },
    third: { name: "Third Party, Audits & Awareness", color: "#FFB454" },
  },
  sections: [
    { d: 1, name: "General Security Concepts", weight: 12, decks: ["controls", "crypto", "ports"] },
    { d: 2, name: "Threats, Vulnerabilities & Mitigations", weight: 22, decks: ["actors", "social", "attacks", "vulns"] },
    { d: 3, name: "Security Architecture", weight: 18, decks: ["arch", "netsec", "data"] },
    { d: 4, name: "Security Operations", weight: 28, decks: ["harden", "iam", "ops", "ir"] },
    { d: 5, name: "Program Management & Oversight", weight: 20, decks: ["gov", "third"] },
  ],
  domName: { 1: "General Concepts", 2: "Threats & Vulns", 3: "Architecture", 4: "Operations", 5: "Program Mgmt" },
  subtitles: {
    controls: "CIA, control matrix, zero trust, change mgmt", crypto: "Symmetric vs asymmetric, hashing, PKI, revocation", ports: "The free points — make them automatic",
    actors: "Who attacks, why, and through what vector", social: "Phishing family, pretexting, impersonation", attacks: "Malware, network, app, crypto, password attacks + indicators", vulns: "Vuln types and the mitigation that fits",
    arch: "Cloud models, IaC, containers, IoT/ICS", netsec: "Zones, firewalls, VPN, NAC, SASE", data: "States, classification, backups, sites, RTO/RPO",
    harden: "Baselines, mobile, wireless, app security", iam: "SSO protocols, MFA, access models, PAM", ops: "SIEM, scanning, CVSS, automation. Biggest domain: 28%", ir: "IR order, forensics, chain of custody",
    gov: "Policies, risk math, privacy roles", third: "Agreements, audits, pen tests, awareness",
  },

  /* Real SY0-701 rules (verified Oct 2026): ≤90 items, 90 min, 100–900 scaled, 750 passes, PBQs first, every item revisitable, no pause. */
  exam: {
    count: 90, minutes: 90, pass: 750, scaleMin: 100, scaleMax: 900,
    pbqFirst: true, backtrack: true, pbqPts: 3, pbqCount: 5,
    pbqMust: ["console", "fweditor"],   // every exam needs one of each; the validator WARNs until Chat 2 registers the types, then FAILs
    gate: { all: 80, dom: 70 },
    mixQuota: { 1: 10, 2: 19, 3: 15, 4: 24, 5: 17 },
    banks: {
      a: { name: "Exam A", sub: "Hospital, software company, school district. Log and exhibit heavy." },
      b: { name: "Exam B", sub: "Finance, plant OT, cloud startup. Architecture, data, vendors." },
      c: { name: "Exam C", sub: "MSP, city government, remote firm. Operations and governance." },
    },
  },
  sprints: ["ports", "acro", "risk"],

  async load() {
    /* Sim components this pack uses beyond the core set (basic + generators) are loaded with the content so core/app.js stays untouched. */
    const [c1, c2, c3, x, t, l, s, a, b, c, p, e] = await Promise.all([
      import("./cards-d12.js"), import("./cards-d34.js"), import("./cards-d45.js"), import("./exq.js"), import("./twins.js"), import("./lab.js"), import("./sims.js"),
      import("./bank-a.js"), import("./bank-b.js"), import("./bank-c.js"), import("./pbqs.js"), import("./extras.js"),
      import("../../core/sims/diagram.js"), import("../../core/sims/appanel.js"), import("../../core/sims/hardening.js"),
    ]);
    return {
      cards: [...c1.CARDS_D12, ...c2.CARDS_D34, ...c3.CARDS_D45],
      exq: x.EXQ, twins: t.TWINS, lab: [...s.LAB_SIMS, ...l.LAB_PBQS],
      generators: [
        { id: "g-hashid", type: "hashid", obj: "1.4", title: "Identify the hash", prompt: "Read the digest, name the algorithm, give its bit length. Every attempt is a brand-new digest.", task: ["Count the characters and note the encoding (hex or Base64).", "Pick the algorithm that produces a digest of that length.", "Enter the digest length in bits."] },
        { id: "g-fwrule", type: "fwrule", obj: "4.5", title: "Firewall rule evaluation", prompt: "Walk the rule table top-down for the packet shown. Every attempt is a new table.", task: ["Compare the packet's source, destination and port against each rule from the top.", "Stop at the first rule where all three match; that rule's action applies.", "If nothing matches, the implicit deny at the bottom applies."] },
        { id: "g-risk", type: "risk", obj: "5.2", title: "Risk math: SLE, ALE, cost-benefit", prompt: "Compute the loss figures and decide whether the control is worth buying. Every attempt uses new numbers.", task: ["SLE = asset value × exposure factor.", "ALE = SLE × ARO (events per year).", "The control is justified when the ALE it removes exceeds its annual cost. Use the calculator in this pane."] },
      ],
      banks: { a: a.EXAM_BANK_A, b: b.EXAM_BANK_B, c: c.EXAM_BANK_C },
      pbqs: p.EXAM_PBQS,
      diagrams: e.DIAGRAMS, acronyms: e.ACRONYMS, reference: e.REFERENCE,
    };
  },
};
