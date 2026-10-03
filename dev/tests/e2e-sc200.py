"""End-to-end test for the SC-200 pack (Chat 6): KQL Lab drills and a full Microsoft-format exam on iPhone and iPad.
Run:  python3 -m http.server 8765  (from the repo root)   then   python3 dev/tests/e2e-sc200.py
Drives the app in Chromium at 390×844 (iPhone) and 1024×1366 (iPad) with touch enabled:
  · opens the SC-200 pack, the PBQ Lab, runs a write-it drill with the reference query (must grade 100%), a fix-it drill, a predict drill
  · starts Exam A in practice mode, answers all 50 questions through the case study → middle → solution series, checks the locks,
    uses the Learn button once, submits, and checks the result record (learn readout, per-domain bars)
Writes screenshots to dev/tests/shots/sc200-*.png (git-ignored). Exit code 1 on any failure."""
import json, os, sys, time, re
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
    ctx.route("https://learn.microsoft.com/**", lambda route, req: route.fulfill(status=200, content_type="text/html", body="<html><body>Learn stub</body></html>"))
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"{name}: pageerror {e}"))
    pg.on("console", lambda m: errors.append(f"{name} console: {m.text}") if m.type == "error" and "favicon" not in m.text else None)
    pg.on("dialog", lambda d: d.accept())
    return ctx, pg

def open_pack(pg):
    pg.goto(BASE); pg.wait_for_selector(".deck.cert")
    pg.click(".deck.cert[data-id=sc200]"); pg.wait_for_selector("#startToday")

def drills(pg, name):
    print(f"[{name}] KQL Lab")
    pg.click(".deck[data-k=lab]"); pg.wait_for_selector(".deck[data-id=k001]")
    n = pg.locator(".deck[data-id]").count(); check(n == 120, f"lab lists 120 items (60 KQL + 60 portal), got {n}")
    # write it: paste the reference query, run, check → 100%
    pg.click(".deck[data-id=k002]"); pg.wait_for_selector(".kq-ed")
    pg.screenshot(path=f"{OUT}/sc200-{name}-kql-write.png")
    pg.fill(".kq-ed", 'SigninLogs | where ResultType == "50126" | summarize Users=dcount(UserPrincipalName), Attempts=count() by IPAddress | where Users > 5')
    pg.click(".kq-run"); pg.wait_for_selector(".kq-tbl")
    check("203.0.113.57" in pg.inner_text(".kq-out"), "write drill: Run shows the spray IP")
    pg.click("#pbqsubmit"); pg.wait_for_selector(".fbscore")
    check(pg.inner_text(".fbscore").strip() == "100%", "write drill graded 100% for an equivalent query")
    pg.screenshot(path=f"{OUT}/sc200-{name}-kql-graded.png")
    # editor-style error
    pg.click("#pbqback"); pg.wait_for_selector(".deck[data-id=k001]")
    pg.click(".deck[data-id=k027]"); pg.wait_for_selector(".kq-ed")
    pg.click(".kq-run"); pg.wait_for_selector(".kq-err")
    check("Cannot compare values of types string and long" in pg.inner_text(".kq-err"), "fix drill: buggy query shows the Kusto-style type error")
    pg.fill(".kq-ed", 'SigninLogs\n| where ResultType != "0"\n| project TimeGenerated, UserPrincipalName, ResultType')
    pg.click("#pbqsubmit"); pg.wait_for_selector(".fbscore")
    check(pg.inner_text(".fbscore").strip() == "100%", "fix drill graded 100%")
    # predict
    pg.click("#pbqback"); pg.wait_for_selector(".deck[data-id=k001]")
    pg.click(".deck[data-id=k045]"); pg.wait_for_selector(".kq-opt")
    check(pg.locator(".kq-opt").count() == 4, "predict drill shows 4 rendered outputs")
    pg.locator(".kq-opt").first.click(); pg.click("#pbqsubmit"); pg.wait_for_selector(".fbscore")
    pg.screenshot(path=f"{OUT}/sc200-{name}-kql-predict.png")
    # portal hot-area item
    pg.click("#pbqback"); pg.wait_for_selector(".deck[data-id=p001]")
    pg.click(".deck[data-id=p001]"); pg.wait_for_selector(".hot-list .xm-opt")
    pg.locator(".hot-list .xm-opt").first.click(); pg.click("#pbqsubmit"); pg.wait_for_selector(".fbscore")
    check(re.match(r"^(0|100)%$", pg.inner_text(".fbscore").strip()) is not None, "portal hot-area item grades")
    pg.click("#pbqback"); pg.click("[data-go=home]"); pg.wait_for_selector("#startToday")

