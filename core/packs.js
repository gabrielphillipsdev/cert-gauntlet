/* Cert Gauntlet — pack registry. A pack is a folder under /packs/<id>/ whose pack.js default-exports a manifest
   (see dev/ENGINE.md). Content is lazy-loaded through manifest.load() the first time the pack is opened. */
export const PACKS = [
  { id: "secplus", path: "../packs/secplus/pack.js" },
  { id: "az900", path: "../packs/az900/pack.js" },
  { id: "sc900", path: "../packs/sc900/pack.js" },
  { id: "sc200", path: "../packs/sc200/pack.js" },
  { id: "ccna", path: "../packs/ccna/pack.js" },
];
const manifests = {};
const contents = {};

export async function listManifests() {
  return Promise.all(PACKS.map(p => manifest(p.id)));
}
export async function manifest(id) {
  if (!manifests[id]) {
    const entry = PACKS.find(p => p.id === id); if (!entry) throw new Error("unknown pack " + id);
    manifests[id] = (await import(entry.path)).default;
  }
  return manifests[id];
}
/* Returns {manifest, content}; content = whatever manifest.load() resolves to, with derived fields filled in. */
export async function openPack(id) {
  const m = await manifest(id);
  if (!contents[id]) {
    const c = await m.load();
    prepare(m, c);
    contents[id] = c;
  }
  return { manifest: m, content: contents[id] };
}
function prepare(m, c) {
  /* stable ids so content edits never scramble progress */
  (c.cards || []).forEach(cd => {
    cd.sid = cd.c + "|" + cd.q + (cd.vq ? "|" + cd.vq : "");
    const lines = cd.a.split("\n");
    const big = lines.find(l => l.startsWith("#"));
    cd.short = (cd.s || (big ? big.slice(1) : lines[0])).trim();
  });
  c.domainOf = cat => { const s = (m.sections || []).find(sec => sec.decks.includes(cat)); return s ? s.d : null; };
}
