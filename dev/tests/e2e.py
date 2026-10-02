"""End-to-end test: Cert Gauntlet in Chromium at iPhone and iPad sizes, with a mocked GitHub Gist API so
two "devices" sync against the same Gist. Also checks offline load via the service worker.

Run:  python3 -m http.server 8765  (from the repo root)   then   python3 dev/tests/e2e.py
Needs: pip install playwright && playwright install chromium (pre-installed in the build container).
Writes screenshots to dev/tests/shots/ (git-ignored)."""
import json, os, sys, time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("CG_URL", "http://localhost:8765/")
OUT = os.path.join(os.path.dirname(__file__), "shots"); os.makedirs(OUT, exist_ok=True)
errors = []

# ---------- mock Gist API shared by every context ----------
GISTS = {}
LEGACY = {"stats": {"crypto|Symmetric encryption — the one-line definition": {"seen": 3, "right": 3, "streak": 2, "level": 2, "due": 0, "ivl": 0},
                     "social|Rootkit": {"seen": 2, "right": 1, "streak": 0, "level": 1, "due": 0, "ivl": 0}},
          "pbq": {"o-ir": {"attempts": 1, "best": 100}}, "exq": {}, "examHist": [{"t": 1758000000000, "x": "a", "raw": 78, "scaled": 724, "pass": True, "gate": False, "dom": {"1": [8, 10]}, "conf": {"0": [0, 0], "1": [0, 0], "2": [0, 0]}, "secs": 3000, "miss": [], "guess": [], "flags": [], "detail": []}],
          "days": {"2026-09-20": 30}, "twins": {}, "sprint": {"ports": {"best": 20, "runs": 3}}, "updatedAt": 1758000001000, "exam": "2026-10-28", "sessionsDone": 4, "remindOn": "yes", "remindHours": 4, "lastStudy": "2026-09-20T10:00:00.000Z"}
GISTS["legacy1"] = {"id": "legacy1", "owner": {"login": "gabe"}, "files": {"secplus-state.json": {"content": json.dumps(LEGACY)}}}

def gist_route(route, request):
    url = request.url; method = request.method
    if url.startswith("https://api.github.com/gists?"):
        return route.fulfill(status=200, content_type="application/json", body=json.dumps([{"id": g["id"], "owner": g["owner"], "files": {k: {"filename": k} for k in g["files"]}} for g in GISTS.values()]))
    if url == "https://api.github.com/gists" and method == "POST":
        body = json.loads(request.post_data); gid = "g%d" % (len(GISTS) + 1)
        GISTS[gid] = {"id": gid, "owner": {"login": "gabe"}, "files": {k: {"content": v["content"]} for k, v in body["files"].items()}}
        return route.fulfill(status=201, content_type="application/json", body=json.dumps(GISTS[gid]))
    if url.startswith("https://api.github.com/gists/"):
        gid = url.rsplit("/", 1)[1]
        if gid not in GISTS: return route.fulfill(status=404, body="{}")
        if method == "PATCH":
            body = json.loads(request.post_data)
            for k, v in body["files"].items(): GISTS[gid]["files"][k] = {"content": v["content"]}
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(GISTS[gid]))
    return route.continue_()

def device(b, w, h, name):
    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, is_mobile=w < 600, has_touch=True)
    ctx.route("https://api.github.com/**", gist_route)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"{name}: {e}"))
    pg.on("console", lambda m: errors.append(f"{name} console: {m.text}") if m.type == "error" else None)
    pg.on("dialog", lambda d: d.accept())
    return ctx, pg

def link(pg):
    pg.click("#settings-btn"); pg.wait_for_selector("#tok"); pg.fill("#tok", "github_pat_test"); pg.click("#linkbtn")
    pg.wait_for_function("document.querySelector('#sync').classList.contains('ok')", timeout=8000)

