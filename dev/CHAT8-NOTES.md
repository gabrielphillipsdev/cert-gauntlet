# Chat 8 notes — working facts for whoever continues this chat

Branch `chat-8/ccna-labs`. Plan: `dev/CHAT8-PLAN.md`. Baseline on main: `node dev/tests/ios-conformance.mjs` → 118/118; `node dev/check-pack.mjs ccna` → PASS (empty pack).

## Repo conventions that changed the plan
- **Content is JS modules, not JSON.** Packs export arrays from `.js` files (`packs/secplus/lab/*.js`). So labs live in
  `packs/ccna/labs.js` (export `LABS`), reader items in `packs/ccna/reader.js` (`READER`), PBQs in `packs/ccna/pbq.js` (`PBQ_ORDER`, `PBQ_TOPO`).
- **Lab items are sim items** on the registry (`registerSim(type, {create, render, answered, score})`), listed by `core/views/lab.js`
  from `content.lab`. The PBQ Lab view draws the title, **Reset** (= `create()` again) and "Check answers" (= `score()` then `render(..., {reveal:true, locked:true})`).
  So the `ccna-lab` sim renders only the body: timer/target bar, left pane (Tasks/Guidelines/Topology), right pane (device terminal tabs).
- **Sim state must be JSON-serializable and resumable.** The `ccna-lab` state is `{ log: {DEV: [typed lines…]}, answers: {id: text}, t0 }` —
  a per-device command transcript. The live simulator is rebuilt by replaying the transcript (`createLab(spec)` + `cli(dev).exec(line)`),
  cached in a WeakMap keyed by the state object so keystrokes don't replay. Blocked commands are intercepted before `exec` and never logged.
- **Validator** (`dev/check-pack.mjs`): every item needs `id, type, title, obj`; `obj` must match `manifest.objPattern`
  (CCNA uses `^[1-6]\.\d{1,2}(\.[a-z])?$`); each sim type must `create()`+`score()` a blank attempt to `f === 0` in a DOM-free node run
  (`document.createElement` is stubbed, so **no DOM work in create/score**). Diagram items: ≥3 slots, wants in palette, `reuse:true` when two slots share a want.
- Objective ids are 200-301 v1.1 topic numbers (`2.1.a`). Items may carry `d` (domain 1–6).
- `core/sims/ui.js`: `injectCss(id, css)`, `instructionsPane(el, item, {title, fallback})`, `drag/sortable/dragify`, `TERM_KEYS`; `core/ui/keyrow.js`: `attachKeyRow(scopeEl, IOS_KEYS)` (hidden on fine-pointer devices).
- Pack `status: "soon"` disables the pack in the picker. Chat 9 owns cards/banks; this chat sets the manifest's `objPattern`, adds the sim imports and the lab/reader/pbq content to `load()`. Whether to flip status is a Gabe decision — the standalone dev page `dev/pages/ccna-lab.html` works regardless.

## Simulator API actually used (core/sims/ios)
- `createLab({devices:{R1:{type:"router"|"switch"|"l3switch"}, PC1:{host:true, ip, mask, gw}}, links:[["R1","g0/0","SW1","g0/1"],["SW1","f0/1","PC1"]], configs:{R1:[cli lines]}})`
- `lab.cli(name)` → Session: `.prompt()`, `.exec(line)` → `{out, prompt, echo?, help?}`, `.complete(line)`, `.history[]`, `.pending` (interactive prompt active), `.mode`.
- `lab.topo.ping(from, dst, {source?})` → `{marks, pct, received, why}`; `lab.topo.ping6(from, dst)`; `lab.topo.converge()`; `lab.topo.get(name)` → Device with `.rt` runtime:
  `rt.routes[{prefix,len,code,ad,nhs:[{via,iface}]}]`, `rt.ospfNbrs[{rid,state,addr,iface,dev}]`, `rt.ospfIfs[{iface,area,passive,state}]`, `rt.stp[vlan] = {root, rootPort, ports:[{name,role,sts}]}`,
  `rt.nat[{il,ig,ilPort,igPort,proto,overload}]`, `rt.dhcpBindings[{ip,mac,host,pool}]`, `rt.mac`, interface `.rt.up/.proto/.opMode("trunk"|"access")/.bundled/.poFlag/.errDisabled`.
