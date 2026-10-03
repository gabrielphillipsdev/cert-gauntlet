"""Device test for the Chat 2 sims: opens every console / fweditor / logview / drag-drop PBQ Lab item in Chromium at iPhone
(390×844, touch) and iPad (1024×1366, touch) sizes, drives each one with real touch gestures, checks the instructions pane
minimizes, Reset clears, submitting scores, and that nothing throws. Screenshots land in dev/tests/shots/ (git-ignored).

Run:  python3 -m http.server 8765  (from the repo root)   then   python3 dev/tests/sims-e2e.py"""
import os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("CG_URL", "http://localhost:8765/")
OUT = os.path.join(os.path.dirname(__file__), "shots"); os.makedirs(OUT, exist_ok=True)
errors = []

def device(b, w, h, name):
    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, is_mobile=True, has_touch=True)   # Playwright's iPad descriptors are isMobile too
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"{name}: {e}"))
    pg.on("console", lambda m: errors.append(f"{name} console: {m.text}") if m.type == "error" else None)
    pg.on("dialog", lambda d: d.accept())
    return ctx, pg

def swipe(pg, src, dst_xy, steps=12):
    """touch drag: press on src element, move in steps to dst, release"""
    sb = src.bounding_box(); x0, y0 = sb["x"] + sb["width"] / 2, sb["y"] + sb["height"] / 2
    x1, y1 = dst_xy
    cdp = getattr(pg, "_cg_cdp", None)
    if cdp is None: cdp = pg._cg_cdp = pg.context.new_cdp_session(pg)   # one session per page; detaching mid-gesture can leave a finger down
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x0, "y": y0}]})
    for i in range(1, steps + 1):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x0 + (x1 - x0) * i / steps, "y": y0 + (y1 - y0) * i / steps}]})
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    pg.wait_for_timeout(80)

def center(el):
    b = el.bounding_box(); return (b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)

def open_lab_item(pg, item_id):
    pg.goto(BASE); pg.reload(); pg.wait_for_selector(".deck.cert, #startToday", timeout=15000)
    if pg.query_selector(".deck.cert[data-id=secplus]"): pg.click(".deck.cert[data-id=secplus]")
    pg.wait_for_selector("#startToday")
    pg.click("button.deck[data-k=lab]"); pg.wait_for_selector(f".deck[data-id={item_id}]")
    pg.click(f".deck[data-id={item_id}]"); pg.wait_for_selector("#pbqbody .ipane, #pbqbody .mgrid, #pbqbody .olist", timeout=8000)

def pane_toggle(pg):
    btn = pg.query_selector("#pbqbody .ipane .ipane-btn")
    if not btn: return
    btn.tap(); assert pg.query_selector("#pbqbody .ipane.min"), "instructions pane did not minimize"
    btn.tap(); assert not pg.query_selector("#pbqbody .ipane.min"), "instructions pane did not expand"

def submit(pg, shot):
    pg.tap("#pbqsubmit"); pg.wait_for_selector("#pbqfb .fbscore"); pct = pg.inner_text("#pbqfb .fbscore"); pg.screenshot(path=shot, full_page=False); return int(pct.rstrip("%"))

