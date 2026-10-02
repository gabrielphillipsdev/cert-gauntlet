/* Cert Gauntlet — Security, Compliance & Identity Fundamentals pack (placeholder manifest; content lands in a later chat, see dev/PLAN.md). */
export default {
  id: "sc900", name: "Security, Compliance & Identity Fundamentals", short: "SC-900", code: "SC-900", color: "#7FD1AE", status: "soon",
  tagline: "Microsoft SCI Fundamentals — week of Nov 2 (Chat 5 content)", examDateDefault: "2026-11-07",
  blurb: "", cats: {}, sections: [], domName: {},
  exam: { count: 0, minutes: 0, pass: 0, scaleMin: 0, scaleMax: 0, pbqFirst: false, backtrack: true, pbqPts: 0, gate: { all: 85, dom: 70 }, mixQuota: {}, banks: {} },
  async load() { return { cards: [], exq: [], twins: [], lab: [], generators: [], banks: {}, pbqs: {}, diagrams: {}, acronyms: [], reference: [] }; },
};
