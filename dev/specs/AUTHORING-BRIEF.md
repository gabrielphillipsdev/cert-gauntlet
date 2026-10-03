# Authoring brief for Chat 5 content agents

Repo: `/home/claude/cert-gauntlet` (branch `chat-5/sc200-content`). Read first:
- `dev/specs/sc200.md` — the schema you are writing to (card §3, twins §4, portal §5, banks §6, fundamentals §7).
- `dev/specs/skills-sc200.json` (or `skills-az900.json` / `skills-sc900.json`) — the ONLY valid `obj` ids and category keys. Bullet text is the exam's own wording of what is testable.
- Style reference for voice and density: `/home/claude/sec-study/cards-d12.js` (first 40 lines), `/home/claude/sec-study/twins.js` (first 20 lines), `/home/claude/sec-study/bank-a.js` (first 60 lines). Do NOT reuse any of their text.

Hard rules
1. **All text original.** No sentences from Microsoft Learn, practice exams, or the sec-study files. Facts yes, sentences no.
2. **Facts must be current (Oct 2026) and verifiable on Microsoft Learn.** Before stating a specific name/number (role name, table name, retention default, rule frequency limit, ASR rule name, live response command, portal menu label, Logic App trigger name, tier name), verify with WebFetch against the relevant learn.microsoft.com page. If you can't verify, write a different item. Keep a short list of the URLs you used and return it at the end.
3. **Every item tagged** with `obj` (one of the ids in the skills JSON; the primary id's domain must match the item's `d` / category).
4. **Validator must print PASS** for your file(s): `node dev/check-sc200.js <what>` from the repo root. Iterate until it does. Length limits that print WARN are advisory but keep them under control (≤ 10 warnings per file).
5. Escape `"` inside strings or use single quotes in prose; no HTML; `\n` only where the schema allows.
6. No product-vs-product marketing claims; neutral SOC-analyst voice. Microsoft exam voice for questions: "You have a Microsoft Sentinel workspace…", "You need to…", "What should you do?", "Which two actions should you perform? Each correct answer presents part of the solution.", "Solution: … Does this meet the goal?"
7. Write the file in chunks (Write the first ~40 items, then append with Edit) so a crash doesn't lose everything, and run the validator after each chunk.
8. Use Microsoft's fictional names (Fabrikam, Northwind, Tailspin, Woodgrove, Litware, Contoso) and RFC 5737 addresses.
9. Do not touch any file other than the ones assigned to you.

Return: the file path(s) written, final validator output, the item count, and the list of Learn URLs you verified against.
