/* Cert Gauntlet — KQL interpreter conformance suite.  Run: node dev/tests/kql.test.mjs
   Part A (literal): small hand-authored fixture tables with expected results written out by hand — the interpreter is not
   allowed to grade itself. Part B (independent): queries over the lab's sample tables whose expected values are computed
   here with plain JavaScript over the raw rows. Part C: error messages must read like the Log Analytics editor. */
import { runKql, sameResult, KqlError } from "../../core/sims/kql/kql.js";
import { DT, TS, fmtValue } from "../../core/sims/kql/values.js";
import { LAB_DB, LAB_NOW } from "../../core/sims/kql/tables.js";

const NOW = Date.UTC(2026, 10, 15, 9); /* 2026-11-15T09:00Z */
const d = s => new DT(Date.parse(s)), ts = ms => new TS(ms);
const FIX = {
  now: NOW,
  tables: {
    Logons: { cols: [["TimeGenerated", "datetime"], ["User", "string"], ["Result", "string"], ["IP", "string"], ["Country", "string"], ["Attempts", "long"], ["Props", "dynamic"]].map(([name, type]) => ({ name, type })), rows: [
      [d("2026-11-15T08:30:00Z"), "alice", "0", "10.0.0.5", "US", 1, { os: "Windows", tags: ["mfa", "compliant"] }],
      [d("2026-11-15T07:15:00Z"), "bob", "50126", "203.0.113.9", "DE", 3, { os: "Mac", tags: ["legacy"] }],
      [d("2026-11-14T22:00:00Z"), "alice", "50126", "203.0.113.9", "DE", 2, { os: "Windows", tags: [] }],
      [d("2026-11-14T06:45:00Z"), "carol", "0", "10.0.0.7", "US", 1, { os: "iOS", tags: ["mfa"] }],
      [d("2026-11-12T09:00:00Z"), "dave", "53003", "198.51.100.4", "NG", 5, null],
      [d("2026-11-10T12:00:00Z"), "bob", "0", "10.0.0.9", "US", 1, { os: "Mac", tags: ["mfa", "legacy"] }],
      [d("2026-11-15T08:59:00Z"), "eve", "0", "203.0.113.9", "DE", 1, { os: "Linux", tags: ["admin"] }],
      [d("2026-11-14T22:05:00Z"), "alice", "0", "203.0.113.9", "DE", 1, { os: "Windows", tags: ["mfa"] }],
    ] },
    Users: { cols: [["User", "string"], ["Dept", "string"], ["Manager", "string"]].map(([name, type]) => ({ name, type })), rows: [["alice", "IT", "frank"], ["bob", "HR", "grace"], ["carol", "IT", "frank"], ["dave", "Sales", "grace"], ["frank", "IT", ""]] },
    Events: { cols: [["Time", "datetime"], ["Host", "string"], ["EventID", "int"], ["Msg", "string"], ["Dur", "timespan"], ["Score", "real"], ["Ok", "bool"]].map(([name, type]) => ({ name, type })), rows: [
      [d("2026-11-15T08:00:00Z"), "srv1", 4624, "logon ok for alice", ts(1500), 0.5, true],
      [d("2026-11-15T08:05:00Z"), "srv1", 4625, "logon failed for bob", ts(250), 2.5, false],
      [d("2026-11-15T06:00:00Z"), "srv2", 4688, "process powershell.exe started", ts(60000), 7.25, true],
      [d("2026-11-14T08:00:00Z"), "srv2", 4625, "logon failed for alice", ts(3000), 1.0, false],
      [d("2026-11-13T08:00:00Z"), "srv3", 4624, "logon ok for carol", ts(2000), 0.0, true],
      [d("2026-11-15T08:30:00Z"), "srv1", 1102, "audit log cleared", ts(0), 9.5, false],
    ] },
  },
};

