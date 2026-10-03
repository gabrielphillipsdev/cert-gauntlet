/* Validator for the CCNA show-output reader (Chat 8). Run: node dev/validate-ccna-reader.mjs
   Checks: ≥40 items, ≥3 per show command, schema, unique ids/stems, 4 distinct options, answer in range, v1.1 objective tag,
   blank attempt scores 0 and the key scores 1, and the stored outputs/keys match what the simulator produces today (gen-reader --check). */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
globalThis.document = { createElement: () => ({ addEventListener() { }, appendChild() { }, classList: { add() { } }, style: {} }), addEventListener() { }, body: { appendChild() { } } };
const { READER } = await import(pathToFileURL(path.join(root, "packs/ccna/reader.js")));
const { sim } = await import(pathToFileURL(path.join(root, "core/sims/registry.js")));
await import(pathToFileURL(path.join(root, "core/sims/ios/ui/showReader.js")));
const OBJ = /^[1-6]\.\d{1,2}(\.[a-z])?$/;
const TYPES = ["show ip route", "show ip interface brief", "show spanning-tree", "show vlan brief", "show ip ospf neighbor", "show ip ospf interface", "show interfaces trunk", "show access-lists", "show ip nat translations", "show mac address-table", "show etherchannel summary"];
const problems = []; const bad = m => problems.push(m);
if (READER.length < 40) bad(`only ${READER.length} items (<40)`);
const ids = new Set(), stems = new Set(); const per = Object.fromEntries(TYPES.map(t => [t, 0]));
const S = sim("show-reader");
for (const it of READER) {
  if (ids.has(it.id)) bad("duplicate id " + it.id); ids.add(it.id);
  if (stems.has(it.q)) bad("duplicate stem " + it.id); stems.add(it.q);
  if (it.type !== "show-reader" || !it.title || !it.output || !it.command || !it.q || !it.why) bad(`${it.id} missing fields`);
  if (!OBJ.test(it.obj) || it.d !== +it.obj[0]) bad(`${it.id} bad obj/d ${it.obj}/${it.d}`);
  if (!Array.isArray(it.opts) || it.opts.length !== 4 || new Set(it.opts).size !== 4) bad(`${it.id} needs 4 distinct options`);
  if (!(it.ans >= 0 && it.ans < 4)) bad(`${it.id} ans out of range`);
  const t = TYPES.find(t => it.command.startsWith(t)); if (!t) bad(`${it.id} unknown command ${it.command}`); else per[t]++;
  const st = S.create(it); if (S.score(it, st).f !== 0) bad(`${it.id} blank scores > 0`); st.pick = it.ans; if (S.score(it, st).f !== 1) bad(`${it.id} key does not score 1`);
}
for (const [t, n] of Object.entries(per)) if (n < 3) bad(`${t}: ${n} items (<3)`);
try { execFileSync("node", [path.join(root, "dev/tools/gen-reader.mjs"), "--check"], { stdio: "pipe" }); } catch (e) { bad(String(e.stderr || e.message).trim()); }
console.log(`ccna reader: ${READER.length} items · ` + Object.entries(per).map(([t, n]) => `${t.replace("show ", "")}:${n}`).join(" "));
if (problems.length) { console.log(problems.map(p => "FAIL " + p).join("\n")); process.exit(1); } else console.log("PASS");