def exam(pg, name):
    print(f"[{name}] Exam A (practice mode so the clock can pause)")
    pg.click(".deck[data-k=exam]"); pg.wait_for_selector(".deck[data-x=a]")
    pg.click(".modebar .pill[data-m=practice]"); pg.click(".deck[data-x=a]")
    pg.wait_for_selector(".xm-nav")
    check(pg.locator(".cs").count() == 1, "opens on the case study with pinned tabs")
    check("1 / 50" in pg.inner_text(".xm-count"), "50 items in the sitting")
    pg.screenshot(path=f"{OUT}/sc200-{name}-exam-case.png")
    # tabs switch
    pg.click(".cs-tabs [data-tab=requirements]"); check("R1." in pg.inner_text(".cs-body"), "Requirements tab shows R1")
    # Learn button: open, wait, done
    check(pg.locator("#xmlearn").count() == 1, "Learn button present")
    with pg.context.expect_page() as popup_info:
        pg.click("#xmlearn")
    popup = popup_info.value; popup.wait_for_load_state()
    pg.wait_for_selector("#xmlearndone"); time.sleep(1.3); pg.click("#xmlearndone")
    check(pg.locator(".learn-note").count() == 1, "lookup time logged on the question")
    popup.close()
    answered = 0
    for step in range(50):
        it_type = pg.evaluate("document.querySelector('.xm-type') ? document.querySelector('.xm-type').textContent : ''")
        # answer whatever is on screen
        if pg.locator(".sr-yn").count():
            pg.click(".sr-yn .xm-opt[data-v='1']")
        elif pg.locator(".dnd").count():
            # move every pool item (order) or the first 3 (build), then nudge one down
            pool = pg.locator(".dnd .pool .dnd-item")
            k = pool.count() if "arrange" in it_type else 3
            for _ in range(k):
                if pg.locator(".dnd .pool .dnd-item").count() == 0: break
                pg.locator(".dnd .pool .dnd-item").first.click()
            if pg.locator(".dnd [data-down='0']").count(): pg.click(".dnd [data-down='0']")
        elif pg.locator(".hot-list").count():
            pg.locator(".hot-list .xm-opt").first.click()
        else:
            opts = pg.locator("#xmopts .xm-opt")
            opts.first.click()
            if "choose" in it_type and opts.count() > 1: opts.nth(1).click()
        answered += 1
        if step == 7:
            check(pg.locator("#xmprev").count() == 1 and pg.locator("#xmprev").is_enabled(), "Back works inside the case study")
            pg.screenshot(path=f"{OUT}/sc200-{name}-exam-build.png")
        if step == 8:
            check(pg.locator(".cs").count() == 0, "left the case study after question 8")
            check(not pg.locator("#xmprev").is_enabled(), "Back into the locked case study is disabled")
            # grid jump back into the case must be refused
            if pg.locator(".xm-rail").is_visible():
                pg.locator(".xm-rail .xm-grid button[data-i='0']").click()
                check("9 / 50" in pg.inner_text(".xm-count"), "rail jump into the locked case study refused")
            else:
                pg.click("#xmgridbtn"); pg.wait_for_selector(".xm-grid.big"); pg.locator(".xm-grid.big button[data-i='0']").click()
                check(pg.locator(".xm-grid.big").count() == 1, "review grid refuses to jump into the locked case study")
                pg.click("#xmback2")
            pg.click("#xmflag"); check(pg.locator("#xmflag.on").count() == 1, "mark-for-review works in the middle section")
            pg.screenshot(path=f"{OUT}/sc200-{name}-exam-mid.png")
        if step == 46:
            check(pg.locator(".sr").count() == 1, "solution series starts at item 47")
            check(pg.locator("#xmprev").count() == 0 and pg.locator("#xmgridbtn").count() == 0 and pg.locator("#xmflag").count() == 0, "series: no Back, no review grid, no flag")
            pg.screenshot(path=f"{OUT}/sc200-{name}-exam-series.png")
        try:
            pg.click("#xmnext", timeout=8000)  # on the last series item this is Finish & submit → confirm → results
        except Exception as e:
            pg.screenshot(path=f"{OUT}/sc200-{name}-stuck-{step}.png", full_page=True)
            print(f"  stuck at step {step}: {pg.inner_text('.xm-count')} type={it_type}"); raise
    pg.wait_for_selector(".xm-score", timeout=10000)
    check(answered == 50, "answered all 50 items")
    txt = pg.inner_text(".xm-score")
    check("to pass" in txt and "700" in txt, "scaled score shown against 700")
    check(pg.locator(".xm-bar").count() == 3, "three domain bars")
    check("Learn lookups" in pg.inner_text("#view"), "post-exam Learn readout present")
    pg.screenshot(path=f"{OUT}/sc200-{name}-exam-result.png", full_page=True)
    st = pg.evaluate("JSON.parse(localStorage.getItem('cg-state-v2'))")
    h = st["packs"]["sc200"]["examHist"][-1]
    check(h["learn"]["n"] == 1 and h["learn"]["secs"] >= 1, f"result record has learn summary {h['learn']}")
    check(len(h["detail"]) == 50, "50 detail rows")
    # review misses renders Microsoft types without errors
    if pg.locator("#xmreview").count(): pg.click("#xmreview"); pg.wait_for_selector(".xm-rev"); pg.click("#xmback")
    pg.click("#xmhome"); pg.wait_for_selector(".deck[data-x=a]")

with sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h, name) in [(390, 844, "iphone"), (1024, 1366, "ipad")]:
        ctx, pg = device(b, w, h, name)
        open_pack(pg)
        drills(pg, name)
        exam(pg, name)
        ctx.close()
    b.close()
if errors:
    print(f"FAIL ({len(errors)})"); [print(" -", e) for e in errors]; sys.exit(1)
print("PASS")