/* ---------- Part A: literal expectations.  t(name, query, {cols, rows, ordered, types}) ---------- */
const A = [];
const t = (name, q, exp, opts = {}) => A.push({ name, q, exp, ...opts });
/* where / comparisons */
t("where == string", `Logons | where Result == "50126" | project User`, { cols: ["User"], rows: [["bob"], ["alice"]] });
t("where != and", `Logons | where Result != "0" and Country == "DE" | project User, Attempts`, { cols: ["User", "Attempts"], rows: [["bob", 3], ["alice", 2]] });
t("where or + numeric", `Logons | where Attempts > 2 or Country == "NG" | project User`, { cols: ["User"], rows: [["bob"], ["dave"]] });
t("where datetime > literal", `Logons | where TimeGenerated > datetime(2026-11-15) | project User`, { cols: ["User"], rows: [["alice"], ["bob"], ["eve"]] });
t("where ago(1d)", `Logons | where TimeGenerated > ago(1d) | count`, { cols: ["Count"], rows: [[5]] });
t("where between datetime", `Logons | where TimeGenerated between (datetime(2026-11-14) .. datetime(2026-11-14T23:59:59Z)) | project User`, { cols: ["User"], rows: [["alice"], ["carol"], ["alice"]] });
t("where between numeric", `Logons | where Attempts between (2 .. 3) | project User`, { cols: ["User"], rows: [["bob"], ["alice"]] });
t("where !between", `Logons | where Attempts !between (1 .. 3) | project User`, { cols: ["User"], rows: [["dave"]] });
t("where in list", `Logons | where User in ("alice", "eve") | summarize count()`, { cols: ["count_"], rows: [[4]] });
t("where !in list", `Logons | where User !in ("alice", "bob") | project User`, { cols: ["User"], rows: [["carol"], ["dave"], ["eve"]] });
t("where in~ case-insensitive", `Logons | where User in~ ("ALICE") | count`, { cols: ["Count"], rows: [[3]] });
t("where in (subquery)", `Logons | where User in (Users | where Dept == "IT" | project User) | distinct User`, { cols: ["User"], rows: [["alice"], ["carol"]] });
t("where !in (subquery)", `Logons | where User !in (Users | project User) | distinct User`, { cols: ["User"], rows: [["eve"]] });
t("where isnull dynamic", `Logons | where isnull(Props) | project User`, { cols: ["User"], rows: [["dave"]] });
t("where isnotempty + dot", `Logons | where isnotempty(Props.os) and Props.os == "Mac" | project User`, { cols: ["User"], rows: [["bob"], ["bob"]] });
t("where on bool column", `Events | where Ok | project EventID`, { cols: ["EventID"], rows: [[4624], [4688], [4624]] });
t("where not()", `Events | where not(Ok) | count`, { cols: ["Count"], rows: [[3]] });
t("where real compare", `Events | where Score >= 2.5 | project Host`, { cols: ["Host"], rows: [["srv1"], ["srv2"], ["srv1"]] });
t("where timespan compare", `Events | where Dur > 2s | project EventID`, { cols: ["EventID"], rows: [[4688], [4625]] });
t("where * has", `Logons | where * has "mac" | count`, { cols: ["Count"], rows: [[2]] });
/* project family */
t("project rename inline", `Logons | take 1 | project Who = User, Result`, { cols: ["Who", "Result"], rows: [["alice", "0"]] });
t("project expression autoname", `Logons | take 1 | project strlen(User)`, { cols: ["Column1"], rows: [[5]] });
t("project-away", `Users | project-away Manager | where User == "bob"`, { cols: ["User", "Dept"], rows: [["bob", "HR"]] });
t("project-away wildcard", `Logons | take 1 | project-away T*, P*, R*, I*, C*`, { cols: ["User", "Attempts"], rows: [["alice", 1]] });
t("project-rename", `Users | project-rename Team = Dept | take 1`, { cols: ["User", "Team", "Manager"], rows: [["alice", "IT", "frank"]] });
t("project-reorder", `Users | project-reorder Manager, Dept | take 1`, { cols: ["Manager", "Dept", "User"], rows: [["frank", "IT", "alice"]] });
t("project-keep", `Users | project-keep Dept, User | take 1`, { cols: ["User", "Dept"], rows: [["alice", "IT"]] });
t("extend keeps columns", `Users | take 1 | extend Upper = toupper(User)`, { cols: ["User", "Dept", "Manager", "Upper"], rows: [["alice", "IT", "frank", "ALICE"]] });
t("extend replaces same-name column", `Users | take 1 | extend Dept = strcat(Dept, "-x") | project Dept`, { cols: ["Dept"], rows: [["IT-x"]] });
t("extend arithmetic long", `Logons | where User == "dave" | extend Twice = Attempts * 2, Minus = Attempts - 1 | project Twice, Minus`, { cols: ["Twice", "Minus"], rows: [[10, 4]] });
t("division yields real", `print 7 / 2, 8 / 2`, { cols: ["print_0", "print_1"], rows: [[3.5, 4]] }, { types: ["real", "real"] });
t("modulo", `print 17 % 5`, { cols: ["print_0"], rows: [[2]] });
/* scalar functions */
t("iff", `Logons | where User == "bob" | extend Kind = iff(Result == "0", "ok", "fail") | project Kind`, { cols: ["Kind"], rows: [["fail"], ["ok"]] });
t("case", `Logons | extend Sev = case(Attempts >= 5, "high", Attempts >= 2, "medium", "low") | summarize count() by Sev`, { cols: ["Sev", "count_"], rows: [["low", 5], ["medium", 2], ["high", 1]] });
t("coalesce", `Logons | where User == "dave" | extend OS = coalesce(tostring(Props.os), "unknown") | project OS`, { cols: ["OS"], rows: [["unknown"]] });
t("strcat / strcat_delim", `print strcat("a", "-", "b"), strcat_delim(";", "x", "y", "z")`, { cols: ["print_0", "print_1"], rows: [["a-b", "x;y;z"]] });
t("substring / strlen / toupper / tolower", `print substring("Fabrikam", 0, 3), strlen("Fabrikam"), toupper("ab"), tolower("AB")`, { cols: ["print_0", "print_1", "print_2", "print_3"], rows: [["Fab", 8, "AB", "ab"]] });
t("split with index", `print split("a,b,c", ",", 1), split("a,b,c", ",", -1)`, { cols: ["print_0", "print_1"], rows: [["b", "c"]] });
t("split to dynamic + array_length", `print array_length(split("a,b,c", ","))`, { cols: ["print_0"], rows: [[3]] });
t("extract capture", `Events | where EventID == 4688 | project extract(@"process (\\S+) started", 1, Msg)`, { cols: ["Column1"], rows: [["powershell.exe"]] });
t("extract typed", `print extract("id=([0-9]+)", 1, "id=42", typeof(long)) + 1`, { cols: ["print_0"], rows: [[43]] });
t("replace_string / replace_regex", `print replace_string("a.b.c", ".", "-"), replace_regex("a1b22c", @"\\d+", "#")`, { cols: ["print_0", "print_1"], rows: [["a-b-c", "a#b#c"]] });
t("trim", `print trim(" ", "  hi  "), trim_start("x", "xxhi"), trim_end("!", "hi!!")`, { cols: ["print_0", "print_1", "print_2"], rows: [["hi", "hi", "hi"]] });
t("indexof / countof", `print indexof("fabrikam", "rik"), countof("a,b,c", ","), countof("a1b2", @"\\d", "regex")`, { cols: ["print_0", "print_1", "print_2"], rows: [[3, 2, 2]] });
t("tostring / tolong / toreal / tobool", `print tostring(5), tolong("42"), toreal("1.5"), tobool("true"), tolong("abc")`, { cols: ["print_0", "print_1", "print_2", "print_3", "print_4"], rows: [["5", 42, 1.5, true, null]] });
t("isempty / isnotempty", `print isempty(""), isnotempty("x"), isempty("x")`, { cols: ["print_0", "print_1", "print_2"], rows: [[true, true, false]] });
t("round / abs / floor / ceiling", `print round(2.567, 2), abs(-3), floor(7, 5), ceiling(2.1)`, { cols: ["print_0", "print_1", "print_2", "print_3"], rows: [[2.57, 3, 5, 3]] });
t("min_of / max_of", `print min_of(3, 1, 2), max_of(3, 1, 2)`, { cols: ["print_0", "print_1"], rows: [[1, 3]] });
t("parse_json + dot path", `print parse_json('{"a":{"b":[10,20]}}').a.b[1]`, { cols: ["print_0"], rows: [[20]] });
t("todynamic string column + index", `Logons | where User == "eve" | extend T = Props.tags[0] | project tostring(T)`, { cols: ["Column1"], rows: [["admin"]] });
t("pack / bag_keys", `print bag_keys(pack("x", 1, "y", 2))`, { cols: ["print_0"], rows: [[["x", "y"]]] });
t("pack_array / set_has_element / array_index_of", `print set_has_element(pack_array("a", "b"), "b"), array_index_of(pack_array("a", "b"), "b")`, { cols: ["print_0", "print_1"], rows: [[true, 1]] });
t("ipv4_is_private / ipv4_is_in_range", `Logons | where ipv4_is_private(IP) | distinct IP`, { cols: ["IP"], rows: [["10.0.0.5"], ["10.0.0.7"], ["10.0.0.9"]] });
t("ipv4_is_in_range", `print ipv4_is_in_range("203.0.113.9", "203.0.113.0/24"), ipv4_is_in_range("203.0.114.9", "203.0.113.0/24")`, { cols: ["print_0", "print_1"], rows: [[true, false]] });
t("base64_decode_tostring", `print base64_decode_tostring("RmFicmlrYW0=")`, { cols: ["print_0"], rows: [["Fabrikam"]] });
t("gettype", `print gettype(1), gettype("a"), gettype(1.5), gettype(now()), gettype(1d), gettype(dynamic([1]))`, { cols: ["print_0", "print_1", "print_2", "print_3", "print_4", "print_5"], rows: [["long", "string", "real", "datetime", "timespan", "array"]] });
t("column_ifexists", `Users | take 1 | project A = column_ifexists("Dept", "none"), B = column_ifexists("Nope", "none")`, { cols: ["A", "B"], rows: [["IT", "none"]] });
/* summarize */
t("summarize count by", `Logons | summarize count() by Country`, { cols: ["Country", "count_"], rows: [["US", 3], ["DE", 4], ["NG", 1]] });
t("summarize count by two keys", `Logons | summarize n = count() by Country, Result | where n > 1`, { cols: ["Country", "Result", "n"], rows: [["US", "0", 3], ["DE", "50126", 2], ["DE", "0", 2]] });
t("summarize dcount", `Logons | summarize dcount(User), dcount(IP)`, { cols: ["dcount_User", "dcount_IP"], rows: [[5, 5]] });
t("summarize countif", `Logons | summarize Fails = countif(Result != "0"), Oks = countif(Result == "0")`, { cols: ["Fails", "Oks"], rows: [[3, 5]] });
t("summarize sum / avg / min / max", `Logons | summarize sum(Attempts), avg(Attempts), min(Attempts), max(Attempts)`, { cols: ["sum_Attempts", "avg_Attempts", "min_Attempts", "max_Attempts"], rows: [[15, 1.875, 1, 5]] }, { types: ["long", "real", "long", "long"] });
t("summarize min/max datetime", `Logons | summarize min(TimeGenerated), max(TimeGenerated)`, { cols: ["min_TimeGenerated", "max_TimeGenerated"], rows: [[d("2026-11-10T12:00:00Z"), d("2026-11-15T08:59:00Z")]] });
t("summarize make_set", `Logons | where User == "alice" | summarize make_set(Country), make_set(IP)`, { cols: ["set_Country", "set_IP"], rows: [[["US", "DE"], ["10.0.0.5", "203.0.113.9"]]] });
t("summarize make_list keeps duplicates/order", `Logons | where User == "bob" | summarize make_list(Result)`, { cols: ["list_Result"], rows: [[["50126", "0"]]] });
t("summarize make_set_if", `Logons | summarize make_set_if(User, Result != "0")`, { cols: ["set_User"], rows: [[["bob", "alice", "dave"]]] });
t("summarize arg_max star", `Logons | summarize arg_max(TimeGenerated, *) by User | where User == "alice" | project User, Result, IP`, { cols: ["User", "Result", "IP"], rows: [["alice", "0", "10.0.0.5"]] });
t("summarize arg_min columns", `Logons | summarize arg_min(TimeGenerated, IP) by User | where User == "bob" | project User, TimeGenerated, IP`, { cols: ["User", "TimeGenerated", "IP"], rows: [["bob", d("2026-11-10T12:00:00Z"), "10.0.0.9"]] });
t("summarize bin 1h", `Logons | where TimeGenerated > ago(3h) | summarize count() by bin(TimeGenerated, 1h)`, { cols: ["TimeGenerated", "count_"], rows: [[d("2026-11-15T08:00:00Z"), 2], [d("2026-11-15T07:00:00Z"), 1]] });
t("summarize bin 1d named", `Logons | summarize Logons = count() by Day = bin(TimeGenerated, 1d) | where Logons > 1`, { cols: ["Day", "Logons"], rows: [[d("2026-11-15"), 3], [d("2026-11-14"), 3]] });
t("summarize by only (distinct)", `Logons | summarize by Country`, { cols: ["Country"], rows: [["US"], ["DE"], ["NG"]] });
t("summarize avg real / sum timespan", `Events | summarize avg(Score), sum(Dur)`, { cols: ["avg_Score", "sum_Dur"], rows: [[3.458333333333333, ts(66750)]] });
t("summarize count on empty input", `Logons | where User == "nobody" | summarize count(), dcount(User), make_set(User)`, { cols: ["count_", "dcount_User", "set_User"], rows: [[0, 0, []]] });
t("summarize by empty → no rows", `Logons | where User == "nobody" | summarize count() by User`, { cols: ["User", "count_"], rows: [] });
t("summarize percentile", `Logons | summarize percentile(Attempts, 50)`, { cols: ["percentile_Attempts_50"], rows: [[1]] });
t("summarize take_any", `Logons | summarize take_any(User) by Country | where Country == "NG"`, { cols: ["Country", "User"], rows: [["NG", "dave"]] });
t("summarize dcountif", `Logons | summarize dcountif(User, Country == "DE")`, { cols: ["dcountif_User"], rows: [[3]] });
t("summarize nested scalar inside agg (tostring(null) is \"\", counted)", `Logons | summarize Hosts = dcount(tostring(Props.os))`, { cols: ["Hosts"], rows: [[5]] });
t("summarize expression over aggregates", `Logons | summarize FailPct = 100.0 * countif(Result != "0") / count(), Spread = max(Attempts) - min(Attempts)`, { cols: ["FailPct", "Spread"], rows: [[37.5, 4]] });
/* join */
t("join default innerunique dedupes left keys", `Logons | join (Users) on User | summarize count()`, { cols: ["count_"], rows: [[4]] });
t("join inner", `Logons | join kind=inner (Users) on User | summarize count() by Dept`, { cols: ["Dept", "count_"], rows: [["IT", 4], ["HR", 2], ["Sales", 1]] });
t("join keeps right key as User1 (Kusto)", `Logons | take 1 | join kind=inner (Users) on User | project-away TimeGenerated, Props`, { cols: ["User", "Result", "IP", "Country", "Attempts", "User1", "Dept", "Manager"], rows: [["alice", "0", "10.0.0.5", "US", 1, "alice", "IT", "frank"]] });
t("join leftouter nulls", `Logons | where User == "eve" | join kind=leftouter (Users) on User | project User, Dept`, { cols: ["User", "Dept"], rows: [["eve", null]] });
t("join leftanti", `Logons | join kind=leftanti (Users) on User | project User`, { cols: ["User"], rows: [["eve"]] });
t("join rightanti", `Logons | join kind=rightanti (Users) on User | project User, Dept`, { cols: ["User", "Dept"], rows: [["frank", "IT"]] });
t("join rightouter", `Logons | join kind=rightouter (Users) on User | where isnull(Result) | project User1`, { cols: ["User1"], rows: [["frank"]] });
t("join fullouter count", `Logons | join kind=fullouter (Users) on User | count`, { cols: ["Count"], rows: [[9]] });
t("join leftsemi", `Users | join kind=leftsemi (Logons) on User | project User`, { cols: ["User"], rows: [["alice"], ["bob"], ["carol"], ["dave"]] });
t("join $left/$right different names + suffix", `Users | join kind=inner (Users | project Boss = User, BossDept = Dept) on $left.Manager == $right.Boss | project User, Boss, BossDept`, { cols: ["User", "Boss", "BossDept"], rows: [["alice", "frank", "IT"], ["carol", "frank", "IT"]] });
t("join duplicate column gets suffix 1", `Users | take 1 | join kind=inner (Users) on User | getschema | project ColumnName`, { cols: ["ColumnName"], rows: [["User"], ["Dept"], ["Manager"], ["User1"], ["Dept1"], ["Manager1"]] }, { ordered: true });
t("lookup drops the duplicate key", `Logons | where User == "carol" | lookup (Users) on User | getschema | where ColumnName startswith "User" | project ColumnName`, { cols: ["ColumnName"], rows: [["User"]] });
/* union */
t("union two tables column union", `union Users, (Logons | project User, IP) | summarize count(), dcount(IP)`, { cols: ["count_", "dcount_IP"], rows: [[13, 5]] });
t("union withsource", `union withsource = Src Users, Events | summarize count() by Src`, { cols: ["Src", "count_"], rows: [["Users", 5], ["Events", 6]] });
t("union as operator", `Users | union (Users | where Dept == "IT") | count`, { cols: ["Count"], rows: [[8]] });
t("union kind=inner keeps common columns", `union kind=inner Users, (Logons | project User) | getschema | project ColumnName`, { cols: ["ColumnName"], rows: [["User"]] });
/* let / datatable / print / range */
t("let scalar", `let threshold = 2; Logons | where Attempts > threshold | project User`, { cols: ["User"], rows: [["bob"], ["dave"]] });
t("let tabular", `let fails = Logons | where Result != "0"; fails | summarize count() by User`, { cols: ["User", "count_"], rows: [["bob", 1], ["alice", 1], ["dave", 1]] });
t("let dynamic list in", `let bad = dynamic(["203.0.113.9", "198.51.100.4"]); Logons | where IP in (bad) | summarize dcount(User)`, { cols: ["dcount_User"], rows: [[4]] });
t("let timespan + ago", `let lookback = 2h; Logons | where TimeGenerated > ago(lookback) | count`, { cols: ["Count"], rows: [[3]] });
t("let lambda scalar", `let dbl = (x: long) { x * 2 }; print dbl(21)`, { cols: ["print_0"], rows: [[42]] });
t("datatable", `datatable(Name: string, N: long) ["a", 1, "b", 2] | summarize sum(N)`, { cols: ["sum_N"], rows: [[3]] });
t("datatable join to Users", `datatable(User: string, Risk: string) ["alice", "high", "zed", "low"] | join kind=inner (Users) on User | project User, Risk, Dept`, { cols: ["User", "Risk", "Dept"], rows: [["alice", "high", "IT"]] });
t("print named", `print x = 1, y = "two"`, { cols: ["x", "y"], rows: [[1, "two"]] });
t("range", `range i from 1 to 5 step 2 | summarize make_list(i)`, { cols: ["list_i"], rows: [[[1, 3, 5]]] });
t("range datetime", `range Day from datetime(2026-11-01) to datetime(2026-11-03) step 1d | count`, { cols: ["Count"], rows: [[3]] });
t("toscalar", `let total = toscalar(Logons | count); Logons | summarize Share = count() * 100 / total by Country | where Country == "US"`, { cols: ["Country", "Share"], rows: [["US", 37.5]] });
t("as operator", `Logons | where Country == "US" | as us | summarize count()`, { cols: ["count_"], rows: [[3]] });
/* parse */
t("parse simple typed", `Events | where EventID == 4625 | parse Msg with "logon failed for " Who | project Who`, { cols: ["Who"], rows: [["bob"], ["alice"]] });
t("parse with leading * and middle literal", `Events | where EventID == 4688 | parse Msg with * "process " Proc " started" | project Proc`, { cols: ["Proc"], rows: [["powershell.exe"]] });
t("parse non-matching rows → null", `Events | parse Msg with "logon ok for " Who | summarize countif(isnull(Who)), countif(isnotnull(Who))`, { cols: ["countif_", "countif_1"], rows: [[4, 2]] });
t("parse typed long", `print L = "code=404 path=/x" | parse L with "code=" Code:long " path=" Path | project Code, Path`, { cols: ["Code", "Path"], rows: [[404, "/x"]] });
t("parse kind=regex", `print L = "user: alice; ip: 10.0.0.5" | parse kind=regex L with "user: " U ";\\\\s+ip: " I | project U, I`, { cols: ["U", "I"], rows: [["alice", "10.0.0.5"]] });
t("parse-where drops non-matching", `Events | parse-where Msg with "logon ok for " Who | project Who`, { cols: ["Who"], rows: [["alice"], ["carol"]] });
/* mv-expand */
t("mv-expand array", `Logons | where User == "bob" | mv-expand Props.tags | count`, { cols: ["Count"], rows: [[3]] });
t("mv-expand to typeof(string) named", `Logons | where User == "alice" | mv-expand Tag = Props.tags to typeof(string) | summarize make_list(Tag)`, { cols: ["list_Tag"], rows: [[["mfa", "compliant", "mfa"]]] });
t("mv-expand empty array / null drop rows", `Logons | mv-expand Props.tags | summarize dcount(User)`, { cols: ["dcount_User"], rows: [[4]] });
t("mv-expand bag → key/value rows", `print b = dynamic({"a":1,"b":2}) | mv-expand b | count`, { cols: ["Count"], rows: [[2]] });
t("mv-expand with_itemindex + limit", `print a = dynamic([10,20,30]) | mv-expand with_itemindex = i a limit 2 | project i, a`, { cols: ["i", "a"], rows: [[0, 10], [1, 20]] }, { ordered: true });
t("mv-expand on parse_json of string", `print s = '["x","y"]' | mv-expand v = parse_json(s) to typeof(string) | summarize make_list(v)`, { cols: ["list_v"], rows: [[["x", "y"]]] });
/* sort / top / take / distinct / count */
t("sort desc default", `Logons | sort by Attempts | project User, Attempts | take 2`, { cols: ["User", "Attempts"], rows: [["dave", 5], ["bob", 3]] }, { ordered: true });
t("order by asc then desc tiebreak", `Logons | order by Country asc, Attempts desc | project User | take 3`, { cols: ["User"], rows: [["bob"], ["alice"], ["eve"]] }, { ordered: true });
t("sort nulls first on asc", `Logons | extend os = tostring(Props.os) | extend os = iff(os == "", "", os) | where User in ("dave", "eve") | sort by Props asc | project User`, { cols: ["User"], rows: [["dave"], ["eve"]] }, { ordered: true });
t("top by desc", `Events | top 2 by Score | project Host, Score`, { cols: ["Host", "Score"], rows: [["srv1", 9.5], ["srv2", 7.25]] }, { ordered: true });
t("top by asc", `Events | top 1 by Time asc | project EventID`, { cols: ["EventID"], rows: [[4624]] });
t("take / limit", `Users | limit 2 | count`, { cols: ["Count"], rows: [[2]] });
t("distinct two columns", `Logons | distinct Country, Result`, { cols: ["Country", "Result"], rows: [["US", "0"], ["DE", "50126"], ["NG", "53003"], ["DE", "0"]] });
t("distinct *", `Users | distinct * | count`, { cols: ["Count"], rows: [[5]] });
t("count renamed", `Users | count as Total`, { cols: ["Total"], rows: [[5]] });
t("sort stable multiple", `Events | sort by Host asc, EventID asc | project Host, EventID`, { cols: ["Host", "EventID"], rows: [["srv1", 1102], ["srv1", 4624], ["srv1", 4625], ["srv2", 4625], ["srv2", 4688], ["srv3", 4624]] }, { ordered: true });
/* string operators */
t("has term match", `Events | where Msg has "alice" | count`, { cols: ["Count"], rows: [[2]] });
t("has is whole-term: 'log' no match", `Events | where Msg has "log" | count`, { cols: ["Count"], rows: [[1]] });
t("contains substring", `Events | where Msg contains "log" | count`, { cols: ["Count"], rows: [[5]] });
t("has case-insensitive, has_cs sensitive", `Events | where Msg has "ALICE" | count`, { cols: ["Count"], rows: [[2]] });
t("has_cs", `Events | where Msg has_cs "ALICE" | count`, { cols: ["Count"], rows: [[0]] });
t("!has", `Events | where Msg !has "logon" | project EventID`, { cols: ["EventID"], rows: [[4688], [1102]] });
t("startswith / endswith", `Events | where Msg startswith "logon ok" and Msg endswith "carol" | project Host`, { cols: ["Host"], rows: [["srv3"]] });
t("!startswith", `Events | where Msg !startswith "logon" | count`, { cols: ["Count"], rows: [[2]] });
t("=~ case-insensitive equality", `Logons | where User =~ "ALICE" | count`, { cols: ["Count"], rows: [[3]] });
t("!~", `Logons | where User !~ "alice" | count`, { cols: ["Count"], rows: [[5]] });
t("matches regex", `Logons | where IP matches regex @"^10\\.0\\.0\\.\\d+$" | count`, { cols: ["Count"], rows: [[3]] });
t("has_any", `Events | where Msg has_any ("cleared", "powershell.exe") | project EventID`, { cols: ["EventID"], rows: [[4688], [1102]] });
t("has_all", `Events | where Msg has_all ("logon", "alice") | count`, { cols: ["Count"], rows: [[2]] });
t("has with dotted term", `Events | where Msg has "powershell.exe" | count`, { cols: ["Count"], rows: [[1]] });
t("contains_cs", `Events | where Msg contains_cs "Logon" | count`, { cols: ["Count"], rows: [[0]] });
t("string ops on dynamic property", `Logons | where Props.os has "windows" | count`, { cols: ["Count"], rows: [[3]] });
t("has on partial term is no match, contains is", `Logons | where Props.os has "win" | count`, { cols: ["Count"], rows: [[0]] });
/* time functions */
t("ago arithmetic", `print ago(1h) == datetime(2026-11-15T08:00:00Z), now() == datetime(2026-11-15T09:00:00Z)`, { cols: ["print_0", "print_1"], rows: [[true, true]] });
t("startofday / endofday", `print startofday(datetime(2026-11-14T13:22:00Z)), startofday(datetime(2026-11-14T13:22:00Z), -1)`, { cols: ["print_0", "print_1"], rows: [[d("2026-11-14"), d("2026-11-13")]] });
t("startofweek (Sunday) / startofmonth", `print startofweek(datetime(2026-11-14)), startofmonth(datetime(2026-11-14))`, { cols: ["print_0", "print_1"], rows: [[d("2026-11-08"), d("2026-11-01")]] });
t("datetime_diff days/hours/minutes", `print datetime_diff('day', datetime(2026-11-15), datetime(2026-11-10)), datetime_diff('hour', datetime(2026-11-15T09:00Z), datetime(2026-11-15T06:30Z)), datetime_diff('minute', datetime(2026-11-15T09:00Z), datetime(2026-11-15T08:40Z))`, { cols: ["print_0", "print_1", "print_2"], rows: [[5, 3, 20]] });
t("datetime_diff year/month calendar", `print datetime_diff('year', datetime(2027-01-01), datetime(2026-12-31)), datetime_diff('month', datetime(2026-11-15), datetime(2026-09-20))`, { cols: ["print_0", "print_1"], rows: [[1, 2]] });
t("datetime_add", `print datetime_add('day', 3, datetime(2026-11-29)), datetime_add('month', 1, datetime(2026-01-31))`, { cols: ["print_0", "print_1"], rows: [[d("2026-12-02"), d("2026-02-28")]] });
t("format_datetime", `print format_datetime(datetime(2026-11-05T07:08:09Z), 'yyyy-MM-dd HH:mm:ss'), format_datetime(datetime(2026-11-05T19:08:00Z), 'MM/dd/yy hh:mm tt')`, { cols: ["print_0", "print_1"], rows: [["2026-11-05 07:08:09", "11/05/26 07:08 PM"]] });
t("datetime minus datetime = timespan", `print datetime(2026-11-15T09:00Z) - datetime(2026-11-14T08:30Z)`, { cols: ["print_0"], rows: [[ts(24.5 * 3600000)]] }, { types: ["timespan"] });
t("datetime + timespan, timespan literals", `print datetime(2026-11-15) + 36h, 1d + 12h, 90m / 1h`, { cols: ["print_0", "print_1", "print_2"], rows: [[d("2026-11-16T12:00:00Z"), ts(129600000), 1.5]] });
t("bin timespan / totimespan / dayofweek", `print bin(1h + 35m, 30m), totimespan("1.02:00:00"), dayofweek(datetime(2026-11-15))`, { cols: ["print_0", "print_1", "print_2"], rows: [[ts(90 * 60000), ts(26 * 3600000), ts(0)]] });
t("hourofday / getyear / getmonth / dayofmonth", `print hourofday(datetime(2026-11-15T23:10Z)), getyear(datetime(2026-11-15)), getmonth(datetime(2026-11-15)), dayofmonth(datetime(2026-11-15))`, { cols: ["print_0", "print_1", "print_2", "print_3"], rows: [[23, 2026, 11, 15]] });
t("todatetime from string + unixtime", `print todatetime("2026-11-15 09:00") == now(), unixtime_seconds_todatetime(0)`, { cols: ["print_0", "print_1"], rows: [[true, d("1970-01-01T00:00:00Z")]] });
t("between with timespan upper bound", `Logons | where TimeGenerated between (datetime(2026-11-15T07:00Z) .. 1h) | project User`, { cols: ["User"], rows: [["bob"]] });
t("where on bin'd hour", `Events | where bin(Time, 1h) == datetime(2026-11-15T08:00Z) | count`, { cols: ["Count"], rows: [[3]] });
/* render / externaldata / getschema / serialize */
t("render accepted, ignored", `Logons | summarize count() by Country | render piechart`, { cols: ["Country", "count_"], rows: [["US", 3], ["DE", 4], ["NG", 1]] });
t("render with properties", `Logons | summarize count() by bin(TimeGenerated, 1d) | render timechart with (title="x") | count`, { cols: ["Count"], rows: [[4]] });
t("externaldata stub: empty table with schema", `externaldata(IP: string, Note: string) [@"https://example.com/iocs.csv"] with (format="csv") | getschema | project ColumnName, ColumnType`, { cols: ["ColumnName", "ColumnType"], rows: [["IP", "string"], ["Note", "string"]] }, { ordered: true });
t("externaldata leftanti against it keeps all rows", `let iocs = externaldata(IP: string) ["https://example.com/iocs.txt"]; Logons | join kind=leftanti (iocs) on IP | count`, { cols: ["Count"], rows: [[8]] });
t("getschema", `Events | getschema | project ColumnName, DataType`, { cols: ["ColumnName", "DataType"], rows: [["Time", "System.DateTime"], ["Host", "System.String"], ["EventID", "System.Int32"], ["Msg", "System.String"], ["Dur", "System.TimeSpan"], ["Score", "System.Double"], ["Ok", "System.Boolean"]] }, { ordered: true });
t("serialize + row_number", `Users | sort by User asc | serialize Rn = row_number() | where Rn <= 2 | project User, Rn`, { cols: ["User", "Rn"], rows: [["alice", 1], ["bob", 2]] }, { ordered: true });
t("comments and multi-line", `// find failures\nLogons\n| where Result != "0" // not success\n| count`, { cols: ["Count"], rows: [[3]] });
t("bracket-quoted column and multi-statement ;", `let n = 1;\nLogons | where ['Attempts'] == n | count;`, { cols: ["Count"], rows: [[5]] });
t("string literal concatenation and escapes", `print "a" "b", 'it\\'s', @"c:\\x"`, { cols: ["print_0", "print_1", "print_2"], rows: [["ab", "it's", "c:\\x"]] });

