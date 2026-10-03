"""Browser test for the CCNA preview (Chat 8): every item loads without errors, a lab is solved by typing into the terminal UI
and scores 100%, a reader item and a topology PBQ are answered through the UI, and screenshots are taken at iPad and phone sizes.
Run: python3 -m http.server 8765 (repo root) then python3 dev/tests/ccna-e2e.py   (screenshots → dev/tests/shots/, git-ignored)"""
import os, re, sys, json, time
from playwright.sync_api import sync_playwright
BASE = os.environ.get("CG_URL", "http://localhost:8765/") + "dev/pages/ccna-lab.html"
OUT = os.path.join(os.path.dirname(__file__), "shots"); os.makedirs(OUT, exist_ok=True)
SOL = os.path.join(os.path.dirname(__file__), "..", "solutions", "ccna")
fails = []
def check(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond: fails.append(msg)
def solution(lab_id, kind="alt"):
    dev, out = None, []
    for line in open(os.path.join(SOL, f"{lab_id}.{kind}.txt")):
        line = line.rstrip("\n")
        m = re.match(r"^!\s*device\s+(\S+)", line)
        if m: dev = m.group(1); continue
        if line.strip() and not line.startswith("!"): out.append((dev, line))
    return out
with sync_playwright() as p:
    b = p.chromium.launch()
    errs = []
    ipad = b.new_page(viewport={"width": 1024, "height": 768})
    ipad.on("pageerror", lambda e: errs.append(str(e))); ipad.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    ipad.on("dialog", lambda d: d.accept())
    ipad.goto(BASE); ipad.wait_for_selector(".pv-card")
    ids = ipad.eval_on_selector_all(".pv-card", "els => els.map(e => new URLSearchParams(e.getAttribute('href').slice(1)).get('item'))")
    check(len(ids) == 73, f"preview lists {len(ids)} items (13 labs + 40 reader + 20 PBQs)")
    ipad.screenshot(path=f"{OUT}/ccna-preview-ipad.png", full_page=False)
    for i in ids:
        ipad.goto(BASE + "?item=" + i); ipad.wait_for_selector("#body > *", timeout=5000)
    check(not errs, f"all {len(ids)} items render without page errors" + (": " + "; ".join(errs[:3]) if errs else ""))
    # ---- solve the VLAN lab by typing (alt solution: abbreviations, interface range, Tab not needed)
    for lab_id in ["lab-vlans-trunking", "lab-acls"]:
        ipad.goto(BASE + "?item=" + lab_id); ipad.wait_for_selector(".cl-in input")
        inp = ipad.locator(".cl-in input"); cur = None; t0 = time.time(); keys = 0
        devs = ipad.eval_on_selector_all(".cl-dtab", "els => els.map(e => e.dataset.dev)")
        for k, (dev, line) in enumerate(solution(lab_id)):
            if dev != cur:
                if k % 2: ipad.keyboard.press(f"Alt+{devs.index(dev) + 1}")
                else:
                    ipad.click('.cl-tabs button[data-t="topo"]'); ipad.click(f'.cl-dev[data-dev="{dev}"]')
                cur = dev
                check(ipad.locator(".cl-dtab.on").inner_text().endswith(dev), f"{lab_id}: switched terminal to {dev}")
            inp.fill(line); inp.press("Enter"); keys += len(line) + 1
        ipad.click("#submit"); ipad.wait_for_selector(".fbscore")
        score = ipad.locator(".fbscore").inner_text()
        check(score == "100%", f"{lab_id}: typed through the terminal UI scores {score} ({keys} keystrokes)")
        ipad.screenshot(path=f"{OUT}/{lab_id}-solved-ipad.png", full_page=True)
    # ---- shortcuts: Tab completion, ? help, Ctrl+Z, blocked command
    ipad.goto(BASE + "?item=lab-analyze-show"); ipad.wait_for_selector(".cl-in input"); inp = ipad.locator(".cl-in input")
    inp.fill("en"); inp.press("Enter"); inp.fill("conf"); inp.press("Tab"); check(inp.input_value() == "configure ", "Tab completes 'conf' → 'configure '")
    inp.fill("configure terminal"); inp.press("Enter"); inp.press("Control+z"); check(ipad.locator(".cl-ps").inner_text().endswith("#") and "(config" not in ipad.locator(".cl-ps").inner_text(), "Ctrl+Z returns to privileged EXEC")
    inp.fill("sh run"); inp.press("Enter"); check("disabled in this lab" in ipad.locator(".cl-out").inner_text(), "show running-config is blocked in the analyze lab")
    inp.fill("show ip "); inp.press("?"); check("route" in ipad.locator(".cl-out").inner_text(), "? prints inline help")
    for a, v in [("a1", "SW2"), ("a2", "SW3 Gi0/1"), ("a3", "area 1"), ("a4", "10.0.12.2"), ("a5", "99")]: ipad.fill(f'input[data-a="{a}"]', v)
    ipad.click("#submit"); ipad.wait_for_selector(".fbscore"); check(ipad.locator(".fbscore").inner_text() == "100%", "analyze lab answers score 100%")
    # ---- reader + topology PBQ through the UI
    rd = json.loads(ipad.evaluate("fetch('../../packs/ccna/reader.js').then(r=>r.text())").split("export const READER = ", 1)[1].rstrip().rstrip(";"))[0]
    ipad.goto(BASE + "?item=" + rd["id"]); ipad.click(f'.sr-o[data-i="{rd["ans"]}"]'); ipad.click("#submit"); ipad.wait_for_selector(".fbscore")
    check(ipad.locator(".fbscore").inner_text() == "100%", "reader item answered through the UI scores 100%"); ipad.screenshot(path=f"{OUT}/reader-ipad.png", full_page=True)
    ipad.goto(BASE + "?item=pt-dr-priority"); ipad.wait_for_selector(".spal-i")
    item = ipad.evaluate("window.__pv.item")
    for s in item["slots"]:
        ipad.click(f'.spal-i[data-dev="{s["want"]}"]'); ipad.click(f'[data-drop="{s["id"]}"] rect')
    ipad.screenshot(path=f"{OUT}/topo-pbq-ipad.png"); ipad.click("#submit"); ipad.wait_for_selector(".fbscore")
    check(ipad.locator(".fbscore").inner_text() == "100%", "topology PBQ placed by tapping scores 100%")
    ipad.goto(BASE + "?item=po-acl"); ipad.wait_for_selector(".orow"); ipad.screenshot(path=f"{OUT}/order-pbq-ipad.png")
    # ---- portrait iPad and phone
    port = b.new_page(viewport={"width": 820, "height": 1180}); port.goto(BASE + "?item=lab-ospf-single-area"); port.wait_for_selector(".cl-left")
    check(port.locator(".cl-left").is_visible() and port.locator(".cl-right").is_visible(), "iPad portrait (820px): task pane and terminal both on screen"); port.click('.cl-tabs button[data-t="topo"]'); port.screenshot(path=f"{OUT}/lab-ipad-portrait.png")
    ph = b.new_page(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True); ph.on("pageerror", lambda e: errs.append(str(e)))
    ph.goto(BASE + "?item=lab-nat-pat"); ph.wait_for_selector(".cl-seg")
    check(ph.locator(".cl-left").is_visible() and not ph.locator(".cl-right").is_visible(), "phone: one pane at a time")
    ph.click('.cl-seg button[data-v="topo"]'); ph.tap('.cl-dev[data-dev="R1"]')
    check(ph.locator(".cl-right").is_visible() and ph.locator(".cl-dtab.on").inner_text().endswith("R1"), "phone: tapping R1 on the topology opens its terminal")
    ph.locator(".cl-in input").focus(); time.sleep(0.2); check(ph.locator(".keyrow.show").count() == 1, "phone: IOS symbol key row shows above the keyboard")
    check(not ph.evaluate("document.documentElement.scrollWidth > window.innerWidth"), "phone: no horizontal scroll"); ph.screenshot(path=f"{OUT}/lab-phone-term.png")
    ph.goto(BASE + "?item=rd-stp-1"); ph.screenshot(path=f"{OUT}/reader-phone.png", full_page=True)
    check(not ph.evaluate("document.documentElement.scrollWidth > window.innerWidth"), "phone: reader has no horizontal page scroll")
    b.close()
print(f"\nccna-e2e: {'FAIL ' + str(len(fails)) if fails else 'PASS'}"); sys.exit(1 if fails else 0)
