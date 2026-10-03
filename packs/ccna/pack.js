/* Cert Gauntlet — Cisco CCNA 200-301 v1.1 pack manifest. See dev/ENGINE.md for every field.
   Chat 8 added: domains/weights, the v1.1 objective-id pattern, and the PBQ Lab content — 13 IOS lab items (ccna-lab),
   40 show-output reader items (show-reader), 10 config-order (ccna-order) and 10 topology-label (diagram) PBQs.
   Chat 9 adds cards, twins, exam banks, exam rules and flips status to "ready". Until then the pack is "soon" in the picker;
   preview everything at dev/pages/ccna-lab.html. */
export default {
  id: "ccna", name: "Cisco CCNA", short: "CCNA", code: "200-301 v1.1", color: "#FF8093", status: "soon",
  tagline: "Subnetting, IOS CLI labs, exam — sit by Jan 25, 2027 (Chats 4, 7–9)", examDateDefault: "2027-01-25",
  blurb: "", objectivesDoc: "https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf",
  objPattern: "^[1-6]\\.\\d{1,2}(\\.[a-z])?$",   /* 200-301 v1.1 topic numbers: 2.1, 3.3.d */
  cats: {},
  /* blueprint weights from the v1.1 exam topics PDF (fetched 2026-10-03); Chat 9 attaches decks */
  sections: [
    { d: 1, name: "Network Fundamentals", weight: 20, decks: [] },
    { d: 2, name: "Network Access", weight: 20, decks: [] },
    { d: 3, name: "IP Connectivity", weight: 25, decks: [] },
    { d: 4, name: "IP Services", weight: 10, decks: [] },
    { d: 5, name: "Security Fundamentals", weight: 15, decks: [] },
    { d: 6, name: "Automation & Programmability", weight: 10, decks: [] },
  ],
  domName: { 1: "Fundamentals", 2: "Access", 3: "IP Connectivity", 4: "IP Services", 5: "Security", 6: "Automation" },
  exam: { count: 0, minutes: 0, pass: 0, scaleMin: 0, scaleMax: 0, pbqFirst: false, backtrack: false, pbqPts: 0, gate: { all: 85, dom: 70 }, mixQuota: {}, banks: {} },
  async load() {
    const [l, r, p] = await Promise.all([
      import("./labs.js"), import("./reader.js"), import("./pbq.js"),
      import("../../core/sims/ios/ui/labItem.js"), import("../../core/sims/ios/ui/showReader.js"), import("../../core/sims/ios/ui/configOrder.js"), import("../../core/sims/diagram.js"),
    ]);
    return { cards: [], exq: [], twins: [], lab: [...l.LABS, ...p.PBQ_ORDER, ...p.PBQ_TOPO, ...r.READER], generators: [], banks: {}, pbqs: {}, diagrams: {}, acronyms: [], reference: [] };
  },
};
