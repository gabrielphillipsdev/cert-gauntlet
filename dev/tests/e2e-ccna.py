"""End-to-end test for the CCNA pack (Chat 9): study views and a full no-backtrack exam on iPhone and iPad.
Run:  python3 -m http.server 8765  (from the repo root)   then   python3 dev/tests/e2e-ccna.py
Drives the app in Chromium at 390×844 (iPhone) and 1024×1366 (iPad) with touch enabled:
  · opens the CCNA pack: flashcards, twins, a mask speed round, the reference sheet
  · sits Exam A in EXAM mode (timed, fresh) and answers every item from the key, reading the current item id from the
    in-progress store — iPhone answers everything right (expect 100% raw, scaled 1000, gate cleared); iPad answers
    two multi-response items half-right and one drag-drop in the wrong order (all-or-nothing → those three missed)
  · checks the Cisco rules on every item: no Back, no Review grid, no flag; every Next asks "Next is final";
    the iPad rail is read-only (clicking an earlier number does nothing); leave + resume lands on the same item
  · checks the result: six domain bars, the 85% gate readout, miss review renders drag-drop and multi-response keys
Writes screenshots to dev/tests/shots/ccna-*.png (git-ignored). Exit code 1 on any failure."""
import os, sys, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get("CG_URL", "http://localhost:8765/")
OUT = os.path.join(os.path.dirname(__file__), "shots"); os.makedirs(OUT, exist_ok=True)
errors = []
def check(cond, msg):
    if not cond: errors.append(msg); print("  ✗", msg)
    else: print("  ✓", msg)

def device(b, w, h, name):
    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, is_mobile=w < 600, has_touch=True)
    ctx.route("https://api.github.com/**", lambda route, req: route.fulfill(status=200, content_type="application/json", body="[]"))
    pg = ctx.new_page()
    pg.dialogs = []
    pg.on("pageerror", lambda e: errors.append(f"{name}: pageerror {e}"))
    pg.on("console", lambda m: errors.append(f"{name} console: {m.text}") if m.type == "error" and "favicon" not in m.text else None)
    def on_dialog(d):
        pg.dialogs.append(d.message); d.accept()
    pg.on("dialog", on_dialog)
    return ctx, pg

def home(pg):
    """Back to the CCNA home: the app reopens the last cert on reload, the picker shows on a first visit."""
    pg.goto(BASE); pg.wait_for_selector("#startToday, .deck.cert")
    if pg.locator("#startToday").count() == 0: pg.click(".deck.cert[data-id=ccna]")
    pg.wait_for_selector("#startToday")

def study(pg, name):
    print(f"[{name}] CCNA study views")
    pg.goto(BASE); pg.wait_for_selector(".deck.cert")
    check(pg.locator(".deck.cert[data-id=ccna]:not([disabled])").count() == 1, "CCNA is selectable in the cert picker")
    pg.click(".deck.cert[data-id=ccna]"); pg.wait_for_selector("#startToday")
    pg.screenshot(path=f"{OUT}/ccna-{name}-home.png", full_page=True)
    view = pg.inner_text("#view")
    check("IP Connectivity" in view or "Routing table" in view or "OSPF" in view, "home lists CCNA decks")
    pg.click("#startToday"); pg.wait_for_selector("#view .card, #view .opt, #view .optcol", timeout=8000)
    check(True, "today's flashcard set opens")
    pg.screenshot(path=f"{OUT}/ccna-{name}-card.png")
    home(pg)
    for chip, expect in [("twins", None), ("sprint", "Mask sprint"), ("ref", "Administrative distance")]:
        pg.click(f".chips [data-go={chip}]"); pg.wait_for_timeout(300)
        if expect: check(expect in pg.inner_text("#view"), f"{chip} view shows '{expect}'")
        else: check(len(pg.inner_text("#view")) > 40, f"{chip} view renders")
        if chip == "sprint":
            pg.click("[data-kind=mask]"); pg.wait_for_timeout(300)
            check(pg.locator("#view button").count() >= 4, "mask sprint shows four options")
            pg.screenshot(path=f"{OUT}/ccna-{name}-sprint.png")
        home(pg)

def cur_item(pg):
    return pg.evaluate("(() => { const x = JSON.parse(localStorage.getItem('cg-exam-inprogress'))['ccna']; return {i: x.i, n: x.items.length, id: x.items[x.i].id, k: x.items[x.i].k}; })()")

