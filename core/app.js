/* Cert Gauntlet — boot + router. One shell, one view container, one active pack.
   A view is a function (app, args) that renders into app.el. app.go(name, args) switches views. */
import { $, on, toast } from "./util.js";
import { loadLocal, getDevice, setDevice } from "./store.js";
import { initSync, SYNC_LABEL } from "./sync.js";
import { openPack } from "./packs.js";
import "./sims/basic.js";
import "./sims/generators.js";
import { renderPicker } from "./views/picker.js";
import { renderHome, todaySet } from "./views/home.js";
import { renderSession } from "./views/session.js";
import { renderLab } from "./views/lab.js";
import { renderExq, renderTwins, renderSprint, renderMiss, renderRef, stopSprint } from "./views/practice.js";
import { renderExam, stopExamTimer } from "./exam/runner.js";
import { renderSettings } from "./views/settings.js";

export const VERSION = "2.0.0";

const VIEWS = { home: renderHome, session: renderSession, lab: renderLab, exq: renderExq, twins: renderTwins, sprint: renderSprint, miss: renderMiss, ref: renderRef, exam: renderExam, settings: renderSettings };

const app = {
  version: VERSION, packId: null, manifest: null, content: null, el: null, view: null,
  async openPack(id) {
    const { manifest, content } = await openPack(id);
    app.packId = id; app.manifest = manifest; app.content = content;
    setDevice({ cert: id });
    document.title = `${manifest.short} · Cert Gauntlet`;
    $("#brand-sub").textContent = manifest.short + " · " + manifest.code;
    $("#back-to-picker").hidden = false;
    app.go("home");
  },
  go(name, args = {}) {
    stopSprint(); stopExamTimer();
    app.view = name;
    document.body.dataset.view = name;
    if (name === "session" && !args.set && args.deck === "today") args = { ...args, set: todaySet(app) };
    app.el.className = "view view-" + name + (["exam", "lab", "session"].includes(name) ? " wide" : "");
    app.setHeader("");
    VIEWS[name](app, args);
    app.el.scrollTop = 0; window.scrollTo(0, 0);
  },
  setHeader(html) { $("#hdr-meta").innerHTML = html; },
  picker() {
    stopSprint(); stopExamTimer();
    app.packId = null; app.manifest = null; app.content = null; app.view = "picker";
    document.body.dataset.view = "picker"; document.title = "Cert Gauntlet";
    $("#brand-sub").textContent = "pick your exam"; $("#back-to-picker").hidden = true; app.setHeader("");
    app.el.className = "view view-picker";
    renderPicker(app);
  },
};

function paintSync(s) { const el = $("#sync"); el.textContent = SYNC_LABEL[s] || s; el.className = "sync " + s; }

async function boot() {
  app.el = $("#view");
  loadLocal();
  on("sync", paintSync);
  on("toast", toast);
  initSync();
  $("#back-to-picker").onclick = () => app.picker();
  $("#settings-btn").onclick = () => { if (app.packId) app.go("settings"); else app.openPack("secplus").then(() => app.go("settings")); };
  if ("serviceWorker" in navigator) { try { await navigator.serviceWorker.register("./sw.js"); } catch (e) { console.warn("sw", e); } }
  const dev = getDevice();
  if (dev.cert) { try { await app.openPack(dev.cert); return; } catch (e) { console.warn(e); } }
  app.picker();
}
window.CG = app;
boot();
