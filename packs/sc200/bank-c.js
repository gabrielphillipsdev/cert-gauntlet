/* SC-200 Exam Bank C — KQL and hunting heavy, everything else at exam proportion.
   50 question units: case study (8) first, 38 standalone, solution series (4) last. */
export const SC200_BANK_C = [
{id:"c001",t:"case",title:"Tailspin Toys credential stuffing and mailbox-rule BEC",
 tabs:{
  overview:"Tailspin Toys is a retail company with 4,000 employees and an online store. The security operations team works in the unified Microsoft Defender portal. A Microsoft Sentinel workspace named ts-sentinel is onboarded to the Microsoft Sentinel data lake. Two days ago the finance team reported that a supplier received payment-change instructions from a Tailspin accounts-payable mailbox. The SOC suspects that a wave of failed Microsoft Entra sign-ins from a single public address was credential stuffing, that at least one account was compromised, and that an inbox rule was then created to hide the supplier's replies. The SOC lead wants the investigation finished and the gaps that allowed it fixed.",
  environment:"ts-sentinel is on the Analytics tier with 90 days of analytics retention and two years of total retention, so every analytics table is mirrored to the data lake for two years. Tables in use: SigninLogs and AuditLogs from the Microsoft Entra connector; OfficeActivity from the Microsoft 365 connector (Exchange, SharePoint, Teams); EmailEvents, DeviceLogonEvents, DeviceProcessEvents and CloudAppEvents from Defender XDR; CommonSecurityLog from the online store's web application firewall through the CEF via AMA connector; and FraudApp_CL, a custom table from the store's fraud engine that is set to the Data lake tier only, with two years of retention. SOC analysts hold the Microsoft Sentinel Responder role. One SOC engineer holds Microsoft Sentinel Contributor and Logic App Contributor. A data scientist named Dana uses Visual Studio Code and has no Azure RBAC role on the workspace. Microsoft Purview Audit (Standard) is enabled; the SOC analysts hold the View-Only Audit Logs role in Purview.",
  requirements:"R1. Produce a daily count of failed sign-ins per user and per country, store it in a table that analysts and workbooks can query for two years, and add as little ingestion cost as possible. R2. Alert on the creation or modification of an Exchange Online inbox rule within five minutes of the audit record arriving in the workspace. R3. Analysts must be able to hunt across FraudApp_CL and across SigninLogs data that is older than 90 days without re-ingesting it into the Analytics tier. R4. An analyst who finds a high-value hunting query must be able to turn it into a detection without rewriting the query. R5. Dana must be able to explore FraudApp_CL in a notebook, write the derived results to a custom table, and have the notebook run automatically every Monday. R6. The web application firewall sends a DeviceEventClassID of healthcheck every ten seconds from each node; these rows must never be stored in CommonSecurityLog.",
  issues:"I1. A query that joins SigninLogs to OfficeActivity on the user principal name returns zero rows, although both tables contain rows for the same accounts. SigninLogs stores the UPN in lower case and OfficeActivity stores it in the case the user typed at sign-in. I2. A scheduled analytics rule named Failed sign-in burst runs every hour, uses Trigger an alert for each event, and created 1,900 incidents on the night of the attack. I3. A hunting query over 180 days of CommonSecurityLog on the Hunting page times out before returning results. I4. An analyst tried to create a Defender XDR custom detection rule from a CloudAppEvents query and the wizard refused the query, reporting that it could not map an impacted entity."},
 questions:[
 {id:"c001-1",d:1,obj:"1.3.4",cat:"ingest",t:"mc",
  q:"You need to meet requirement R6 for the web application firewall feed. The CEF via AMA data collection rule currently contains the dataFlows block shown in the exhibit. What should you do?",
  ex:"\"dataFlows\": [\n  {\n    \"streams\": [ \"Microsoft-CommonSecurityLog\" ],\n    \"destinations\": [ \"ts-sentinel\" ],\n    \"transformKql\": \"source\"\n  }\n]",
  o:[
   {t:"Change transformKql to: source | where DeviceEventClassID != \"healthcheck\"",ok:true,x:"A DCR transformation runs KQL against each incoming record before it is stored, so a where clause on the source table drops the health-check rows and they are never ingested or billed, which is exactly what R6 asks for."},
   {t:"Add a where clause that excludes healthcheck to every analytics rule that reads CommonSecurityLog",ok:false,x:"That hides the rows from detections but they are still ingested and stored, which violates the requirement that they never be stored in CommonSecurityLog."},
   {t:"Create a summary rule that aggregates CommonSecurityLog without the healthcheck rows",ok:false,x:"A summary rule writes aggregated results to a new _CL table; the raw CommonSecurityLog rows, including the health checks, are still stored."},
   {t:"Schedule a KQL job that deletes healthcheck rows from CommonSecurityLog every hour",ok:false,x:"KQL jobs read lake data and write results to a new table; they cannot delete rows from an existing table, and the rows would already have been ingested."}
  ],
  w:"To keep rows out of a table entirely, filter them in the DCR transformKql on the source stream; rules, summary rules, and jobs all act after ingestion."},
 {id:"c001-2",d:1,obj:"1.4.3",cat:"detect",t:"mc",
  q:"You need to stop the incident flood described in issue I2 without losing visibility of the users involved. The rule query already returns one row per failed sign-in with UserPrincipalName and IPAddress. What should you change in the rule?",
  o:[
   {t:"Set Event grouping to Group all events into a single alert and set an alert threshold",ok:true,x:"With one alert per event, every failed sign-in became its own alert and incident. Grouping all results of a run into one alert collapses the burst into a single alert per hour, and a threshold stops normal volumes from alerting at all."},
   {t:"Change the rule to run every 5 minutes with a 5-minute lookback",ok:false,x:"Shortening the interval does nothing about the per-event grouping; each run would still emit one alert per row, just in smaller batches throughout the night."},
   {t:"Convert the rule to an NRT rule",ok:false,x:"NRT rules also support per-event alerts and cap at 30 alerts per run, so a burst would be summarized awkwardly rather than grouped on purpose, and NRT does not change the grouping the rule already has."},
   {t:"Lower the rule severity to Informational",ok:false,x:"Severity changes how incidents are prioritized, not how many are created; 1,900 informational incidents are still 1,900 incidents."}
  ],
  w:"Event grouping decides how many alerts one rule run creates: all-events-in-one versus one-per-event. Alert grouping then decides how alerts roll into incidents."},
 {id:"c001-3",d:1,obj:"1.4.3",cat:"detect",t:"mc",
  q:"You need to meet requirement R2 for inbox rules. The detection query reads OfficeActivity where Operation is New-InboxRule or Set-InboxRule. Which rule type should you create?",
  o:[
   {t:"A near-real-time (NRT) analytics rule",ok:true,x:"NRT rules run once every minute over the data ingested in the previous minute, on a short fixed delay, so an inbox-rule audit record is evaluated well inside the five-minute window R2 demands."},
   {t:"A scheduled analytics rule that runs every 5 minutes with a 5-minute lookback",ok:false,x:"Five minutes is the shortest scheduled interval, but the run itself starts only after a built-in delay, so a record that arrives just after a run can take longer than five minutes to be evaluated."},
   {t:"A Defender XDR custom detection rule that runs every hour",ok:false,x:"An hourly frequency can leave a new inbox rule undetected for most of an hour, far outside the five-minute requirement."},
   {t:"A Fusion machine-learning rule",ok:false,x:"Fusion correlates existing alerts across products into multistage incidents; it does not evaluate a custom OfficeActivity query on a schedule."}
  ],
  w:"When a Sentinel detection must fire within minutes of ingestion, choose NRT (runs every minute); scheduled rules start at five minutes plus delay."},
 {id:"c001-4",d:3,obj:"3.1.2",cat:"kql",t:"mc",
  q:"You run the query in the exhibit to find users who created an inbox rule after a burst of failed sign-ins. It returns zero rows, which matches issue I1. You need the query to return matching users. What should you do?",
  ex:"let failed = SigninLogs\n  | where TimeGenerated > ago(1d) and ResultType != \"0\"\n  | summarize Failures=count() by UserPrincipalName;\nOfficeActivity\n| where TimeGenerated > ago(1d)\n| where Operation in (\"New-InboxRule\", \"Set-InboxRule\")\n| join kind=inner failed on $left.UserId == $right.UserPrincipalName\n| project TimeGenerated, UserId, Failures",
  o:[
   {t:"Add extend User = tolower(UserId) and extend User = tolower(UserPrincipalName) to each side, then join on User",ok:true,x:"Join keys are compared with case-sensitive equality. Normalizing both UPNs to lower case before the join makes Ana.Diaz@tailspin.com and ana.diaz@tailspin.com match."},
   {t:"Change kind=inner to kind=leftouter",ok:false,x:"A left outer join would return every inbox-rule row, but Failures would be empty for all of them because the keys still never match; it hides the problem instead of fixing it."},
   {t:"Replace == with =~ in the on clause",ok:false,x:"The join on clause only accepts equality on column names or $left/$right expressions; the case-insensitive =~ operator is not valid there."},
   {t:"Replace in with has in the Operation filter",ok:false,x:"The Operation filter is already matching the right rows; the zero-row result comes from the key comparison in the join, not from the operator filter."}
  ],
  w:"KQL string equality and join keys are case-sensitive. When two tables store the same identity in different case, tolower() both sides before you join."},
 {id:"c001-5",d:3,obj:"3.2.3",cat:"senthunt",t:"mc",
  q:"You need to meet requirement R1 by using the query in the exhibit. What should you create?",
  ex:"SigninLogs\n| where ResultType != \"0\"\n| summarize FailedSignIns=count()\n    by UserPrincipalName, Location, bin(TimeGenerated, 1d)",
  o:[
   {t:"A summary rule with a 1440-minute bin that writes to a custom table named SigninFailDaily_CL",ok:true,x:"Summary rules run an aggregation query on a bin schedule and store the much smaller result set in an Analytics-plan _CL table that hunting queries and workbooks can read; only the aggregate is ingested, so the added cost is minimal."},
   {t:"A scheduled analytics rule that runs once a day with incident creation disabled",ok:false,x:"A scheduled rule turns query results into alerts in SecurityAlert; it does not persist the aggregated rows into a table that workbooks can query for two years."},
   {t:"A one-time KQL job that writes the aggregate to the Analytics tier",ok:false,x:"A one-time job produces a single snapshot; R1 needs a daily count that keeps accumulating, which requires a recurring mechanism."},
   {t:"A change of the SigninLogs table to the Data lake tier",ok:false,x:"Moving SigninLogs to the lake tier would lower storage cost but would stop analytics rules and hunting queries from using it and does not produce the daily aggregate at all."}
  ],
  w:"Daily aggregate into a cheap, queryable Analytics table = summary rule (bins from 20 minutes to 1 day, destination must be a _CL table)."},
 {id:"c001-6",d:2,obj:"2.1.5",cat:"xdrresp",t:"mc",
  q:"You run the query in the exhibit over the hour of the attack described in the overview. Based on the output, what should you do next to identify compromised accounts?",
  ex:"SigninLogs\n| where TimeGenerated > ago(1h) and ResultType == \"50126\"\n| summarize Attempts=count(), Users=dcount(UserPrincipalName) by IPAddress\n| top 3 by Attempts\n\nIPAddress       Attempts  Users\n203.0.113.77    1412      1390\n198.51.100.9    38        2\n192.0.2.140     21        1",
  o:[
   {t:"Query SigninLogs for ResultType 0 from 203.0.113.77 in the same window and review those users in Risky users",ok:true,x:"One address tried about one password against 1,390 different accounts, which is the credential-stuffing shape. The accounts that matter are the few that returned success (ResultType 0) from that same address; those users should be confirmed compromised and remediated."},
   {t:"Disable all 1,390 user accounts that received a failed sign-in from 203.0.113.77",ok:false,x:"A failed attempt does not mean the account was compromised; disabling 1,390 users would be a self-inflicted outage while the real compromised accounts are the ones that succeeded."},
   {t:"Isolate the devices that the 1,390 users signed in from",ok:false,x:"The attempts came from an internet address, not from managed devices; device isolation addresses endpoint compromise, not credential replay against Entra ID."},
   {t:"Focus on 192.0.2.140 because repeated failures against one user indicate the account is compromised",ok:false,x:"Twenty-one failures against one account is a brute-force attempt, not evidence of compromise, and it is tiny compared with the stuffing wave from 203.0.113.77."}
  ],
  w:"Many users, one attempt each, one source = credential stuffing. The investigation pivot is the successful sign-ins from that source, not the failures."},
 {id:"c001-7",d:2,obj:"2.3.1",cat:"m365inv",t:"mc",
  q:"Finance now believes a similar inbox rule was created on another mailbox 120 days ago. An analyst with the permissions described in the environment tab must confirm who created it and from which IP address. What should the analyst use?",
  o:[
   {t:"Search in Microsoft Purview Audit for inbox-rule activities on that mailbox",ok:true,x:"Audit (Standard) retains records for 180 days, so a 120-day-old New-InboxRule record is still searchable, and the View-Only Audit Logs role is enough to run the search and read the user and ClientIP."},
   {t:"Run a query against OfficeActivity from the Hunting page",ok:false,x:"The Hunting page reads the Analytics tier, which only holds 90 days for this workspace, and a Responder cannot see a 120-day-old record there."},
   {t:"Run a Content search in Microsoft Purview eDiscovery for the mailbox",ok:false,x:"Content search returns mailbox items such as messages and attachments; it does not return audit records about who created a rule or from which address."},
   {t:"Query MicrosoftGraphActivityLogs for the mailbox",ok:false,x:"Graph activity logs record HTTP requests made to Microsoft Graph; an inbox rule created through Outlook or Exchange PowerShell is an Exchange audit event, not a Graph request, and the table is not in this workspace."}
  ],
  w:"Audit (Standard) = 180 days in Purview. When Sentinel analytics retention has expired but Purview has not, search the audit log."},
 {id:"c001-8",d:3,obj:"3.2.4",cat:"senthunt",t:"build",
  q:"You need to enable Dana to meet requirement R5. Which four actions should you perform in sequence? Select the actions from the list and arrange them in order.",
  pool:["Install the Microsoft Sentinel extension for Visual Studio Code","Create a notebook that reads FraudApp_CL from the data lake through MicrosoftSentinelProvider","Write the derived results to a custom table with save_as_table","Schedule the notebook as a job that runs every Monday from the extension","Create a livestream session for the notebook query","Change FraudApp_CL to the Analytics tier","Grant Dana the Microsoft Sentinel Playbook Operator role"],
  answer:[0,1,2,3],ordered:true,
  x:"Data lake notebooks run from the Microsoft Sentinel extension in Visual Studio Code, read lake-tier tables through the MicrosoftSentinelProvider PySpark library, write results to custom tables with save_as_table, and can be scheduled as recurring jobs. Livestream is no longer available, moving the table to the Analytics tier would re-ingest it against R3, and Playbook Operator only lets a user run playbooks. Dana also needs a Sentinel data-lake Entra role; Playbook Operator is not it.",
  w:"Lake notebooks: VS Code extension, MicrosoftSentinelProvider to read, save_as_table to write, schedule as a job. No tier change needed to analyze lake-only tables."}
 ]},
{id:"c002",d:2,obj:"2.1.7",cat:"xdrresp",t:"mc",
 q:"You have a Microsoft Sentinel workspace. You run the query in the exhibit. What does the query return?",
 ex:"SecurityIncident\n| summarize arg_max(TimeGenerated, *) by IncidentNumber\n| where Status != \"Closed\" and Severity == \"High\"\n| project IncidentNumber, Title, Owner, LastModifiedTime\n\nIncidentNumber  Title                               Owner             LastModifiedTime\n4412            Suspicious inbox rule created       ana.diaz@...      2026-09-29 08:14\n4409            Multiple failed logons from one IP  (unassigned)      2026-09-29 07:51\n4388            Anomalous token usage               rob.lee@...       2026-09-28 22:05",
 o:[
  {t:"The latest state of every high-severity incident that is not closed",ok:true,x:"SecurityIncident stores one row per change to an incident, so arg_max(TimeGenerated, *) by IncidentNumber keeps only the most recent row per incident; the filters then keep the ones currently high and open."},
  {t:"Every update ever made to high-severity incidents",ok:false,x:"The summarize with arg_max collapses the history to a single row per incident, so historical updates are discarded, not listed."},
  {t:"Incidents that were high severity at any point in their history",ok:false,x:"Because the severity filter is applied after arg_max, only the current severity is evaluated; an incident that was downgraded to Medium is excluded."},
  {t:"Only incidents that have been assigned an owner",ok:false,x:"Nothing filters on Owner; incident 4409 is unassigned and still appears in the output."}
 ],
 w:"SecurityIncident is an append-only change log. Always summarize arg_max(TimeGenerated, *) by IncidentNumber before filtering on current status or severity."},
{id:"c003",d:1,obj:"1.4.1",cat:"detect",t:"mc",
 q:"You attempt to save the query in the exhibit as a Microsoft Defender XDR custom detection rule with a frequency of Continuous (NRT). The wizard rejects the query. You need to keep the detection continuous. What should you do?",
 ex:"// flag LSASS access from unsigned binaries\nDeviceEvents\n| where ActionType == \"OpenProcessApiCall\" and FileName =~ \"lsass.exe\"\n| join kind=inner (DeviceFileEvents | project SHA1, FolderPath) on SHA1\n| project Timestamp, DeviceId, ReportId, InitiatingProcessFileName, FolderPath",
 o:[
  {t:"Remove the join and the comment so that the query reads a single table",ok:true,x:"Continuous frequency requires a query that references only one table, uses no joins, unions, or externaldata, and contains no comments. Both the join to DeviceFileEvents and the leading comment make it ineligible."},
  {t:"Add ingestion_time() to the where clause",ok:false,x:"ingestion_time() is a common pattern for scheduled custom detections, but it does not lift the single-table restriction that Continuous frequency imposes."},
  {t:"Change the frequency to Every hour and keep the query unchanged",ok:false,x:"That would make the query valid, but the requirement is to keep the detection continuous, which hourly runs do not provide."},
  {t:"Replace kind=inner with kind=leftouter",ok:false,x:"Any join is disallowed for Continuous frequency, regardless of its kind, and the comment would still block the save."}
 ],
 w:"Custom detection Continuous (NRT) frequency = one table, no join/union/externaldata, no comments. Multi-table logic needs a scheduled frequency."},
{id:"c004",d:3,obj:"3.1.1",cat:"kql",t:"mc",
 q:"You need to write an advanced hunting query that lists every Remote Desktop sign-in to a file server named FS01 during the last 24 hours, including the source IP address and whether the account is a local administrator. Which table should you query?",
 o:[
  {t:"DeviceLogonEvents",ok:true,x:"DeviceLogonEvents records logons on onboarded devices with LogonType (RemoteInteractive for RDP), RemoteIP, AccountName, and the IsLocalAdmin flag, which is everything the question asks for."},
  {t:"DeviceNetworkEvents",ok:false,x:"DeviceNetworkEvents shows connections such as inbound TCP 3389, but it does not record the account that authenticated or whether it is a local administrator."},
  {t:"IdentityLogonEvents",ok:false,x:"IdentityLogonEvents comes from Defender for Identity and Defender for Cloud Apps and covers Active Directory and cloud authentications; it has no local-administrator flag for a device session."},
  {t:"DeviceProcessEvents",ok:false,x:"DeviceProcessEvents captures process creation; an RDP logon does not necessarily create a process that identifies the remote source address and logon type."}
 ],
 w:"Device logons with LogonType, RemoteIP, and IsLocalAdmin live in DeviceLogonEvents; identity-side authentications (AD, cloud) live in IdentityLogonEvents."},
{id:"c005",d:2,obj:"2.1.5",cat:"xdrresp",t:"mc",
 q:"You investigate a user named Rob Lee after the output in the exhibit. The sign-in used a token from a hosting provider in a country where Rob has never worked. Rob confirms by phone that he did not sign in. What should you do first?",
 ex:"SigninLogs\n| where UserPrincipalName =~ \"rob.lee@tailspin.com\" and TimeGenerated > ago(6h)\n| project TimeGenerated, IPAddress, Location, RiskLevelDuringSignIn, RiskState, ResultType\n\nTimeGenerated     IPAddress      Location  RiskLevelDuringSignIn  RiskState  ResultType\n2026-09-29 06:02  198.51.100.23  US        none                   none       0\n2026-09-29 06:41  203.0.113.90   XX        high                   atRisk     0\n2026-09-29 06:43  203.0.113.90   XX        high                   atRisk     0",
 o:[
  {t:"Confirm the user as compromised so that Entra ID Protection raises the user risk to high and the risk policies apply",ok:true,x:"A successful high-risk sign-in that the user denies is a confirmed compromise. Confirming it sets the user risk to high, which drives the configured user-risk policy (block or forced password change) and marks the detection as true."},
  {t:"Dismiss the risky sign-in because the password was entered correctly",ok:false,x:"A correct password from an unexpected location is exactly what a stolen credential looks like; dismissing the risk tells the system the sign-in was benign and leaves the attacker signed in."},
  {t:"Isolate Rob's laptop",ok:false,x:"The suspicious sign-ins came from 203.0.113.90, not from Rob's device at 198.51.100.23; isolating the laptop would not revoke the attacker's session."},
  {t:"Add 203.0.113.90 to the Defender for Endpoint indicator list",ok:false,x:"An IP indicator blocks device traffic to that address; it has no effect on an attacker authenticating to Entra ID from it."}
 ],
 w:"Successful sign-in + high risk + user denies it = confirm compromised. Then reset the password and revoke sessions; device actions do not address identity compromise."},
{id:"c006",d:1,obj:"1.4.1",cat:"detect",t:"ms",pick:2,
 q:"You create the advanced hunting query in the exhibit and attempt to save it as a custom detection rule that isolates the device when it matches. The wizard cannot map an impacted device for the Isolate device action and the alert timeline shows no triggering event. Which two changes should you make? Each correct answer presents part of the solution.",
 ex:"DeviceProcessEvents\n| where ingestion_time() > ago(1h)\n| where FileName =~ \"certutil.exe\" and ProcessCommandLine has \"urlcache\"\n| summarize Hits=count() by DeviceName\n| where Hits > 3",
 o:[
  {t:"Return the Timestamp and ReportId columns, for example with arg_max(Timestamp, ReportId)",ok:true,x:"Custom detections should return Timestamp (or TimeGenerated) and ReportId from the triggering event so the alert is stamped correctly and the timeline is enriched; summarize dropped both."},
  {t:"Return the DeviceId column so the rule can identify the impacted device",ok:true,x:"Device actions such as isolation require an impacted-device identifier; DeviceId is what the rule uses to target the device and apply device-group scoping."},
  {t:"Replace ingestion_time() with Timestamp in the time filter",ok:false,x:"The custom detection service already evaluates ingestion_time() to handle late-arriving events, so the filter is redundant but harmless; it is not why the rule fails."},
  {t:"Replace has with contains in the command-line filter",ok:false,x:"has matches the whole term urlcache and is faster; the operator choice has nothing to do with the required columns."},
  {t:"Remove the summarize operator entirely",ok:false,x:"Aggregation is allowed as long as the required columns survive it; the fix is to carry Timestamp, ReportId, and DeviceId through the summarize, not to drop the threshold logic."},
  {t:"Add a project-away for ProcessCommandLine",ok:false,x:"Removing a column does nothing to satisfy the identifier requirement; the query lacks columns, it does not have too many."}
 ],
 w:"Custom detections should carry Timestamp, ReportId and an impacted-entity column such as DeviceId; device actions act on the DeviceId column."},
{id:"c007",d:2,obj:"2.3.3",cat:"m365inv",t:"mc",
 q:"Microsoft Graph activity logs are sent to your Microsoft Sentinel workspace through a diagnostic setting. You run the query in the exhibit. What does the output most likely indicate?",
 ex:"MicrosoftGraphActivityLogs\n| where TimeGenerated > ago(1h)\n| where RequestUri has \"/users\" and RequestMethod == \"GET\"\n| summarize Requests=count(), Codes=make_set(ResponseStatusCode) by AppId, IPAddress\n| top 3 by Requests\n\nAppId                                 IPAddress      Requests  Codes\n6f1c…-app-ledger                      203.0.113.44   9120      [200]\n0a7e…-app-intranet                    192.0.2.17     41        [200]\nb3d2…-app-hr                          192.0.2.30     12        [200,404]",
 o:[
  {t:"An application is enumerating the directory's user objects at high volume from a public address",ok:true,x:"Thousands of successful GET requests to /users from one app and one external IP in an hour is the signature of directory enumeration by a consented or compromised application, a classic reconnaissance step."},
  {t:"Users are failing to authenticate to Microsoft Graph",ok:false,x:"The response codes are 200, meaning each request succeeded; authentication failures would show 401 responses."},
  {t:"The intranet app has been granted excessive Graph permissions",ok:false,x:"Graph activity logs record requests, not permission grants; 41 successful requests does not by itself reveal what scopes the intranet app holds."},
  {t:"The HR app is being used for a password spray",ok:false,x:"Password spray shows up in sign-in logs as authentication failures; GET requests to /users with 200 and 404 responses are directory reads, not sign-in attempts."}
 ],
 w:"MicrosoftGraphActivityLogs shows every Graph API request (RequestUri, AppId, ResponseStatusCode). A high count of successful /users reads from one app is enumeration, not sign-in failure."},
{id:"c008",d:2,obj:"2.1.4",cat:"xdrresp",t:"mc",
 q:"The query in the exhibit shows activity captured by Microsoft Defender for Cloud Apps for a SharePoint site that stores supplier contracts. The account belongs to a contractor whose engagement ended yesterday. Which response should you take in the Microsoft Defender portal first?",
 ex:"CloudAppEvents\n| where Timestamp > ago(2h) and ActionType == \"FileDownloaded\"\n| summarize Files=count(), Sites=dcount(ObjectName) by AccountDisplayName, IPAddress, ISP\n\nAccountDisplayName  IPAddress      ISP            Files  Sites\nJ. Okafor           203.0.113.201  Example Hosting  742    1\nM. Chen             192.0.2.55     Tailspin Corp    6      2\nP. Rossi            192.0.2.71     Tailspin Corp    3      1",
 o:[
  {t:"Suspend the contractor's account and revoke the active sessions from the user page",ok:true,x:"A departed contractor pulling 742 files from a hosting-provider address is an exfiltration in progress; suspending the account and revoking sessions stops it immediately while you investigate what was taken."},
  {t:"Create a Defender for Cloud Apps file policy to label the contracts as Confidential",ok:false,x:"A file policy improves governance for the future but does nothing to stop the downloads that are happening right now."},
  {t:"Isolate the device at 203.0.113.201",ok:false,x:"That address belongs to a hosting provider and is not an onboarded device, so there is nothing for Defender for Endpoint to isolate."},
  {t:"Investigate M. Chen because two different sites were accessed",ok:false,x:"Six downloads across two sites from the corporate network is ordinary behavior; the volume and the external source make J. Okafor the obvious priority."}
 ],
 w:"CloudAppEvents gives per-user, per-IP, per-ISP activity counts. Mass download from a non-corporate ISP by a leaver = contain the identity first, then scope the data."},
{id:"c009",d:1,obj:"1.4.3",cat:"detect",t:"mc",
 q:"A scheduled analytics rule is configured as shown in the exhibit. Analysts report that the rule misses most of the events it should alert on. You need to fix the rule. What should you do?",
 ex:"Rule: Service account interactive logon\nRun query every:        1 hour\nLookup data from last:  15 minutes\nEvent grouping:         Group all events into a single alert\nAlert threshold:        greater than 0\nQuery:\n  SecurityEvent\n  | where EventID == 4624 and LogonType == 2\n  | where Account startswith \"svc-\"",
 o:[
  {t:"Set the lookup period to at least 1 hour so that it is not shorter than the run interval",ok:true,x:"Each run only examines the lookup window. With an hourly run and a 15-minute window, 45 minutes of every hour are never evaluated. The lookback must be equal to or longer than the frequency."},
  {t:"Change the run interval to 15 minutes to match the lookup period",ok:false,x:"That would also close the gap, but it quadruples rule executions; the recommended fix is to extend the lookback, not to shorten the frequency to fit a too-small window."},
  {t:"Set the alert threshold to greater than 1",ok:false,x:"A higher threshold would suppress even more alerts; the problem is that the events are never read, not that too few are needed to alert."},
  {t:"Change Event grouping to trigger an alert for each event",ok:false,x:"Grouping only affects how returned events become alerts; events outside the 15-minute window are never returned in the first place."}
 ],
 w:"Scheduled rule: lookback must be greater than or equal to the frequency, or there are gaps the rule never scans. Both range from 5 minutes to 14 days."},
{id:"c010",d:3,obj:"3.1.2",cat:"kql",t:"mc",
 q:"You run the query in the exhibit in advanced hunting. It returns no rows, yet the device timeline for WS-0142 shows a process named mimikatz.exe launched by cmd.exe this morning. You need the query to find that process. What should you change?",
 ex:"DeviceProcessEvents\n| where Timestamp > ago(1d) and DeviceName startswith \"ws-0142\"\n| where FileName has \"mimi\"\n| project Timestamp, DeviceName, FileName, InitiatingProcessFileName",
 o:[
  {t:"Replace has \"mimi\" with contains \"mimi\"",ok:true,x:"has matches whole indexed terms, and the term in mimikatz.exe is mimikatz; the fragment mimi is not a term, so has never matches. contains performs a substring search and finds it."},
  {t:"Replace has with has_cs",ok:false,x:"has_cs is the case-sensitive variant of has; it still requires a whole-term match and would not find a partial term either."},
  {t:"Replace startswith with ==",ok:false,x:"startswith is case-insensitive and already matches WS-0142; switching to the case-sensitive == would break the device filter rather than fix the file-name one."},
  {t:"Change ago(1d) to ago(7d)",ok:false,x:"The event occurred this morning, well inside one day; widening the window does not help a filter that structurally cannot match."}
 ],
 w:"has = whole-term, indexed, fast; contains = substring, slower. Use has when you know the full term (mimikatz), contains only when you must match a fragment."},
{id:"c011",d:2,obj:"2.1.6",cat:"xdrresp",t:"ms",pick:2,
 q:"Microsoft Defender for Identity sensors are deployed on all domain controllers. An alert reports reconnaissance from a workstation. You need to write advanced hunting queries that show the failed Kerberos authentications and the LDAP enumeration queries that the workstation performed against Active Directory. Which two tables should you query? Each correct answer presents part of the solution.",
 o:[
  {t:"IdentityLogonEvents",ok:true,x:"Defender for Identity writes on-premises authentication activity, including Kerberos and NTLM attempts with FailureReason and Protocol, to IdentityLogonEvents."},
  {t:"IdentityQueryEvents",ok:true,x:"IdentityQueryEvents holds queries made against Active Directory objects, with QueryType values such as EnumerateUsers and QueryGroup, which is where LDAP enumeration appears."},
  {t:"DeviceLogonEvents",ok:false,x:"DeviceLogonEvents is the endpoint view of logons on an onboarded device; it does not capture domain-controller-side Kerberos failures or LDAP queries."},
  {t:"SigninLogs",ok:false,x:"SigninLogs is Microsoft Entra ID cloud sign-in data and has nothing from on-premises Active Directory or Defender for Identity sensors."},
  {t:"AADNonInteractiveUserSignInLogs",ok:false,x:"This table holds Entra non-interactive cloud sign-ins, which are unrelated to Kerberos tickets and LDAP against domain controllers."},
  {t:"DeviceNetworkEvents",ok:false,x:"The network table would show TCP connections to port 389 or 88 but not the content of the LDAP query or the authentication result."}
 ],
 w:"Defender for Identity data in advanced hunting: IdentityLogonEvents (AD/cloud authentications), IdentityQueryEvents (LDAP/SAMR queries), IdentityDirectoryEvents (directory changes)."},
{id:"c012",d:1,obj:"1.3.2",cat:"ingest",t:"mc",
 q:"You use the Windows Security Events via AMA connector. You need a data collection rule that collects only successful and failed account logon events (event IDs 4624 and 4625) from the domain controllers, and nothing else from the Security log. What should you configure in the rule?",
 o:[
  {t:"A Custom data collection with the XPath query Security!*[System[(EventID=4624 or EventID=4625)]]",ok:true,x:"The connector's DCR offers All, Common, Minimal, or Custom event sets; Custom accepts XPath expressions that the agent evaluates against the Security channel before sending, so only the two event IDs are collected."},
  {t:"The Minimal event set",ok:false,x:"Minimal is a Microsoft-curated set of events and includes more than the two logon IDs; it cannot be narrowed to a specific list."},
  {t:"A transformKql on the DCR that filters EventID after collection",ok:false,x:"A transformation drops rows at the pipeline but the agent still reads and ships the full Security log first; XPath filtering at the source is the intended way to restrict events."},
  {t:"Windows Event Forwarding to a collector that is onboarded to the connector",ok:false,x:"WEF changes where the events are gathered, not which ones are collected; you would still need an XPath filter somewhere."}
 ],
 w:"Windows Security Events via AMA: All / Common / Minimal / Custom (XPath). To collect specific event IDs, write the XPath in the DCR; filter at the agent, not after ingestion."},
{id:"c013",d:2,obj:"2.2.1",cat:"dferesp",t:"mc",
 q:"On the device timeline for WS-0142 you find a PowerShell event at 09:14 that downloaded a file from an unknown domain. You need to see every event recorded on that device in the minutes around it, including network connections and file writes, without rebuilding the time filters by hand. What should you do?",
 o:[
  {t:"Select the event and choose Hunt for related events",ok:true,x:"Hunt for related events opens advanced hunting with a prebuilt query that returns the selected event and the other events that occurred around the same time on the same device, across the device tables."},
  {t:"Export the timeline and filter the spreadsheet",ok:false,x:"Export gives you a static copy for up to seven days; it does not let you pivot across DeviceNetworkEvents and DeviceFileEvents the way a hunting query does."},
  {t:"Collect an investigation package from the device",ok:false,x:"The package contains current-state artifacts such as autoruns, processes, and the security event log; it is not a time-scoped view of Defender telemetry."},
  {t:"Flag the event and open the Techniques view",ok:false,x:"Flagging bookmarks the row and the Techniques view shows MITRE labels; neither returns the surrounding raw events for correlation."}
 ],
 w:"Device timeline is the curated view; Hunt for related events jumps from one timeline row into advanced hunting with the device and time window already set."},
{id:"c014",d:1,obj:"1.3.6",cat:"ingest",t:"mc",
 q:"You ingest threat indicators through the Microsoft Sentinel upload API. The hunting query in the exhibit, written last year, now returns nothing although thousands of active indicators exist. You need the query to return the active IPv4 indicators. What should you do?",
 ex:"ThreatIntelligenceIndicator\n| where Active == true and isnotempty(NetworkIP)\n| summarize arg_max(TimeGenerated, *) by IndicatorId\n| project TimeGenerated, NetworkIP, ConfidenceScore, Description",
 o:[
  {t:"Rewrite the query against ThreatIntelIndicators, filtering on IsActive and ObservableKey",ok:true,x:"Indicators now land in the STIX-based ThreatIntelIndicators table (with ThreatIntelObjects for other objects); the legacy ThreatIntelligenceIndicator table stopped receiving data, so queries must move to the new schema."},
  {t:"Re-enable the Threat Intelligence Platforms data connector",ok:false,x:"The Platforms connector is deprecated and also limited to indicators; the upload API already ingests the data, it just lands in a different table than the query reads."},
  {t:"Extend the workspace's analytics retention",ok:false,x:"Retention controls how long rows live; the problem is that no new rows are written to the legacy table at all."},
  {t:"Replace Active == true with Active == \"true\"",ok:false,x:"Active is a bool column in the legacy table; the comparison was valid, and a type change would not make a dormant table produce rows."}
 ],
 w:"Threat intel moved to ThreatIntelIndicators and ThreatIntelObjects (STIX schema); ThreatIntelligenceIndicator is legacy. Update rules, workbooks, and hunts."},
{id:"c015",d:3,obj:"3.1.3",cat:"kql",t:"build",
 q:"You need an advanced hunting query that returns, for each device, the single most recent successful network logon in the last 7 days together with the account and the remote IP address that made it. Select the operators you need from the list and arrange them in the order they should appear in the query.",
 pool:["DeviceLogonEvents","| where Timestamp > ago(7d) and ActionType == \"LogonSuccess\" and LogonType == \"Network\"","| summarize arg_max(Timestamp, AccountName, RemoteIP) by DeviceName","| project DeviceName, Timestamp, AccountName, RemoteIP","| summarize max(Timestamp) by DeviceName","| mv-expand RemoteIP","| join kind=inner DeviceInfo on DeviceId"],
 answer:[0,1,2,3],ordered:true,
 x:"Start from the table, filter time and logon attributes, then use arg_max(Timestamp, …) by DeviceName so the row with the latest timestamp per device is kept along with its AccountName and RemoteIP, and project the output. summarize max(Timestamp) would return only the timestamp and lose the account and address; mv-expand is for dynamic arrays, and the join to DeviceInfo adds nothing the question asks for.",
 w:"Latest row per group with its other columns = summarize arg_max(TimeCol, cols) by Key. max() alone keeps only the value."},
{id:"c016",d:2,obj:"2.2.2",cat:"dferesp",t:"ms",pick:2,
 q:"A Windows server is suspected of hosting a persistence mechanism that re-creates a malicious scheduled task after reboot. You need to capture evidence of the persistence and of any current lateral-movement sessions from the server without interrupting its workload. Which two items in a Defender for Endpoint investigation package will contain that evidence? Each correct answer presents part of the solution.",
 o:[
  {t:"Scheduled tasks and Autoruns",ok:true,x:"The package exports the device's scheduled tasks as CSV and the Autoruns registry auto-start entries, which together expose how a task or other ASEP re-establishes itself at boot."},
  {t:"SMB sessions and Network connections",ok:true,x:"SMB sessions show who has file-share connections open to the server, and Network connections lists active connections, ARP and DNS caches; these are the lateral-movement indicators the question asks for."},
  {t:"Prefetch files",ok:false,x:"Prefetch shows what executed and when, which is useful history, but it does not show the persistence configuration or current sessions."},
  {t:"A full memory dump",ok:false,x:"The investigation package does not include a memory image; memory acquisition needs a live response custom script or a separate tool."},
  {t:"The Windows Defender quarantine folder",ok:false,x:"Quarantined files are retrieved individually, not as part of the package, and quarantine contents say nothing about scheduled-task persistence."},
  {t:"Browser history for all profiles",ok:false,x:"Browser artifacts are not part of the Windows investigation package and are unrelated to persistence or SMB sessions."}
 ],
 w:"Investigation package (Windows): Autoruns, installed programs, network connections, prefetch, processes, scheduled tasks, security event log, services, SMB sessions, system info, temp dirs, users and groups, WdSupportLogs, summary report."},
{id:"c017",d:2,obj:"2.1.8",cat:"xdrresp",t:"mc",
 q:"An analyst with Microsoft Security Copilot access is in advanced hunting and wants Copilot to produce a KQL query from a sentence such as 'show devices where certutil downloaded a file this week', returning the query and a short explanation but not a conversational investigation. What should the analyst select?",
 o:[
  {t:"In the Security Copilot side pane, set Threat hunting assistant mode to Query only",ok:true,x:"Query only mode converts a natural-language request into a KQL query with an explanation, which the analyst can then run or edit; Rich insights mode instead carries out a multistep conversational investigation."},
  {t:"Set Threat hunting assistant mode to Rich insights",ok:false,x:"Rich insights is the investigation-oriented default that runs queries and returns insights and recommendations, more than the analyst asked for."},
  {t:"Open the standalone Security Copilot portal and use the Defender XDR plugin",ok:false,x:"The standalone portal can also generate queries, but the question is about the embedded experience inside advanced hunting, where the mode switch does this directly."},
  {t:"Create a custom detection rule and let Copilot populate the query",ok:false,x:"The custom detection wizard does not author queries; it consumes a query that already exists in the advanced hunting editor."}
 ],
 w:"Embedded Copilot in advanced hunting has two modes: Query only (NL to KQL plus explanation) and Rich insights (conversational investigation). Copilot only reads data you already can."},
{id:"c018",d:1,obj:"1.2.2",cat:"sentplat",t:"ms",pick:2,
 q:"Your Microsoft Sentinel workspace keeps CommonSecurityLog on the Analytics tier with the default retention. A compliance requirement states that analysts must be able to run interactive hunting queries over the last 12 months of firewall events and that raw events must be kept for 7 years. Which two actions should you perform in the Tables page? Each correct answer presents part of the solution.",
 o:[
  {t:"Set the Analytics retention of CommonSecurityLog to 365 days",ok:true,x:"Hunting queries, analytics rules, and workbooks read only the Analytics tier, so the interactive window must be extended from the 90-day default to one year, which carries a prorated long-term retention charge beyond the free period."},
  {t:"Set the Total retention of CommonSecurityLog to 7 years",ok:true,x:"Total retention governs how long the mirrored copy stays in the data lake, up to 12 years, which satisfies the 7-year raw-event requirement at lake cost."},
  {t:"Switch CommonSecurityLog to the Data lake tier",ok:false,x:"A lake-only table cannot be used by hunting queries or analytics rules, so the 12-month interactive requirement would fail."},
  {t:"Create a summary rule for CommonSecurityLog with a 1-day bin",ok:false,x:"A summary rule keeps aggregates, not raw events, so it meets neither the interactive-raw-hunting requirement nor the 7-year raw-retention requirement."},
  {t:"Set the Defender XDR data retention to 7 years in Settings",ok:false,x:"CommonSecurityLog is a Microsoft Sentinel table, and XDR tables default to 30 days anyway; the retention for this table is set on the Sentinel Tables page."},
  {t:"Run a search job every month and keep the _SRCH tables",ok:false,x:"Search jobs are for retrieving data on demand; they are not a retention mechanism and would re-ingest results into the Analytics tier at extra cost."}
 ],
 w:"Analytics retention = interactive window (default 30 days, free to 90 for Sentinel security tables, up to 2 years); Total retention up to 12 years. Lake tier alone breaks rules and hunting."},
{id:"c019",d:2,obj:"2.1.1",cat:"xdrresp",t:"mc",
 q:"You run the query in the exhibit after a user reports a convincing invoice email. All four recipients are in the finance department. What should you do first?",
 ex:"EmailEvents\n| where Timestamp > ago(4h) and Subject has \"Invoice 88213\"\n| project RecipientEmailAddress, SenderFromAddress, DeliveryAction, LatestDeliveryLocation, ThreatTypes, UrlCount\n\nRecipientEmailAddress   SenderFromAddress            DeliveryAction  LatestDeliveryLocation  ThreatTypes  UrlCount\nana.diaz@tailspin.com   ap@tailspintoys-pay.example  Delivered       Inbox/folder            Phish        1\nrob.lee@tailspin.com    ap@tailspintoys-pay.example  Delivered       Inbox/folder            Phish        1\nmei.wu@tailspin.com     ap@tailspintoys-pay.example  Delivered       Quarantine              Phish        1\njo.ortiz@tailspin.com   ap@tailspintoys-pay.example  Junked          Junk                    Phish        1",
 o:[
  {t:"Use Take action from Explorer or the hunting results to soft delete the messages still in the two inboxes",ok:true,x:"Two copies are sitting in Inbox with a Phish verdict and a URL; removing them from the mailboxes stops the next click. Mei's copy has already been moved to quarantine and Jo's is in Junk, so the two inbox copies are the urgent ones."},
  {t:"Release the quarantined copy so mei.wu can confirm whether it is phishing",ok:false,x:"The verdict is already Phish; releasing it would put a live phishing message back into a finance inbox."},
  {t:"Block the tailspintoys-pay.example domain in the Tenant Allow/Block List and stop there",ok:false,x:"Blocking the domain prevents the next wave but leaves the two delivered copies in place for users to open; removal comes first."},
  {t:"Reset the passwords of all four recipients",ok:false,x:"Nothing shows that anyone clicked or entered credentials; resetting four finance passwords before confirming any click is disruption without evidence."}
 ],
 w:"Read DeliveryAction and LatestDeliveryLocation together: Delivered + Inbox/folder copies are the ones to remove now; Quarantine and Junk are already contained."},
{id:"c020",d:3,obj:"3.1.4",cat:"xdrhunt",t:"mc",
 q:"The exhibit summarizes a threat analytics report that the SOC lead has asked you to interpret. Which conclusion is correct?",
 ex:"Report: Storm-2719 targets retail payment portals (Activity group)\nTab                  Value\nRelated incidents    0 active, 2 resolved\nImpacted assets      Devices 0 | Users 0 | Mailboxes 3 | Apps 0\nEndpoints exposure   High (41 devices missing KB5062xxx; 12 with SMBv1 enabled)\nRecommended actions  3 of 9 completed",
 o:[
  {t:"No active intrusion by this actor, but 41 unpatched devices leave the estate highly exposed to its techniques",ok:true,x:"Related incidents and Impacted assets describe observed activity; Endpoints exposure scores how vulnerable the estate is to the threat's exploited weaknesses. Zero active incidents plus a high exposure level means prevention work, not incident response, is the priority."},
  {t:"Three mailboxes are currently compromised and should be investigated as an active incident",ok:false,x:"Impacted assets shows assets that appeared in alerts related to the threat over time; with every related incident resolved, those mailboxes were already handled."},
  {t:"The exposure level is high because the actor targeted the company's payment portal",ok:false,x:"Exposure is calculated from the severity of the vulnerabilities and misconfigurations the threat exploits and how many devices have them, not from whether the actor targeted the organization."},
  {t:"The report can be ignored because all related incidents are resolved",ok:false,x:"Resolved incidents only mean past activity was closed; the open recommended actions and the missing update are what prevent the next attempt."}
 ],
 w:"Threat analytics tabs: Related incidents and Impacted assets = what happened; Endpoints exposure and Recommended actions = how vulnerable you still are."},
{id:"c021",d:1,obj:"1.4.5",cat:"detect",t:"mc",
 q:"The built-in anomaly rule for unusual sign-in locations produces too many anomalies for your travelling sales team. You need to raise its threshold and compare the results with the current rule for two weeks before the change affects the Anomalies table that your hunting queries read. What should you do?",
 ex:"Anomalies\n| where TimeGenerated > ago(14d)\n| summarize Count=count() by RuleId, AnomalyTemplateId\n\nRuleId        AnomalyTemplateId  Count\n3f0c…-prod    8a21…              412\n9d7e…-custom  8a21…              96\n51aa…-prod    c0d4…              18",
 o:[
  {t:"Duplicate the rule, raise the threshold on the copy in Flighting mode, and compare both by AnomalyTemplateId",ok:true,x:"A duplicated anomaly rule starts disabled in Flighting mode and shares the AnomalyTemplateId with the original, so you can run both, compare counts in the Anomalies table, and later switch the tuned copy to Production, which moves the original to Flighting."},
  {t:"Edit the threshold on the original rule directly",ok:false,x:"Changing the production rule applies immediately to every query and detection that reads the Anomalies table, which is exactly what the two-week comparison is meant to avoid."},
  {t:"Disable the anomaly rule and write a scheduled analytics rule instead",ok:false,x:"That throws away the machine-learning baseline and the comparison; the scenario asks to tune the anomaly, not replace it."},
  {t:"Create a summary rule on the Anomalies table with a higher count threshold",ok:false,x:"A summary rule aggregates existing anomaly rows; it does not change how the anomaly engine scores sign-in locations."}
 ],
 w:"Anomaly tuning: Duplicate → tuned copy runs in Flighting → compare in the Anomalies table (same AnomalyTemplateId) → promote to Production. Only one version runs in production."},
{id:"c022",d:2,obj:"2.2.4",cat:"dferesp",t:"mc",
 q:"An incident in the Microsoft Defender portal carries the Attack Disruption tag and a banner states that a user account was contained. After investigation you determine that the triggering activity was an authorized penetration test. You need to restore the account's access. What should you do?",
 o:[
  {t:"Open the Action center, locate the Contain user action, and undo it",ok:true,x:"Every automatic attack disruption action is listed in the Action center and can be reversed by the security team; undoing the containment releases the user without touching the incident record."},
  {t:"Close the incident as a false positive and wait for the containment to lapse",ok:false,x:"Closing the incident classifies it but does not release the account; the containment is a separate action with its own lifecycle."},
  {t:"Turn off automated investigation and response for the device group",ok:false,x:"AIR settings govern automated investigations, not attack disruption, and changing them does nothing for the account already contained."},
  {t:"Remove the Attack Disruption tag from the incident",ok:false,x:"The tag is informational; removing it (if it were even possible) would not change the containment state of the user."}
 ],
 w:"Attack disruption actions (contain user, contain device, disable user) are visible and reversible in the Action center; exclusions prevent repeat containment of critical assets."},
{id:"c023",d:1,obj:"1.4.4",cat:"detect",t:"mc",
 q:"Leadership asks which MITRE ATT&CK techniques your Microsoft Sentinel workspace would cover if every analytics rule template from the installed Content hub solutions were enabled, compared with the coverage from rules that are active today. Where should you look?",
 o:[
  {t:"The MITRE ATT&CK page under Threat management, using the Simulated rules option",ok:true,x:"The coverage matrix shows active scheduled and NRT rules by default; selecting Simulated rules overlays the templates and hunting content that are available but not yet enabled, which answers the what-if question."},
  {t:"The Analytics page filtered by tactic",ok:false,x:"The Analytics page lists rules and templates but does not render a technique-by-technique coverage matrix or a simulated view."},
  {t:"The SOC optimization page's threat-based recommendations",ok:false,x:"SOC optimization suggests gaps for specific threats; it does not visualize the full matrix of current versus potential coverage."},
  {t:"Threat analytics in the Defender portal",ok:false,x:"Threat analytics describes threats and your exposure to them; it does not map your Sentinel rule set to the ATT&CK matrix."}
 ],
 w:"MITRE ATT&CK coverage page: active rules by default; Simulated rules shows the potential coverage from templates and hunting queries you have not enabled."},
{id:"c024",d:2,obj:"2.3.2",cat:"m365inv",t:"mc",
 q:"A supplier reports that eight months ago it received an invoice with altered bank details from your organization. You need to find every copy of that message across all mailboxes, including sent items and deleted items, by searching on its subject line. What should you use?",
 o:[
  {t:"A Content search in Microsoft Purview eDiscovery with a subject keyword condition",ok:true,x:"Content search queries mailbox content across the organization, including deleted items, with keyword and date conditions; it is the tool for locating the messages themselves rather than metadata about them."},
  {t:"Threat Explorer in the Defender portal filtered by subject",ok:false,x:"Explorer surfaces recent mail-flow data for a limited window of about a month, so an eight-month-old message is out of its reach."},
  {t:"A search in Microsoft Purview Audit for the MailItemsAccessed activity",ok:false,x:"Audit records show who accessed mail and when; it does not return message copies or their content."},
  {t:"A KQL query against EmailEvents in advanced hunting",ok:false,x:"EmailEvents is retained for 30 days in advanced hunting and holds delivery metadata, not mailbox contents from eight months ago."}
 ],
 w:"Content search = find message content across mailboxes; Audit = who did what; Explorer and EmailEvents = recent mail-flow metadata only."},
{id:"c025",d:3,obj:"3.1.3",cat:"kql",t:"order",
 q:"You need a Microsoft Sentinel hunting query that extracts the folder name from the Parameters column of New-InboxRule events, counts rules per user for the last day, and keeps users with more than one rule. Arrange the pipeline stages in the correct order.",
 pool:["OfficeActivity","| where TimeGenerated > ago(1d) and Operation == \"New-InboxRule\"","| extend P = parse_json(Parameters)","| mv-expand P","| where tostring(P.Name) == \"MoveToFolder\"","| summarize Rules=count(), Folders=make_set(tostring(P.Value)) by UserId | where Rules > 1"],
 answer:[0,1,2,3,4,5],
 x:"Start with the table and the cheapest filters (time, Operation), turn the JSON string in Parameters into a dynamic value with parse_json, expand the array to one row per parameter with mv-expand, filter to the MoveToFolder parameter, and only then aggregate per user and apply the count threshold. Filtering before parse_json reduces the rows that need parsing, and mv-expand must precede any filter on individual parameter names.",
 w:"Pipeline discipline: filter early, parse_json before you address JSON properties, mv-expand before you filter array elements, summarize last."},
{id:"c026",d:1,obj:"1.3.7",cat:"ingest",t:"mc",
 q:"The online store's fraud engine emits JSON events. You need to ingest them into a dedicated table in your Microsoft Sentinel workspace so that analytics rules can query the fields as typed columns. What should you create?",
 o:[
  {t:"A DCR-based custom table named FraudApp_CL plus a data collection rule that defines the stream and schema",ok:true,x:"Custom tables in the workspace carry the _CL suffix and, when created as DCR-based, are fed through a data collection rule from the Logs ingestion API or an agent; the DCR declares the incoming stream and maps it to the table's typed columns."},
  {t:"A new column set on the SecurityEvent table",ok:false,x:"Built-in tables have fixed schemas owned by Microsoft; you cannot add arbitrary fraud-engine columns to SecurityEvent."},
  {t:"A watchlist that the fraud engine updates",ok:false,x:"Watchlists are small reference lists for enrichment, not an ingestion path for a continuous event stream, and they are not queried like a log table."},
  {t:"A storage account that the fraud engine writes to, queried with externaldata",ok:false,x:"externaldata reads files ad hoc; analytics rules cannot rely on it for continuous detection, and the data would not be a workspace table."}
 ],
 w:"Custom log table = name ends in _CL, created DCR-based, populated via a DCR (Logs ingestion API or agent). Watchlists and externaldata are not ingestion."},
{id:"c027",d:2,obj:"2.1.3",cat:"xdrresp",t:"mc",
 q:"Your Microsoft Sentinel workspace uses the tenant-based Microsoft Defender for Cloud connector. A Defender for Servers alert fired for suspicious process execution on an Azure virtual machine. You need to write a KQL query that lists that alert and all other workload protection alerts from the last day with their resource identifiers. Which table should you query?",
 o:[
  {t:"SecurityAlert",ok:true,x:"The Defender for Cloud connector streams workload protection alerts into SecurityAlert, where columns such as ProviderName, AlertName, and the ExtendedProperties and Entities payloads identify the affected Azure resource."},
  {t:"SecurityRecommendation",ok:false,x:"That table holds Defender for Cloud recommendations about posture, such as missing disk encryption, not real-time alerts about suspicious activity."},
  {t:"AzureActivity",ok:false,x:"AzureActivity is the Azure control-plane log of operations on resources; it does not contain Defender for Cloud detections."},
  {t:"DeviceProcessEvents",ok:false,x:"DeviceProcessEvents carries endpoint telemetry from Defender for Endpoint; the question asks for the Defender for Cloud alert records themselves."}
 ],
 w:"Defender for Cloud alerts land in SecurityAlert (and roll into SecurityIncident); recommendations land in SecurityRecommendation."},
{id:"c028",d:1,obj:"1.2.4",cat:"sentplat",t:"mc",
 q:"SOC optimization in your Microsoft Sentinel workspace shows a data value recommendation stating that the AzureDiagnostics table ingested 180 GB in the last 90 days and is not used by any analytics rule. You pay a per-GB analytics price for it. Which pair of actions does the recommendation offer to resolve it?",
 o:[
  {t:"Add analytics rules from the Content hub that use the table, or change the table's plan to a cheaper tier",ok:true,x:"Data value recommendations flag low-usage tables, show their size and cost, and let you either put the data to work with relevant detections or reduce what you pay to retain it."},
  {t:"Delete the table, or convert it to a watchlist",ok:false,x:"SOC optimization does not propose deleting data or turning a log table into a watchlist; its goal is to balance coverage and cost, not to remove telemetry."},
  {t:"Enable UEBA on the table, or add it to a workbook",ok:false,x:"UEBA and workbooks are not what the data value recommendation suggests; it is about detection usage versus retention cost."},
  {t:"Move the table to another workspace, or raise its commitment tier",ok:false,x:"Commitment tiers apply to the whole workspace and raising one does not address an unused table; moving the table does not change usage."}
 ],
 w:"SOC optimization data value: unused table → add detections that use it, or move it to a cheaper plan. Recommendations recalculate every 24 hours."},
{id:"c029",d:2,obj:"2.1.9",cat:"xdrresp",t:"mc",
 q:"Your tenant is onboarded to the Microsoft Sentinel data lake. During a multistage incident, a service account has been confirmed compromised. You need to see which critical assets the attacker could reach from that account through existing permissions and relationships, not only the assets already touched. What should you use?",
 o:[
  {t:"Blast radius analysis in the incident graph",ok:true,x:"The graph-powered blast radius view, built on Microsoft Sentinel graph, traces the vulnerable paths from a compromised entity to critical assets so you can see potential future impact alongside the current one."},
  {t:"The device timeline of the first device in the incident",ok:false,x:"A device timeline is a chronological event list for a single device; it does not model relationships between the account and other assets."},
  {t:"A KQL join between IdentityInfo and DeviceInfo",ok:false,x:"A join can list memberships and devices, but it does not compute multi-hop paths to critical assets or visualize them as a graph."},
  {t:"The Related incidents tab in threat analytics",ok:false,x:"Threat analytics relates incidents to a tracked threat; it has no view of your account-to-asset relationships."}
 ],
 w:"Sentinel graph powers the incident graph's blast radius (current and potential impact) and the hunting graph in Defender XDR; requires data lake onboarding."},
{id:"c030",d:2,obj:"2.1.10",cat:"xdrresp",t:"mc",
 q:"Three separate incidents in the Microsoft Defender portal were traced to the same BEC campaign. You need to track them as one piece of work with shared tasks, a single owner, and attached evidence that remains after the individual incidents are resolved. What should you do?",
 o:[
  {t:"Create a case, link the three incidents to it, and add tasks and evidence",ok:true,x:"Cases are the Defender portal's container above incidents: a case can group multiple incidents, hold tasks and attachments, and keep its own status and owner independent of the incidents' resolution."},
  {t:"Merge the three incidents into one incident",ok:false,x:"Merging combines incidents into a single incident record; it does not provide tasks, attachments, or a lifecycle that outlives incident closure."},
  {t:"Add the same tag to the three incidents",ok:false,x:"Tags help filter the incident queue but give you no shared tasks, owner, or evidence store."},
  {t:"Create a Microsoft Sentinel bookmark for each incident",ok:false,x:"Bookmarks preserve hunting findings; they are not a way to manage ongoing work across incidents."}
 ],
 w:"Case management (Cases in the Defender portal) groups incidents under one case with tasks, evidence, and status; merging and tagging operate at the incident level."},
{id:"c031",d:3,obj:"3.2.1",cat:"senthunt",t:"ms",pick:2,
 q:"An analyst is testing the hypothesis that an attacker is using a rare user agent against the store's API. Several hunting queries return suspicious rows. The analyst must preserve the exact rows as evidence, keep the queries and results grouped under the hypothesis, and open an incident from the evidence. Which two actions should the analyst perform? Each correct answer presents part of the solution.",
 o:[
  {t:"Create a hunt, add the relevant queries to it, and run them from the hunt",ok:true,x:"A hunt groups the hypothesis, its queries, bookmarks, comments, and any resulting rules or incidents so the work is tracked as one investigation."},
  {t:"Bookmark the suspicious rows and use Incident actions to create a new incident from the bookmarks",ok:true,x:"Bookmarks preserve the selected rows with the query that produced them, extract entities, and can be turned into a new incident or added to an existing one."},
  {t:"Start a livestream session for the queries",ok:false,x:"Livestream is no longer available in Microsoft Sentinel; recurring evaluation is now done with KQL jobs or analytics rules."},
  {t:"Create a summary rule that writes the query results to a custom table",ok:false,x:"A summary rule aggregates data on a schedule; it does not keep the specific evidence rows with their query or create an incident."},
  {t:"Export the results to CSV and attach the file to a workbook",ok:false,x:"A CSV loses the link to the query and the entities, and a workbook is a dashboard, not an evidence store."},
  {t:"Add the queries to the Favorites list",ok:false,x:"Favorites only auto-run queries when you open the Hunting page; they neither preserve rows nor create incidents."}
 ],
 w:"Hunts group queries and findings under a hypothesis; bookmarks keep rows plus query plus entities and can become an incident. Livestream is retired."},
{id:"c032",d:1,obj:"1.2.3",cat:"sentplat",t:"mc",
 q:"The summary rule output table SigninFailDaily_CL now holds a year of daily failed sign-in counts. The SOC manager wants an interactive view in the portal with a time-range picker, a chart of failures per day, and a table of the top users, which other analysts can open without editing KQL. What should you create?",
 o:[
  {t:"A Microsoft Sentinel workbook with a TimeRange parameter and query steps against SigninFailDaily_CL",ok:true,x:"Workbooks render KQL results as charts and grids inside the portal, support parameters such as a time range that the queries reference, and can be saved and shared with other users of the workspace."},
  {t:"A data lake notebook scheduled weekly",ok:false,x:"Notebooks are for Python-based analysis in VS Code and run outside the portal; they do not give analysts a clickable dashboard."},
  {t:"A KQL job that writes the chart data to a new table",ok:false,x:"A job produces a table, not a visualization, and the data already exists in the summary table."},
  {t:"A scheduled analytics rule with a custom details field",ok:false,x:"Analytics rules produce alerts; they have no charting or time-picker capability."}
 ],
 w:"Interactive portal visualization over workspace data = workbook (KQL plus parameters). Notebooks = Python in VS Code; jobs = tables; rules = alerts."},
{id:"c033",d:2,obj:"2.1.5",cat:"xdrresp",t:"ms",pick:2,
 q:"An account was confirmed compromised in Microsoft Entra ID Protection. The attacker still holds a valid refresh token and has configured an authenticator app on the account. You need to end the attacker's access immediately. Which two actions should you perform? Each correct answer presents part of the solution.",
 o:[
  {t:"Reset the user's password",ok:true,x:"A password reset invalidates the credential the attacker stuffed and, through the user-risk policy, remediates the user's risk state; it is the first step of identity recovery."},
  {t:"Require the user to re-register for multifactor authentication at the next sign-in",ok:false,x:"Re-registration adds a new method but leaves the attacker's authenticator app in place and the refresh token valid, so the attacker keeps signing in."},
  {t:"Revoke the user's sign-in sessions and remove the attacker-registered authentication method",ok:true,x:"Revoking sessions invalidates the refresh token the attacker holds, and removing the rogue authenticator app stops the attacker from satisfying MFA on the next sign-in."},
  {t:"Dismiss the user risk",ok:false,x:"Dismissing tells Identity Protection the detection was a false positive and clears the risk without doing anything to the attacker's access."},
  {t:"Isolate the user's primary device",ok:false,x:"The attacker is using the cloud identity from elsewhere; isolating a device does not touch the token or the MFA method."},
  {t:"Add the attacker's IP range to a named location",ok:false,x:"Named locations only feed Conditional Access conditions; without a policy that blocks that location they change nothing, and the token still works."}
 ],
 w:"Identity recovery after compromise: reset password, revoke sessions (refresh tokens), remove rogue MFA methods. Dismissing risk is for false positives only."},
{id:"c034",d:1,obj:"1.1.10",cat:"sentauto",t:"mc",
 q:"In your Microsoft Sentinel workspace, whenever an analyst closes an incident that came from the analytics rule named Impossible travel with the classification False positive, you need to automatically add the tag Review-CA and run a playbook that posts the incident details to a Teams channel. What should you create?",
 o:[
  {t:"An automation rule triggered When incident is updated, with conditions on Status changed to Closed and on the rule name",ok:true,x:"Closing is an update to an existing incident, so the update trigger is required; conditions on the state change and the originating rule scope it, and the actions Add tags and Run playbook complete the requirement."},
  {t:"An automation rule with the trigger When incident is created and a condition on the analytics rule name",ok:false,x:"The created trigger fires once when the incident appears, before any analyst has closed it, so the closing classification can never be evaluated."},
  {t:"An automation rule with the trigger When alert is created that runs the playbook",ok:false,x:"The alert trigger fires on new alerts from scheduled or NRT rules and cannot observe an incident's later closure or classification."},
  {t:"A playbook with the Microsoft Sentinel alert trigger attached to the analytics rule",ok:false,x:"Attaching an alert-triggered playbook to the rule runs it at alert creation; it knows nothing about how the incident was eventually closed."}
 ],
 w:"Incident lifecycle events after creation (status, owner, severity, tags) need the When incident is updated trigger; the created trigger only sees the birth of the incident."},
{id:"c035",d:2,obj:"2.1.1",cat:"xdrresp",t:"order",
 q:"A phishing campaign with a spoofed accounts-payable sender was delivered to 60 mailboxes in the last 24 hours. Using Microsoft Defender for Office 365, you need to remove the messages and confirm the removal completed. Arrange the actions in the correct order.",
 pool:["Open Explorer and filter by the sender address and the delivery window","Select the delivered messages that match the campaign","Choose Take action and apply Soft delete to move the messages out of the inboxes","Verify the completed remediation in the Action center"],
 answer:[0,1,2,3],
 x:"Scope first: Explorer lets you find the campaign by sender and time. Select the messages, then apply the remediation through Take action; Soft delete moves the messages out of the user's view while remaining recoverable. The remediation runs asynchronously and its status, including any failures, is tracked in the Action center, which is where you confirm completion.",
 w:"Explorer → select → Take action (soft/hard delete, move to junk) → Action center for status. Blocking the sender comes after removing what is already delivered."},
{id:"c036",d:1,obj:"1.1.11",cat:"sentauto",t:"order",
 q:"You need to build an automated response in Microsoft Sentinel that, whenever an incident with the tactic Exfiltration is created, posts a summary to a Teams channel. Arrange the four actions in the correct order.",
 pool:["Create a Logic App that starts with the Microsoft Sentinel incident trigger","Add the Teams Post message action and map the incident fields into it","Grant Microsoft Sentinel permission to the playbook's resource group through Manage playbook permissions","Create an automation rule with the trigger When incident is created, a Tactics condition, and the action Run playbook"],
 answer:[0,1,2,3],alt:[[0,2,1,3]],
 x:"The playbook must exist before it can be referenced: build the Logic App on the Microsoft Sentinel incident trigger and add the Teams action. For an automation rule to run it, the Microsoft Sentinel service account needs explicit permissions on the playbook's resource group, granted via Manage playbook permissions. Then the automation rule ties the incident-created trigger and the tactic condition to the Run playbook action. Granting permissions can happen before or after adding the Teams action, but always before the automation rule can select the playbook.",
 w:"Playbook (incident trigger) → Manage playbook permissions for the Sentinel service account → automation rule with Run playbook. Permissions before wiring."},
{id:"c037",d:3,obj:"3.1.2",cat:"kql",t:"mc",
 q:"You run the advanced hunting query in the exhibit. Which statement describes the output?",
 ex:"EmailEvents\n| where Timestamp > ago(7d) and EmailDirection == \"Inbound\"\n| where DeliveryAction == \"Delivered\" and ThreatTypes has \"Phish\"\n| summarize Delivered=count(), Recipients=make_set(RecipientEmailAddress, 5) by SenderFromAddress\n| where Delivered >= 3\n| order by Delivered desc\n\nSenderFromAddress            Delivered  Recipients\nbilling@contoso-pay.example  7          [\"ana.diaz@…\",\"rob.lee@…\",\"mei.wu@…\",\"jo.ortiz@…\",\"sam.kim@…\"]\nhr@woodgrove-jobs.example    4          [\"mei.wu@…\",\"jo.ortiz@…\",\"li.chen@…\",\"ava.ng@…\"]\nit@litware-support.example   3          [\"sam.kim@…\",\"ava.ng@…\",\"rob.lee@…\"]",
 o:[
  {t:"External senders with three or more delivered phish-verdict messages this week, with up to five distinct recipients each",ok:true,x:"The filters keep inbound mail that was delivered despite a Phish verdict; summarize counts those per sender and make_set with a size of 5 collects at most five distinct recipients; the threshold and sort finish the list."},
  {t:"Every phishing message that was blocked or quarantined, grouped by sender",ok:false,x:"DeliveryAction == Delivered excludes blocked and junked messages; the query deliberately looks at what got through."},
  {t:"Senders with at least three phishing messages, including messages sent from inside the organization",ok:false,x:"EmailDirection == Inbound removes intra-org and outbound mail, so internal senders cannot appear."},
  {t:"A list of every recipient of phishing mail in the last 7 days",ok:false,x:"make_set is capped at five entries per sender, so the Recipients column is a sample, not a complete recipient list; the grain is the sender, not the recipient."}
 ],
 w:"Read a summarize carefully: the by clause sets the grain, make_set(col, n) caps the collected values, and earlier where clauses define which rows were counted."},
{id:"c038",d:2,obj:"2.2.3",cat:"dferesp",t:"mc",
 q:"An alert's evidence lists an executable with an unfamiliar SHA-256 hash that ran on one laptop. You need to determine on how many other devices in the organization the same file exists, see its global prevalence, and block it everywhere if needed. What should you do?",
 o:[
  {t:"Open the file page from the evidence, review Observed in organization and prevalence, and add a block indicator",ok:true,x:"The file entity page aggregates everything Defender knows about that hash: devices where it was observed, worldwide prevalence, VirusTotal data, and actions such as adding a file indicator that blocks it across the tenant."},
  {t:"Run a full antivirus scan on the laptop",ok:false,x:"A scan addresses the one device and gives no organization-wide view of where else the file sits."},
  {t:"Collect an investigation package from the laptop",ok:false,x:"The package documents the laptop's state; it does not report prevalence or allow a tenant-wide block."},
  {t:"Query DeviceInfo for the device's OS version",ok:false,x:"DeviceInfo describes devices, not files; it will not tell you where the hash was seen."}
 ],
 w:"Evidence investigation: pivot from the alert to the entity page (file, IP, URL, user). The file page answers where-else, how-common, and lets you block by indicator."},
{id:"c039",d:1,obj:"1.4.3",cat:"detect",t:"build",
 q:"You need to turn the KQL query below into a Microsoft Sentinel scheduled analytics rule so that incidents show the user and the source IP as entities and alerts about the same user and IP are grouped into one incident. Query: SigninLogs | where ResultType == \"50126\" | summarize Failures=count() by UserPrincipalName, IPAddress | where Failures > 20. Select the four actions and arrange them in order.",
 pool:["Confirm the query projects UserPrincipalName and IPAddress as output columns","Map the Account entity's FullName identifier to UserPrincipalName","Map the IP entity's Address identifier to IPAddress","Enable alert grouping with Group alerts if all entities match","Add the ReportId and DeviceId columns to the query","Select the Continuous (NRT) frequency","Assign the Microsoft Sentinel Playbook Operator role to the analysts"],
 answer:[0,1,2,3],ordered:true,alt:[[0,2,1,3]],
 x:"Entity mapping binds query output columns to entity identifiers, so the columns must exist first; Account uses FullName (or Name plus UPNSuffix) and IP uses Address. With both entities mapped, alert grouping by all entities collapses repeated alerts for the same user and address into one incident. ReportId and DeviceId are Defender XDR custom detection columns (recommended, with DeviceId as one accepted impacted-entity column), not Sentinel entity mapping; Continuous frequency belongs to XDR custom detections, and Playbook Operator is unrelated to rule creation.",
 w:"Scheduled rule entity flow: query outputs the columns → entity mapping (up to 10 entities) → alert grouping by matched entities. XDR custom detections use ReportId/DeviceId instead."},
{id:"c040",d:1,obj:"1.2.2",cat:"sentplat",t:"series",
 scenario:"Tailspin Toys stores the custom table FraudApp_CL in a Microsoft Sentinel workspace with the default 90-day analytics retention and two years of total retention. The fraud team needs analysts to run hunting queries from the Hunting page and build workbooks over the last 12 months of raw FraudApp_CL events. The solution must minimize cost. For each of the following solutions, determine whether the solution meets the goal.",
 solutions:[
  {s:"Solution: On the Tables page you set the Analytics retention of FraudApp_CL to 365 days and leave the Total retention at two years. Does this meet the goal?",ok:true,x:"Hunting queries and workbooks read the Analytics tier, so extending analytics retention to one year makes the raw rows available to them; the long-term portion is charged at the prorated retention rate, which is the cheapest way to meet an interactive 12-month requirement."},
  {s:"Solution: You set the Total retention of FraudApp_CL to 12 years and leave the Analytics retention at 90 days. Does this meet the goal?",ok:false,x:"Data older than 90 days then lives only in the data lake tier, which the Hunting page and workbooks cannot query; longer lake retention does not extend the interactive window."},
  {s:"Solution: You create a summary rule that aggregates FraudApp_CL every 24 hours into FraudAppDaily_CL. Does this meet the goal?",ok:false,x:"A summary rule stores aggregates, not raw events, so analysts cannot hunt over the individual FraudApp_CL rows older than 90 days."},
  {s:"Solution: You schedule a KQL job that runs daily and copies the previous day's FraudApp_CL rows from the data lake into a new Analytics-tier table. Does this meet the goal?",ok:false,x:"The job re-ingests rows that are already in the Analytics tier for their first 90 days, doubling cost, and the new table has its own default analytics retention, so it does not provide a 12-month interactive window either."}
 ],
 w:"Interactive (Hunting page, workbooks, rules) = Analytics retention. Lake-only data needs lake queries, jobs, or notebooks. Aggregation and copying do not substitute for retention."}
];
