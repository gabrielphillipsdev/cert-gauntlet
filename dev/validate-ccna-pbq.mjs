/* Validator for CCNA config-order + topology-label PBQs (Chat 8). Run: node dev/validate-ccna-pbq.mjs
   Counts (≥10 each), unique ids/titles, v1.1 objective tags with matching d, order items: 3–9 steps, device type known, task ≥2;
   diagram items: ≥3 slots, every slot has a key that is in the palette, labels used once unless reuse, every palette label is used
   by some slot, nodes/slots inside the viewBox, link ids exist. Simulator proofs live in dev/tests/ccna-pbq.test.mjs. */
import { pathToFileURL } from "node:url";
import path from "node:path";
const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const { PBQ_ORDER, PBQ_TOPO } = await import(pathToFileURL(path.join(root, "packs/ccna/pbq.js")));
const OBJ = /^[1-6]\.\d{1,2}(\.[a-z])?$/; const problems = []; const bad = m => problems.push(m);
if (PBQ_ORDER.length < 10) bad(`${PBQ_ORDER.length} config-order items (<10)`); if (PBQ_TOPO.length < 10) bad(`${PBQ_TOPO.length} topology items (<10)`);
const ids = new Set(), titles = new Set();
for (const it of [...PBQ_ORDER, ...PBQ_TOPO]) {
  if (ids.has(it.id)) bad("duplicate id " + it.id); ids.add(it.id); if (titles.has(it.title)) bad("duplicate title " + it.title); titles.add(it.title);
  if (!OBJ.test(it.obj) || it.d !== +it.obj[0]) bad(`${it.id} obj/d`); if (!it.why || !it.prompt) bad(`${it.id} needs prompt and why`);
  if (!Array.isArray(it.task) || it.task.length < 2) bad(`${it.id} needs task:[≥2]`);
}
for (const it of PBQ_ORDER) { if (it.type !== "ccna-order") bad(`${it.id} type`); if (!["router", "switch", "l3switch"].includes(it.device)) bad(`${it.id} device`); if (it.steps.length < 3 || it.steps.length > 9) bad(`${it.id} 3–9 steps`); }
for (const it of PBQ_TOPO) {
  if (it.type !== "diagram") bad(`${it.id} type`); if (it.slots.length < 3) bad(`${it.id} <3 slots`);
  const W = it.w || 480, H = it.h || 300; const nid = new Set([...it.nodes.map(n => n.id), ...it.slots.map(s => s.id)]);
  it.links.forEach(([a, b]) => { if (!nid.has(a) || !nid.has(b)) bad(`${it.id} link ${a}-${b}`); });
  [...it.nodes, ...it.slots].forEach(n => { if (n.x < 0 || n.x > W || n.y < 0 || n.y > H) bad(`${it.id} ${n.id} outside viewBox`); });
  it.slots.forEach(s => { if (!s.want || !it.palette.includes(s.want)) bad(`${it.id} slot ${s.id} key ${s.want} not in palette`); });
  const wants = it.slots.map(s => s.want); if (!it.reuse && new Set(wants).size !== wants.length) bad(`${it.id} label reused without reuse:true`);
  it.palette.forEach(p => { if (!wants.includes(p)) bad(`${it.id} palette label ${p} is never correct`); });
}
console.log(`ccna pbq: ${PBQ_ORDER.length} config-order · ${PBQ_TOPO.length} topology`);
if (problems.length) { console.log(problems.map(p => "FAIL " + p).join("\n")); process.exit(1); } else console.log("PASS");