- `lab.state(name)` = config snapshot: `hostname, interfaces{NAME:{ip:{addr,len}, ipv6:[], shutdown, switchport:{mode,access,native,allowed(Set→array)}, portsec:{on,max,sticky,violation}, channelGroup:{id,mode}, acl:{in,out}, nat, helper[], encap:{vlan,native}, desc}}, vlans{N:{name}}, routes[{prefix,len,nh,iface,ad}], ospf{pid,routerId,networks[{addr,wild,area}],passive[],defOrig}, acls{NAME:{type,entries[{action,proto,src,srcWild,dst,dstWild,dstPort}]}}, nat{static[{il,ig}],dynamic[{list,iface,pool,overload}],pools}, dhcp{pools{NAME:{network,len,router,dns[]}},excluded[]}, lines{"con 0","vty 0 4":{password,login,transport}}, users{}, enableSecret, servicePwEnc, banner, domainName, rsaBits, ipRouting, ipv6Routing`.
- `lab.topo.aclCheck(dev, aclName, {src,dst,proto:"tcp",dport,sport})` → permit bool (increments counters). `lab.topo.forward(hostDev, pkt, null, [])` → `{ok, why}` runs a TCP/UDP packet through the whole path incl. ACLs.
- `runningConfig(dev)` (from `config.js`) → text, for regex checks.

## Simulator gaps found (report to Chat 7, don't patch here)
- **No proxy ARP**: a static/default route with only an Ethernet exit interface (`ip route 0.0.0.0 0.0.0.0 g0/1`) can't resolve the far host → pings fail,
  where real IOS would answer with proxy ARP. Labs therefore say "using the next-hop address" when a ping check depends on the route; the `staticRoute` check itself accepts either form.
- `show` commands in config mode need `do` (documented IOS-12 behaviour).
- **`enable` typed at a `#` prompt** returns `Translating "enable"...` (IOS just stays in privileged EXEC). Harmless in labs; solution scripts avoid it.
- Re-entering a `network` statement with the same address/wildcard but a different area is silently ignored (IOS prints an overlap error).
- No OSPF MTU/EXSTART or hello/dead mismatch (documented out of scope) → the reader has no "stuck in EXSTART" items; area mismatch / passive / DR-BDR cover adjacency questions instead.
- **ACL `remark` lines crash packet matching** (`wildcardMatch` on an entry with no `src`) → `ping` through such an ACL throws. labGrader `safeExec` turns the throw into `% Internal simulator error…` so the lab UI survives; reader scenarios avoid remarks.
- **`show ip ospf interface brief` throws** when an OSPF interface has no state (seen with an area-mismatched segment). Also caught by `safeExec`.
- Loopback /32s are listed as both `C` and `L` in `show ip route` (IOS lists only `C`); reader items avoid asking about it.
- `ip ospf network point-to-point` on a loopback is accepted but the loopback is still advertised as /32 (IOS advertises the configured mask).
- No ARP reply for a static-NAT inside-global address that sits in the outside interface's subnet (IOS answers it). Labs/PBQs publish static NAT addresses outside the connected subnet and give the ISP a route.
- Global commands that do not enter a mode (`ip route`, `access-list`, `ip nat inside source …`) are rejected with `% Invalid input` from a sub-mode; IOS accepts them and drops to global config. Config-order PBQs include an explicit `exit` step where this matters.
- No `access-class` on vty lines → the standard-ACL lab uses an interface ACL near the destination.

## Fidelity sources (Cisco lab item) — see dev/specs/ccna.md "Lab item fidelity"
Cisco blog "New Performance-Based Lab Exam Items Build Opportunities" + 200-301 v1.1 exam topics PDF (URLs in the spec).

## Lab authoring conventions learned
- Solution scripts: sessions keep their mode across the primary → violate append, and a device not touched by primary starts at `>` — violate scripts for such devices begin with `enable`.
- Every "should still work" connectivity check that is already true on the starting config needs `requires: [<check that proves the change>]`, otherwise fresh ≠ 0 (the test catches it).
- `partial.json` values are computed by hand from check points — if the test disagrees, recount before touching a check (twice the test was right).

## Final state (for Chat 9)
- Lab ids for exam placement: `lab-vlans-trunking lab-router-on-a-stick lab-svi-routing lab-static-routes lab-ospf-single-area lab-acls lab-nat-pat lab-etherchannel lab-dhcp lab-port-security lab-ssh-hardening lab-ipv6 lab-analyze-show` (each carries `d` for domain scoring). They are ordinary sim items: `sim("ccna-lab").score(item, state).f` is the partial credit.
- `content.lab` = labs + config-order + topology PBQs + reader items (73). Chat 9 can split reader items into its own practice mode (`type === "show-reader"`).
- Manifest has sections/weights, `domName`, `objPattern`, `backtrack:false`; exam numbers, cards, banks and `status:"ready"` are Chat 9's.
- `sw.js` caches everything stale-while-revalidate, so new files need no precache entry; a `VERSION` bump (core/app.js + sw.js, Chat 1) is still needed on deploy.
- Preview without the pack enabled: `dev/pages/ccna-lab.html` (lists all 73 items, `?item=<id>`).