def run_device(b, w, h, name):
    ctx, pg = device(b, w, h, name)
    # ---- incident console ----
    open_lab_item(pg, "c-web-c2"); pane_toggle(pg)
    def cmd(c):
        pg.fill("#pbqbody .con-in input", c); pg.tap("#pbqbody .con-in button"); pg.wait_for_timeout(60)
    cmd("ss -tulpn"); assert "kworkerd" in pg.inner_text("#pbqbody .con-out"), "ss output missing IoC"
    cmd("systemctl stop kworkerd"); cmd("systemctl disable kworkerd"); cmd("ufw deny out to 198.51.100.23")
    pg.tap("#pbqbody .con-tab[data-h=ws-fin07]"); pg.wait_for_selector("#pbqbody .con-term.windows")
    cmd("tasklist"); assert "svchost32.exe" in pg.inner_text("#pbqbody .con-out")
    cmd("taskkill /PID 5124 /F"); cmd("sc config WinUpdSync start= disabled"); cmd('netsh advfirewall firewall add rule name="C2" dir=out action=block remoteip=203.0.113.77')
    pg.screenshot(path=f"{OUT}/{name}-console.png")
    # Reset clears history, then redo one host quickly to check partial credit
    pg.tap("#pbqreset"); pg.wait_for_timeout(100); assert "C:\\" not in pg.inner_text("#pbqbody .con-out") or "Type help" in pg.inner_text("#pbqbody .con-out"), "reset did not clear"
    pg.tap("#pbqbody .con-tab[data-h=web01]"); cmd("systemctl disable --now kworkerd"); cmd("iptables -A OUTPUT -d 198.51.100.23 -j DROP")
    pct = submit(pg, f"{OUT}/{name}-console-score.png"); assert pct == 50, f"console partial credit expected 50, got {pct}"
    print(f"  ✓ {name}: incident console runs, resets, scores partial credit ({pct}%)")
    # ---- firewall rule editor ----
    open_lab_item(pg, "f-vpn-jump"); pane_toggle(pg)
    pg.tap("#pbqbody .fwe-del[data-i='0']")                                 # delete the permissive rule
    for i in range(6): pg.tap("#pbqbody .fwe-add")
    rows = [("allow", "10.0.99.0/24", "10.0.20.5", "3389", "tcp"), ("deny", "10.0.99.50", "any", "any", "any"), ("allow", "10.0.20.5", "10.0.20.0/24", "22", "tcp"),
            ("allow", "10.0.20.5", "10.0.20.0/24", "3389", "tcp"), ("allow", "10.0.10.0/24", "10.0.20.0/24", "443", "tcp"), ("allow", "10.0.10.0/24", "10.0.20.53", "53", "udp")]
    for i, (act, src, dst, port, proto) in enumerate(rows):
        if act == "deny": pg.tap(f"#pbqbody .fwe-act[data-i='{i}']")
        for k, v in (("src", src), ("dst", dst), ("port", port), ("proto", proto)): pg.select_option(f"#pbqbody select[data-i='{i}'][data-k='{k}']", v)
    # drag the contractor deny (row 2) above row 1 using a touch drag on the handle
    handle = pg.query_selector("#pbqbody .fwe-row[data-i='1'] .grab"); target = pg.query_selector("#pbqbody .fwe-row[data-i='0']")
    tb = target.bounding_box(); swipe(pg, handle, (tb["x"] + tb["width"] / 2, tb["y"] + 6))
    assert pg.query_selector("#pbqbody .fwe-row[data-i='0'] .fwe-act.deny"), "touch-drag reorder did not move the deny to the top"
    pg.screenshot(path=f"{OUT}/{name}-fweditor.png")
    pct = submit(pg, f"{OUT}/{name}-fweditor-score.png"); assert pct == 100, f"fweditor expected 100, got {pct}"
    print(f"  ✓ {name}: firewall editor add/edit/delete/touch-reorder → {pct}%")
    # ---- log viewer ----
    open_lab_item(pg, "l-vpn-spray"); pane_toggle(pg)
    for l in (1, 2, 3, 4, 5, 6, 7, 8): pg.tap(f"#pbqbody .lv-ln[data-k='0:{l}']")
    pg.tap("#pbqbody .lv-tab[data-s='1']"); pg.tap("#pbqbody .lv-ln[data-k='1:3']")
    pg.tap("#pbqbody .lv-tab[data-s='2']"); pg.tap("#pbqbody .lv-ln[data-k='2:1']"); pg.tap("#pbqbody .lv-ln[data-k='2:2']")
    assert pg.inner_text("#pbqbody .lv-count").startswith("11"), "line selection count wrong"
    for i in range(3): pg.tap(f"#pbqbody .xm-opts[data-s='{i}'] .xm-opt[data-i='0']")
    pg.screenshot(path=f"{OUT}/{name}-logview.png")
    pct = submit(pg, f"{OUT}/{name}-logview-score.png"); assert pct == 100, f"logview expected 100, got {pct}"
    print(f"  ✓ {name}: log viewer evidence selection + 3 sub-answers → {pct}%")
    # ---- drag-and-drop match ----
    open_lab_item(pg, "m-logsrc"); pane_toggle(pg)
    chips = pg.query_selector_all("#pbqbody .pool .mchip"); n0 = len(chips)
    # touch-drag the first chip onto the first target, then tap-to-pair a second one
    swipe(pg, chips[0], center(pg.query_selector_all("#pbqbody .mtarget")[0]))
    assert len(pg.query_selector_all("#pbqbody .pool .mchip")) == n0 - 1, "touch drag did not place the chip"
    pg.query_selector_all("#pbqbody .pool .mchip")[0].tap(); pg.query_selector_all("#pbqbody .mtarget")[1].tap()
    assert len(pg.query_selector_all("#pbqbody .pool .mchip")) == n0 - 2, "tap-to-pair fallback failed"
    # drag the placed chip back to the pool
    placed = pg.query_selector_all("#pbqbody .mtarget .mchip")[0]; swipe(pg, placed, center(pg.query_selector("#pbqbody .pool")))
    assert len(pg.query_selector_all("#pbqbody .pool .mchip")) == n0 - 1, "drag back to pool failed"
    pg.screenshot(path=f"{OUT}/{name}-match.png")
    pct = submit(pg, f"{OUT}/{name}-match-score.png"); assert 0 <= pct <= 100
    print(f"  ✓ {name}: drag-drop match (touch drag, tap fallback, undo) → {pct}%")
    # ---- drag-and-drop order ----
    open_lab_item(pg, "o-ransom"); pane_toggle(pg)
    rows = pg.query_selector_all("#pbqbody .orow"); first = rows[0].get_attribute("data-i")
    rb = rows[-1].bounding_box(); swipe(pg, rows[0].query_selector(".grab"), (rb["x"] + rb["width"] / 2, rb["y"] + rb["height"] - 4))
    rows2 = pg.query_selector_all("#pbqbody .orow"); assert rows2[-1].get_attribute("data-i") == first, "touch drag-to-sort did not move the row"
    pg.query_selector_all("#pbqbody .orow")[-1].query_selector(".omv button[data-d='-1']").tap()
    pg.screenshot(path=f"{OUT}/{name}-order.png")
    pct = submit(pg, f"{OUT}/{name}-order-score.png"); assert 0 <= pct <= 100
    print(f"  ✓ {name}: drag-drop order (touch sort + arrow fallback) → {pct}%")
    # ---- exam runner shows the new sims without errors (practice mode item list uses the registry) ----
    pg.goto(BASE); pg.wait_for_selector("#startToday"); pg.click("button.deck[data-k=exam]"); pg.wait_for_selector(".deck[data-x=a]")
    ctx.close()

with sync_playwright() as p:
    b = p.chromium.launch()
    run_device(b, 390, 844, "iphone")
    run_device(b, 1024, 1366, "ipad")
    b.close()
if errors:
    print("PAGE ERRORS:"); [print("  -", e[:300]) for e in errors]; sys.exit(1)
print("sims-e2e: all checks passed")