def state(pg): return pg.evaluate("JSON.parse(localStorage.getItem('cg-state-v2'))")

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- device A: iPhone ----
    ctxA, A = device(b, 390, 844, "iphone")
    A.goto(BASE); A.wait_for_selector(".deck.cert"); A.screenshot(path=f"{OUT}/a-picker.png")
    A.click(".deck.cert[data-id=secplus]"); A.wait_for_selector("#startToday"); A.screenshot(path=f"{OUT}/a-home.png")
    link(A)
    # legacy import happened?
    sA = state(A); cards = sA["packs"]["secplus"]["cards"]
    assert "attacks|Rootkit" in cards and "social|Rootkit" not in cards, "legacy rename failed"
    assert sA["packs"]["secplus"]["examHist"][0]["id"].startswith("legacy-"), "legacy exam import failed"
    print("  ✓ legacy Gym Cards gist imported with category rename")
    A.click("[data-back]"); A.wait_for_selector("#startToday")
    # study a card on A
    A.click("#startToday"); A.wait_for_selector(".opt"); A.click(".opt >> nth=0"); A.wait_for_timeout(1200)
    A.click("#quit"); A.wait_for_selector("#startToday"); A.wait_for_timeout(2500)  # debounce push
    nA = len(state(A)["packs"]["secplus"]["cards"])
    # ---- device B: iPad, links to same gist ----
    ctxB, B = device(b, 1024, 1366, "ipad")
    B.goto(BASE); B.wait_for_selector(".deck.cert"); B.click(".deck.cert[data-id=secplus]"); B.wait_for_selector("#startToday")
    link(B); B.click("[data-back]"); B.wait_for_selector("#startToday")
    assert len(state(B)["packs"]["secplus"]["cards"]) == nA, "B did not receive A's progress"
    print("  ✓ second device pulled first device's progress")
    # both devices study at the same time, different cards, then both pull
    B.click("#startToday"); B.wait_for_selector(".opt"); B.click(".opt >> nth=1"); B.wait_for_timeout(1200); B.click("#quit"); B.wait_for_selector("#startToday")
    A.click("#startToday"); A.wait_for_selector(".opt"); A.click(".opt >> nth=0"); A.wait_for_timeout(1200); A.click("#quit"); A.wait_for_selector("#startToday")
    A.wait_for_timeout(2500); B.wait_for_timeout(2500)
    A.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); B.evaluate("window.dispatchEvent(new Event('focus'))"); A.wait_for_timeout(1500); B.wait_for_timeout(1500)
    A.evaluate("window.dispatchEvent(new Event('focus'))"); A.wait_for_timeout(1500)
    sa, sb = state(A)["packs"]["secplus"], state(B)["packs"]["secplus"]
    assert set(sa["cards"]) == set(sb["cards"]) and len(sa["cards"]) >= nA + 1, f"card sets differ: {len(sa['cards'])} vs {len(sb['cards'])}"
    tot_a = sum(c["seen"] for c in sa["cards"].values()); tot_b = sum(c["seen"] for c in sb["cards"].values())
    assert tot_a == tot_b, "seen counts differ after merge"
    print(f"  ✓ concurrent study on two devices merged with nothing lost ({len(sa['cards'])} cards, {tot_a} answers)")
    # ---- in-progress exam syncs across devices ----
    B.click("button.deck[data-k=exam]"); B.wait_for_selector(".deck[data-x=a]"); B.click(".deck[data-x=a]"); B.wait_for_selector("#xmnext")
    B.click("#xmnext"); B.wait_for_timeout(500); B.click("#xmnext"); B.wait_for_timeout(3500)
    B.screenshot(path=f"{OUT}/b-exam-ipad.png")
    A.evaluate("window.dispatchEvent(new Event('focus'))"); A.wait_for_timeout(1500)
    A.click("button.deck[data-k=exam]"); A.wait_for_selector("#xmresume"); A.screenshot(path=f"{OUT}/a-exam-resume.png")
    print("  ✓ in-progress exam started on iPad is resumable on iPhone")
    A.click("#xmresume"); A.wait_for_selector("#xmclock"); A.screenshot(path=f"{OUT}/a-exam-q.png")
    # ---- offline: reload with network off ----
    ctxA.set_offline(True); A.reload(); A.wait_for_selector(".deck", timeout=10000); A.screenshot(path=f"{OUT}/a-offline.png"); ctxA.set_offline(False)
    print("  ✓ app loads offline from the service worker cache")
    b.close()
if errors:
    print("PAGE ERRORS:"); [print("  -", e[:300]) for e in errors]; sys.exit(1)
print("e2e: all checks passed")
