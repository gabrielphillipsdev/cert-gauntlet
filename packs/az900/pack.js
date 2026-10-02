/* Cert Gauntlet — Azure Fundamentals pack (placeholder manifest; content lands in a later chat, see dev/PLAN.md). */
export default {
  id: "az900", name: "Azure Fundamentals", short: "AZ-900", code: "AZ-900", color: "#4FA3FF", status: "soon",
  tagline: "Microsoft Azure Fundamentals — week of Nov 2 (Chat 5 content)", examDateDefault: "2026-11-05",
  blurb: "", cats: {}, sections: [], domName: {},
  exam: { count: 0, minutes: 0, pass: 0, scaleMin: 0, scaleMax: 0, pbqFirst: false, backtrack: true, pbqPts: 0, gate: { all: 85, dom: 70 }, mixQuota: {}, banks: {} },
  async load() { return { cards: [], exq: [], twins: [], lab: [], generators: [], banks: {}, pbqs: {}, diagrams: {}, acronyms: [], reference: [] }; },
};