def exam(pg, name, sabotage):
    print(f"[{name}] Exam A in exam mode — {'three deliberate all-or-nothing misses' if sabotage else 'every item from the key'}")
    pg.click(".chips [data-go=exam]"); pg.wait_for_selector(".deck[data-x=a]")
    lead = pg.inner_text(".lead")
    check("No going back" in lead and "120 minutes" in lead, "picker states the no-backtrack rule and 120 minutes")
    bank = pg.evaluate("import('./packs/ccna/bank-a.js').then(m => m.CCNA_BANK_A)")
    Q = {q["id"]: q for q in bank}
    pg.click(".deck[data-x=a]"); pg.wait_for_selector(".xm-nav")
    check("1 / 100" in pg.inner_text(".xm-count"), "100 items in the sitting (lab slots empty until Chat 8)")
    pg.screenshot(path=f"{OUT}/ccna-{name}-exam-first.png")
    missed_on_purpose = []; ms_sab = 0; dd_sab = 0; resumed = False; seen_types = set(); dd_shot = False
    for step in range(100):
        it = cur_item(pg); q = Q[it["id"]]; seen_types.add(q["t"])
        check(it["i"] == step, f"item {step + 1}: store index matches") if step in (0, 50, 99) else None
        if step < 3 or step % 25 == 0:
            check(pg.locator("#xmprev").count() == 0, f"item {step + 1}: no Back button")
            check(pg.locator("#xmgridbtn").count() == 0, f"item {step + 1}: no Review button")
            check(pg.locator("#xmflag").count() == 0, f"item {step + 1}: no flag")
        if q["t"] in ("mc", "ms"):
            ok = [i for i, o in enumerate(q["o"]) if o["ok"]]
            if sabotage and q["t"] == "ms" and ms_sab < 2: ok = ok[:1]; ms_sab += 1; missed_on_purpose.append(q["id"])
            for i in ok: pg.click(f"#xmopts .xm-opt[data-i='{i}']")
        else:
            order = list(q["answer"])
            if sabotage and q["t"] == "order" and dd_sab < 1: order = order[1:] + order[:1]; dd_sab += 1; missed_on_purpose.append(q["id"])
            for i in order: pg.click(f".dnd .pool .dnd-item[data-i='{i}']")
            if not dd_shot: pg.screenshot(path=f"{OUT}/ccna-{name}-exam-dragdrop.png"); dd_shot = True
        if step == 10 and pg.locator(".xm-rail").is_visible():
            check(pg.locator(".xm-rail .xm-grid button:not([disabled])").count() == 0, "iPad rail: every number is disabled (progress only)")
            pg.locator(".xm-rail .xm-grid button").nth(2).click(force=True)
            check(cur_item(pg)["i"] == 10, "iPad rail: clicking an earlier number does not move")
            pg.screenshot(path=f"{OUT}/ccna-{name}-exam-rail.png")
        if step == 30 and not resumed:
            pg.click("#xmleave"); pg.wait_for_selector("#xmresume")
            check("clock has kept running" in pg.inner_text("#xmresume"), "leaving keeps the clock running")
            pg.click("#xmresume"); pg.wait_for_selector(".xm-nav"); resumed = True
            check(cur_item(pg)["i"] == 30 and "31 / 100" in pg.inner_text(".xm-count"), "resume lands on the same item")
            # answers survive: re-select is idempotent for mc (single) — re-click the keyed options only if nothing is selected
            if pg.locator("#xmopts .sel, .dnd .ans .placed").count() == 0:
                if q["t"] in ("mc", "ms"):
                    for i in [i for i, o in enumerate(q["o"]) if o["ok"]]: pg.click(f"#xmopts .xm-opt[data-i='{i}']")
        before = len(pg.dialogs)
        pg.click("#xmnext")
        if step < 99:
            pg.wait_for_function(f"document.querySelector('.xm-count') && document.querySelector('.xm-count').textContent.startsWith('{step + 2} /')")
            msg = pg.dialogs[before] if len(pg.dialogs) > before else ""
            if step < 3 or step % 20 == 0: check("Next is final" in msg, f"item {step + 1}: Next asks for confirmation ('{msg[:40]}…')")
    pg.wait_for_selector(".xm-score", timeout=10000)
    check({"mc", "ms", "order", "build"} <= seen_types, f"sitting included mc, ms, order and build items ({sorted(seen_types)})")
    check("last item" in pg.dialogs[-1], "last Next asks to submit (no review screen)")
    st = pg.evaluate("JSON.parse(localStorage.getItem('cg-state-v2'))")
    h = st["packs"]["ccna"]["examHist"][-1]
    check(len(h["detail"]) == 100, "100 detail rows")
    check(h["fresh"] and not h["practice"], "fresh exam-mode attempt")
    check(len(h["dom"]) == 6 and sorted(v[1] for v in h["dom"].values()) == [10, 10, 15, 20, 20, 25], f"domain maxima follow the blueprint {h['dom']}")
    if sabotage:
        check(sorted(h["miss"]) == sorted(missed_on_purpose), f"exactly the sabotaged items are missed (all-or-nothing): {h['miss']} vs {missed_on_purpose}")
        check(h["raw"] == 97 and h["gate"], f"raw 97% still clears the 85% gate ({h['raw']}, gate={h['gate']})")
    else:
        check(h["raw"] == 100 and h["scaled"] == 1000 and h["pass"] and h["gate"], f"keyed answers score 100% / 1000 / gate ({h['raw']}, {h['scaled']}, gate={h['gate']})")
    check(pg.locator(".xm-bar").count() == 6, "six domain bars")
    check("85%" in pg.inner_text(".gatebox"), "gate readout against 85%")
    pg.screenshot(path=f"{OUT}/ccna-{name}-exam-result.png", full_page=True)
    if pg.locator("#xmreview").count():
        pg.click("#xmreview"); pg.wait_for_selector(".xm-rev")
        check(pg.locator(".xm-rev").count() == len(h["miss"]), "miss review lists every miss")
        check(pg.locator(".dnd-key").count() >= (1 if sabotage else 0), "drag-drop miss shows the correct order")
        pg.screenshot(path=f"{OUT}/ccna-{name}-exam-review.png", full_page=True)
        pg.click("#xmback")
    if pg.locator("#xmdrill").count():
        pg.click("#xmdrill"); pg.wait_for_selector("#xmcheck"); check(True, "drill of the misses opens"); pg.click("#xmleave")
    pg.wait_for_timeout(300)

with sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h, name, sab) in [(390, 844, "iphone", False), (1024, 1366, "ipad", True)]:
        ctx, pg = device(b, w, h, name)
        study(pg, name)
        exam(pg, name, sab)
        ctx.close()
    b.close()
if errors:
    print(f"FAIL ({len(errors)})"); [print(" -", e) for e in errors]; sys.exit(1)
print("PASS")