/* ---------- Part C: errors must sound like the editor ---------- */
const E = [];
const err = (name, q, re, code) => E.push({ name, q, re, code });
err("unknown table", `Logon | count`, /Failed to resolve table or column expression named 'Logon'/, "SEM0100");
err("unknown table did-you-mean", `logons | count`, /Did you mean 'Logons'/);
err("unknown column", `Logons | where Usr == "a"`, /'where' operator: Failed to resolve scalar expression named 'Usr'/, "SEM0100");
err("case-sensitive column hint", `Logons | project user`, /'project' operator: Failed to resolve scalar expression named 'user'. Column names are case-sensitive — did you mean 'User'/);
err("misspelled operator", `Logons | summarise count()`, /Query could not be parsed at 'summarise' on line \[1,10\]/, "SYN0002");
err("string vs long compare", `Events | where EventID == "4625"`, /Cannot compare values of types int and string. Try adding explicit casts/);
err("long vs string compare (SigninLogs gotcha)", `Logons | where Result == 0`, /Cannot compare values of types string and long. Try adding explicit casts/);
err("datetime vs string compare", `Logons | where TimeGenerated > "2026-11-01"`, /Cannot compare values of types datetime and string/);
err("unknown function", `Logons | extend x = tolowr(User)`, /Unknown function: 'tolowr'. Did you mean 'tolower'\?/);
err("wrong arity", `print bin(1)`, /Function 'bin' expected 2 arguments but got 1/);
err("aggregate outside summarize", `Logons | extend n = count()`, /'extend' operator: Aggregation function 'count\(\)' is not allowed in this context/);
err("non-aggregate in summarize", `Logons | summarize User`, /'summarize' operator: 'User' is not an aggregation function. Did you mean: summarize \.\.\. by User/);
err("string + string", `Logons | extend x = User + "!"`, /Operator '\+' isn't defined for operands of type string. Use strcat/);
err("dot on string column", `Events | extend x = Msg.foo`, /Cannot use '\.' on a value of type string \(column 'Msg'\). Use parse_json\(\)/);
err("missing paren", `Logons | where (Attempts > 1`, /Query could not be parsed at '<end of query>'/);
err("unterminated string", `Logons | where User == "ali`, /Unterminated string literal starting on line \[1,24\]/);
err("join key missing right", `Logons | join (Users) on IP`, /'join' operator: Failed to resolve scalar expression named 'IP' on the right side of the join/);
err("unsupported operator hint", `Logons | make-series n=count() on TimeGenerated step 1h`, /'make-series' operator isn't available in this lab — use summarize/);
err("and with non-bool side", `Logons | where User == "a" or "b"`, /Operator 'or' expects bool operands; the right side is string/);
err("let without query", `let x = 5;`, /no tabular expression to run/);
err("scalar as table", `let x = 5; x | count`, /'x' is a scalar, not a table/);
err("unquoted string value in has", `Events | where Msg has alice`, /'where' operator: Failed to resolve scalar expression named 'alice'/);
err("datatable uneven", `datatable(a:string, b:long) ["x"]`, /datatable: 1 values don't fill 2 columns evenly/);
err("dynamic literal bad", `print dynamic([1,)`, /Invalid dynamic literal/);
err("empty query", `   `, /The query is empty/);

/* ---------- Part B: independent checks on the lab's sample tables ---------- */
const B = [];
const chk = (name, q, expectFn, opts = {}) => B.push({ name, q, expectFn, ...opts });
const L = LAB_DB.tables; const col = (t, n) => L[t].cols.findIndex(c => c.name === n); const rows = t => L[t].rows;
const cnt = (t, f) => rows(t).filter(f).length;
chk("SigninLogs failures count", `SigninLogs | where ResultType != "0" | count`, () => [[cnt("SigninLogs", r => r[col("SigninLogs", "ResultType")] !== "0")]]);
chk("SigninLogs spray IP distinct users", `SigninLogs | where IPAddress == "203.0.113.57" | summarize dcount(UserPrincipalName)`, () => [[new Set(rows("SigninLogs").filter(r => r[col("SigninLogs", "IPAddress")] === "203.0.113.57").map(r => r[col("SigninLogs", "UserPrincipalName")])).size]]);
chk("SigninLogs per-country counts", `SigninLogs | summarize n = count() by Country = tostring(LocationDetails.countryOrRegion)`, () => { const m = {}; rows("SigninLogs").forEach(r => { const c = r[col("SigninLogs", "LocationDetails")].countryOrRegion; m[c] = (m[c] || 0) + 1; }); return Object.entries(m); });
chk("SigninLogs last 24h", `SigninLogs | where TimeGenerated > ago(24h) | count`, () => [[cnt("SigninLogs", r => r[0].ms > LAB_NOW - 86400000)]]);
chk("SecurityEvent 4625 by computer", `SecurityEvent | where EventID == 4625 | summarize count() by Computer`, () => { const m = {}; rows("SecurityEvent").filter(r => r[col("SecurityEvent", "EventID")] === 4625).forEach(r => { m[r[col("SecurityEvent", "Computer")]] = (m[r[col("SecurityEvent", "Computer")]] || 0) + 1; }); return Object.entries(m); });
chk("SecurityEvent distinct EventIDs sorted", `SecurityEvent | distinct EventID | sort by EventID asc`, () => [...new Set(rows("SecurityEvent").map(r => r[col("SecurityEvent", "EventID")]))].sort((a, b) => a - b).map(x => [x]), { ordered: true });
chk("SecurityEvent 4625 network logons per IP", `SecurityEvent | where EventID == 4625 and LogonType == 3 | summarize n=count() by IpAddress | where n > 10`, () => { const m = {}; rows("SecurityEvent").filter(r => r[col("SecurityEvent", "EventID")] === 4625 && r[col("SecurityEvent", "LogonType")] === 3).forEach(r => { m[r[col("SecurityEvent", "IpAddress")]] = (m[r[col("SecurityEvent", "IpAddress")]] || 0) + 1; }); return Object.entries(m).filter(([, n]) => n > 10); });
chk("DeviceProcessEvents powershell encoded", `DeviceProcessEvents | where FileName =~ "powershell.exe" and ProcessCommandLine has_any ("-enc", "-EncodedCommand") | summarize count() by DeviceName`, () => { const m = {}; const re = /(^|[^A-Za-z0-9_])-(enc|EncodedCommand)(?![A-Za-z0-9_])/i; rows("DeviceProcessEvents").filter(r => r[col("DeviceProcessEvents", "FileName")].toLowerCase() === "powershell.exe" && re.test(r[col("DeviceProcessEvents", "ProcessCommandLine")])).forEach(r => { const dn = r[col("DeviceProcessEvents", "DeviceName")]; m[dn] = (m[dn] || 0) + 1; }); return Object.entries(m); });
chk("DeviceProcessEvents office child processes", `DeviceProcessEvents | where InitiatingProcessFileName in~ ("winword.exe", "excel.exe", "outlook.exe") | summarize dcount(FileName)`, () => [[new Set(rows("DeviceProcessEvents").filter(r => ["winword.exe", "excel.exe", "outlook.exe"].includes(r[col("DeviceProcessEvents", "InitiatingProcessFileName")].toLowerCase())).map(r => r[col("DeviceProcessEvents", "FileName")])).size]]);
chk("DeviceNetworkEvents beacons to C2", `DeviceNetworkEvents | where RemoteIP == "198.51.100.77" and RemotePort == 443 | count`, () => [[cnt("DeviceNetworkEvents", r => r[col("DeviceNetworkEvents", "RemoteIP")] === "198.51.100.77" && r[col("DeviceNetworkEvents", "RemotePort")] === 443)]]);
chk("DeviceNetworkEvents public remote IPs by process", `DeviceNetworkEvents | where RemoteIPType == "Public" | summarize Dests = dcount(RemoteIP) by InitiatingProcessFileName`, () => { const m = {}; rows("DeviceNetworkEvents").filter(r => r[col("DeviceNetworkEvents", "RemoteIPType")] === "Public").forEach(r => { const p = r[col("DeviceNetworkEvents", "InitiatingProcessFileName")]; (m[p] = m[p] || new Set()).add(r[col("DeviceNetworkEvents", "RemoteIP")]); }); return Object.entries(m).map(([p, s]) => [p, s.size]); });
chk("DeviceLogonEvents failed NTLM", `DeviceLogonEvents | where ActionType == "LogonFailed" and Protocol == "NTLM" | summarize count() by RemoteIP`, () => { const m = {}; rows("DeviceLogonEvents").filter(r => r[col("DeviceLogonEvents", "ActionType")] === "LogonFailed" && r[col("DeviceLogonEvents", "Protocol")] === "NTLM").forEach(r => { m[r[col("DeviceLogonEvents", "RemoteIP")]] = (m[r[col("DeviceLogonEvents", "RemoteIP")]] || 0) + 1; }); return Object.entries(m); });
chk("DeviceLogonEvents local admins", `DeviceLogonEvents | where IsLocalAdmin == true | summarize dcount(AccountName)`, () => [[new Set(rows("DeviceLogonEvents").filter(r => r[col("DeviceLogonEvents", "IsLocalAdmin")] === true).map(r => r[col("DeviceLogonEvents", "AccountName")])).size]]);
chk("EmailEvents phish delivered to inbox", `EmailEvents | where ThreatTypes has "Phish" and DeliveryLocation == "Inbox/folder" | count`, () => [[cnt("EmailEvents", r => /(^|[^A-Za-z0-9_])phish(?![A-Za-z0-9_])/i.test(r[col("EmailEvents", "ThreatTypes")]) && r[col("EmailEvents", "DeliveryLocation")] === "Inbox/folder")]]);
chk("EmailEvents by direction", `EmailEvents | summarize count() by EmailDirection`, () => { const m = {}; rows("EmailEvents").forEach(r => { m[r[col("EmailEvents", "EmailDirection")]] = (m[r[col("EmailEvents", "EmailDirection")]] || 0) + 1; }); return Object.entries(m); });
chk("EmailEvents SPF fail senders", `EmailEvents | where AuthenticationDetails has "SPF=fail" | distinct SenderFromDomain`, () => [...new Set(rows("EmailEvents").filter(r => r[col("EmailEvents", "AuthenticationDetails")].includes("SPF=fail")).map(r => r[col("EmailEvents", "SenderFromDomain")]))].map(x => [x]));
chk("OfficeActivity downloads per user over threshold", `OfficeActivity | where Operation == "FileDownloaded" | summarize n = count() by UserId | where n >= 20`, () => { const m = {}; rows("OfficeActivity").filter(r => r[col("OfficeActivity", "Operation")] === "FileDownloaded").forEach(r => { m[r[col("OfficeActivity", "UserId")]] = (m[r[col("OfficeActivity", "UserId")]] || 0) + 1; }); return Object.entries(m).filter(([, n]) => n >= 20); });
chk("OfficeActivity inbox rules parsed", `OfficeActivity | where Operation == "New-InboxRule" | mv-expand P = parse_json(Parameters) | where P.Name == "ForwardTo" | project tostring(P.Value)`, () => rows("OfficeActivity").filter(r => r[col("OfficeActivity", "Operation")] === "New-InboxRule").flatMap(r => JSON.parse(r[col("OfficeActivity", "Parameters")]).filter(p => p.Name === "ForwardTo").map(p => [p.Value])));
chk("CommonSecurityLog deny by vendor", `CommonSecurityLog | where DeviceAction == "deny" | summarize count() by DeviceVendor`, () => { const m = {}; rows("CommonSecurityLog").filter(r => r[col("CommonSecurityLog", "DeviceAction")] === "deny").forEach(r => { m[r[col("CommonSecurityLog", "DeviceVendor")]] = (m[r[col("CommonSecurityLog", "DeviceVendor")]] || 0) + 1; }); return Object.entries(m); });
chk("CommonSecurityLog scanner distinct ports", `CommonSecurityLog | where SourceIP == "192.0.2.44" | summarize dcount(DestinationPort), min(TimeGenerated), max(TimeGenerated)`, () => { const rs = rows("CommonSecurityLog").filter(r => r[col("CommonSecurityLog", "SourceIP")] === "192.0.2.44"); return [[new Set(rs.map(r => r[col("CommonSecurityLog", "DestinationPort")])).size, new DT(Math.min(...rs.map(r => r[0].ms))), new DT(Math.max(...rs.map(r => r[0].ms)))]]; });
chk("CommonSecurityLog bytes sum", `CommonSecurityLog | where DeviceVendor == "Fortinet" | summarize sum(SentBytes)`, () => [[rows("CommonSecurityLog").filter(r => r[col("CommonSecurityLog", "DeviceVendor")] === "Fortinet").reduce((s, r) => s + r[col("CommonSecurityLog", "SentBytes")], 0)]]);
chk("AzureActivity failures by caller", `AzureActivity | where ActivityStatusValue == "Failure" | summarize count() by Caller`, () => { const m = {}; rows("AzureActivity").filter(r => r[col("AzureActivity", "ActivityStatusValue")] === "Failure").forEach(r => { m[r[col("AzureActivity", "Caller")]] = (m[r[col("AzureActivity", "Caller")]] || 0) + 1; }); return Object.entries(m); });
chk("AzureActivity NSG rule writes from public IP", `AzureActivity | where OperationNameValue has "SECURITYRULES/WRITE" and not(ipv4_is_private(CallerIpAddress)) | distinct CallerIpAddress`, () => [...new Set(rows("AzureActivity").filter(r => r[col("AzureActivity", "OperationNameValue")].includes("SECURITYRULES/WRITE") && !/^10\./.test(r[col("AzureActivity", "CallerIpAddress")])).map(r => r[col("AzureActivity", "CallerIpAddress")]))].map(x => [x]));
chk("IdentityLogonEvents failures by reason", `IdentityLogonEvents | where ActionType == "LogonFailed" | summarize count() by FailureReason`, () => { const m = {}; rows("IdentityLogonEvents").filter(r => r[col("IdentityLogonEvents", "ActionType")] === "LogonFailed").forEach(r => { m[r[col("IdentityLogonEvents", "FailureReason")]] = (m[r[col("IdentityLogonEvents", "FailureReason")]] || 0) + 1; }); return Object.entries(m); });
chk("SecurityAlert high severity by provider", `SecurityAlert | where AlertSeverity == "High" | summarize count() by ProviderName`, () => { const m = {}; rows("SecurityAlert").filter(r => r[col("SecurityAlert", "AlertSeverity")] === "High").forEach(r => { m[r[col("SecurityAlert", "ProviderName")]] = (m[r[col("SecurityAlert", "ProviderName")]] || 0) + 1; }); return Object.entries(m); });
chk("SecurityAlert entities host names", `SecurityAlert | mv-expand E = parse_json(Entities) | where E.Type == "host" | summarize dcount(tostring(E.HostName))`, () => [[new Set(rows("SecurityAlert").flatMap(r => JSON.parse(r[col("SecurityAlert", "Entities")]).filter(e => e.Type === "host").map(e => e.HostName))).size]]);
chk("SecurityAlert tactics split", `SecurityAlert | mv-expand T = split(Tactics, ",") to typeof(string) | summarize count() by T`, () => { const m = {}; rows("SecurityAlert").forEach(r => r[col("SecurityAlert", "Tactics")].split(",").forEach(x => { m[x] = (m[x] || 0) + 1; })); return Object.entries(m); });
chk("SecurityIncident current state by status", `SecurityIncident | summarize arg_max(LastModifiedTime, *) by IncidentNumber | summarize count() by Status`, () => { const last = {}; rows("SecurityIncident").forEach(r => { const n = r[col("SecurityIncident", "IncidentNumber")]; const lm = r[col("SecurityIncident", "LastModifiedTime")].ms; if (!last[n] || lm > last[n].ms) last[n] = { ms: lm, st: r[col("SecurityIncident", "Status")] }; }); const m = {}; Object.values(last).forEach(x => { m[x.st] = (m[x.st] || 0) + 1; }); return Object.entries(m); });
chk("SecurityIncident closed as FalsePositive", `SecurityIncident | where Status == "Closed" and Classification == "FalsePositive" | distinct IncidentNumber | count`, () => [[new Set(rows("SecurityIncident").filter(r => r[col("SecurityIncident", "Status")] === "Closed" && r[col("SecurityIncident", "Classification")] === "FalsePositive").map(r => r[col("SecurityIncident", "IncidentNumber")])).size]]);
chk("SecurityIncident join alerts via mv-expand", `SecurityIncident | where IncidentNumber == 4104 | summarize arg_max(LastModifiedTime, AlertIds) | mv-expand AlertId = AlertIds to typeof(string) | join kind=inner (SecurityAlert | project SystemAlertId, AlertName) on $left.AlertId == $right.SystemAlertId | summarize dcount(AlertName)`, () => { const rs = rows("SecurityIncident").filter(r => r[col("SecurityIncident", "IncidentNumber")] === 4104); const latest = rs.reduce((a, r) => !a || r[col("SecurityIncident", "LastModifiedTime")].ms > a[col("SecurityIncident", "LastModifiedTime")].ms ? r : a, null); const ids = new Set(latest[col("SecurityIncident", "AlertIds")]); return [[new Set(rows("SecurityAlert").filter(r => ids.has(r[col("SecurityAlert", "SystemAlertId")])).map(r => r[col("SecurityAlert", "AlertName")])).size]]; });
chk("union Device tables by device", `union DeviceProcessEvents, DeviceNetworkEvents, DeviceLogonEvents | where DeviceName startswith "fab-wks-117" | summarize count() by Type = iff(isnotempty(FileName), "proc", iff(isnotempty(RemoteIP) and isnotempty(InitiatingProcessFileName) and isempty(AccountName), "net", "logon"))`, () => { const w = n => rows(n).filter(r => r[col(n, "DeviceName")].startsWith("fab-wks-117")).length; return [["proc", w("DeviceProcessEvents")], ["net", w("DeviceNetworkEvents")], ["logon", w("DeviceLogonEvents")]]; });
chk("SigninLogs hourly bins count", `SigninLogs | where TimeGenerated > ago(7d) | summarize count() by bin(TimeGenerated, 1h) | count`, () => [[new Set(rows("SigninLogs").filter(r => r[0].ms > LAB_NOW - 7 * 86400000).map(r => Math.floor(r[0].ms / 3600000))).size]]);
chk("top 3 by count ordered", `SecurityAlert | summarize n = count() by AlertName | top 3 by n desc`, () => { const m = {}; rows("SecurityAlert").forEach(r => { m[r[col("SecurityAlert", "AlertName")]] = (m[r[col("SecurityAlert", "AlertName")]] || 0) + 1; }); const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]); const third = sorted[2][1]; return { top: sorted.slice(0, 3), third, all: sorted }; }, { custom: true });

/* ---------- runner ---------- */
let pass = 0, fail = 0; const failures = [];
const near = (a, b) => typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-9 : false;
function expected(exp) { return { cols: exp.cols.map(n => ({ name: n, type: null })), rows: exp.rows }; }
for (const tc of A) {
  try {
    const r = runKql(tc.q, FIX);
    const cmp = sameResult(r, expected(tc.exp), { ordered: !!tc.ordered, names: true });
    let ok = cmp.ok;
    /* sameResult treats reals exactly; allow float wiggle by a second pass */
    if (!ok && r.rows.length === tc.exp.rows.length && r.cols.length === tc.exp.cols.length) {
      const flat = x => x.rows.map(row => row.map(v => typeof v === "number" ? +v.toFixed(9) : fmtValue(v)).join("|")).sort().join("\n");
      ok = flat(r) === flat({ rows: tc.exp.rows }) && r.cols.map(c => c.name).sort().join() === tc.exp.cols.slice().sort().join();
    }
    if (ok && tc.types) tc.types.forEach((ty, i) => { if (ty && r.cols[i].type !== ty) { ok = false; cmp.why = `column ${i} type ${r.cols[i].type}, expected ${ty}`; } });
    if (ok) pass++; else { fail++; failures.push(`A ✗ ${tc.name}\n   ${tc.q}\n   ${cmp.why}\n   got: ${JSON.stringify(r.cols.map(c => c.name))} ${JSON.stringify(r.rows.slice(0, 6).map(row => row.map(v => fmtValue(v))))}`); }
  } catch (e) { fail++; failures.push(`A ✗ ${tc.name}\n   ${tc.q}\n   threw: ${e.message.split("\n")[0]}${e instanceof KqlError ? "" : "\n" + e.stack}`); }
}
for (const tc of E) {
  try { runKql(tc.q, FIX); fail++; failures.push(`C ✗ ${tc.name}: no error thrown`); }
  catch (e) { if (e instanceof KqlError && tc.re.test(e.message) && (!tc.code || e.code === tc.code)) pass++; else { fail++; failures.push(`C ✗ ${tc.name}\n   got: ${e.message.split("\n")[0]} [${e.code}]\n   want: ${tc.re}`); } }
}
for (const tc of B) {
  try {
    const r = runKql(tc.q, LAB_DB);
    if (tc.custom) { const exp = tc.expectFn(); const got = r.rows.map(x => [x[0], x[1]]); const ok = got.length === 3 && got.every((g, i) => g[1] === exp.top[i][1]) && got[0][1] >= got[1][1] && got[1][1] >= got[2][1]; if (ok) pass++; else { fail++; failures.push(`B ✗ ${tc.name}: got ${JSON.stringify(got)} want counts ${JSON.stringify(exp.top)}`); } continue; }
    const exp = tc.expectFn().map(row => row.map(v => typeof v === "string" && /^\d+$/.test(v) && false ? +v : v));
    const cmp = sameResult(r, { cols: r.cols.map(c => ({ name: c.name })), rows: exp }, { ordered: !!tc.ordered });
    if (cmp.ok) pass++; else { fail++; failures.push(`B ✗ ${tc.name}\n   ${tc.q}\n   ${cmp.why}\n   got ${r.rows.length} rows: ${JSON.stringify(r.rows.slice(0, 5).map(row => row.map(v => fmtValue(v))))}\n   exp ${exp.length} rows: ${JSON.stringify(exp.slice(0, 5).map(row => row.map(v => fmtValue(v))))}`); }
  } catch (e) { fail++; failures.push(`B ✗ ${tc.name}\n   ${tc.q}\n   threw: ${e.message.split("\n")[0]}${e instanceof KqlError ? "" : "\n" + e.stack}`); }
}
const total = A.length + E.length + B.length;
console.log(`KQL conformance: ${pass}/${total} passed (${A.length} literal · ${E.length} error-message · ${B.length} independent on sample tables)`);
failures.forEach(f => console.log(f));
if (fail) { console.log(`FAIL (${fail})`); process.exit(1); }
console.log("PASS");
