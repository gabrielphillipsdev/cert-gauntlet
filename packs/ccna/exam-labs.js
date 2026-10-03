/* CCNA — lab-item slots for the three exam banks (Chat 9). The labs themselves are Chat 8's (packs/ccna/labs/).
   Contract with Chat 8 (dev/specs/ccna.md §7): packs/ccna/labs.js exports LABS — PBQ Lab sim items
   {id, type, title, prompt?, task?, topic, d, obj, …} — and registers the sim type(s) they use when imported.
   `topic` is one of the keys used below. Each slot names the topic it wants; the first LABS entry with that topic fills it,
   cloned under an exam id (pa1…pc4) so lab practice and exam attempts keep separate records.
   A slot that cannot be filled leaves its exam without labs; dev/check-pack.mjs FAILs on that (exam.labSlots set). */

export const LAB_TOPICS = {
  vlan: "VLANs + trunking", intervlan: "Inter-VLAN routing (router-on-a-stick / SVI)", static: "Static and default routes",
  ospf: "Single-area OSPF", acl: "Standard / extended ACLs", nat: "NAT / PAT", etherchannel: "EtherChannel (LACP)",
  dhcp: "DHCP server / relay", portsec: "Port security", ssh: "SSH + basic hardening", ipv6: "IPv6 addressing + static routes",
  showread: "Analyze show output (show running-config blocked)",
};

/* 4 slots per exam (the real exam carries 3–4 lab items). Topics spread so the three exams together cover all 12. */
export const LAB_SLOTS = {
  a: [{ topic: "vlan", d: 2, obj: "2.2" }, { topic: "ospf", d: 3, obj: "3.4" }, { topic: "acl", d: 5, obj: "5.6" }, { topic: "ssh", d: 4, obj: "4.8" }],
  b: [{ topic: "intervlan", d: 2, obj: "2.1.c" }, { topic: "static", d: 3, obj: "3.3" }, { topic: "nat", d: 4, obj: "4.1" }, { topic: "portsec", d: 5, obj: "5.7" }],
  c: [{ topic: "etherchannel", d: 2, obj: "2.4" }, { topic: "ipv6", d: 1, obj: "1.8" }, { topic: "dhcp", d: 4, obj: "4.6" }, { topic: "showread", d: 3, obj: "3.1" }],
};

/* Fill the slots from Chat 8's LABS. Returns {a:[…], b:[…], c:[…]}; a bank whose slots cannot all be filled is left out so the
   validator's "every exam has exam.pbqCount PBQs" rule never sees a half-filled exam. */
export function fillLabSlots(labs) {
  const out = {};
  for (const [x, slots] of Object.entries(LAB_SLOTS)) {
    const used = new Set();
    const items = slots.map((s, k) => {
      const lab = (labs || []).find(l => l.topic === s.topic && !used.has(l.id));
      if (!lab) return null;
      used.add(lab.id);
      return { ...lab, id: `p${x}${k + 1}`, src: lab.id, d: lab.d ?? s.d, obj: lab.obj || s.obj };
    });
    if (items.every(Boolean)) out[x] = items;
  }
  return out;
}

/* Chat 8's PBQ Lab content (packs/ccna/labs.js · pbq.js · reader.js). Importing the ui modules registers the sim types
   (ccna-lab, show-reader, ccna-order, diagram). Lab items carry `topic`, so fillLabSlots() can place 4 per exam. */
export const LABS_READY = true;

export async function loadLabs() {
  const [l, p, r] = await Promise.all([
    import("./labs.js"), import("./pbq.js"), import("./reader.js"),
    import("../../core/sims/ios/ui/labItem.js"), import("../../core/sims/ios/ui/showReader.js"),
    import("../../core/sims/ios/ui/configOrder.js"), import("../../core/sims/diagram.js"),
  ]);
  return [...l.LABS, ...p.PBQ_ORDER, ...p.PBQ_TOPO, ...r.READER];
}
