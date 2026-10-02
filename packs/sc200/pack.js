/* Cert Gauntlet — Security Operations Analyst pack (placeholder manifest; content lands in a later chat, see dev/PLAN.md). */
export default {
  id: "sc200", name: "Security Operations Analyst", short: "SC-200", code: "SC-200", color: "#B48CFF", status: "soon",
  tagline: "Sentinel, Defender XDR, KQL — Nov 9 → Dec 18 (Chats 5–6)", examDateDefault: "2026-12-18",
  blurb: "", cats: {}, sections: [], domName: {},
  exam: { count: 0, minutes: 0, pass: 0, scaleMin: 0, scaleMax: 0, pbqFirst: false, backtrack: true, pbqPts: 0, gate: { all: 85, dom: 70 }, mixQuota: {}, banks: {} },
  async load() { return { cards: [], exq: [], twins: [], lab: [], generators: [], banks: {}, pbqs: {}, diagrams: {}, acronyms: [], reference: [] }; },
};
