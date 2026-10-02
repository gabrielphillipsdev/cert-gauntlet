/* Cert Gauntlet — Cisco CCNA pack (placeholder manifest; content lands in a later chat, see dev/PLAN.md). */
export default {
  id: "ccna", name: "Cisco CCNA", short: "CCNA", code: "200-301 v1.1", color: "#FF8093", status: "soon",
  tagline: "Subnetting, IOS CLI labs, exam — sit by Jan 25, 2027 (Chats 4, 7–9)", examDateDefault: "2027-01-25",
  blurb: "", cats: {}, sections: [], domName: {},
  exam: { count: 0, minutes: 0, pass: 0, scaleMin: 0, scaleMax: 0, pbqFirst: false, backtrack: true, pbqPts: 0, gate: { all: 85, dom: 70 }, mixQuota: {}, banks: {} },
  async load() { return { cards: [], exq: [], twins: [], lab: [], generators: [], banks: {}, pbqs: {}, diagrams: {}, acronyms: [], reference: [] }; },
};
