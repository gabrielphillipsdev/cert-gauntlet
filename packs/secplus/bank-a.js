/* Exam A — Sec+ SY0-701 — 85 original questions */
export const EXAM_BANK_A = [
{id:"a001",obj:"4.8",d:4,cat:"ir",t:"mc",dg:"irlife",
 q:"A regional hospital's SOC confirms that a nurse's workstation is beaconing to a known ransomware staging server. The analyst has verified the alert is not a false positive. Which of the following should the analyst do NEXT?",
 o:[
  {t:"Isolate the workstation from the network to stop the spread",ok:true,x:"Once detection and analysis have confirmed a real incident, containment comes next. Isolating the host prevents lateral movement and encryption of shared clinical drives."},
  {t:"Reimage the workstation from the hospital's golden image",ok:false,x:"Reimaging is eradication/recovery. Doing it before containment and evidence capture destroys forensic data and does nothing to stop other hosts that may already be infected."},
  {t:"Schedule a lessons-learned meeting with clinical leadership",ok:false,x:"Lessons learned is the final phase, held after recovery. Holding it now leaves an active beacon running on the network."},
  {t:"Run a full vulnerability scan of the clinical VLAN",ok:false,x:"Scanning is a preparation or validation activity. It would delay containment and could disrupt medical devices during an active incident."}
 ],
 w:"IR order: preparation, detection, analysis, containment, eradication, recovery, lessons learned. Once an incident is confirmed, contain it before you clean it up."},
{id:"a002",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A software company's web application firewall records the request shown below against the customer portal. Which of the following attacks is being attempted?",
 ex:"GET /account?id=1042%27%20OR%20%271%27%3D%271 HTTP/1.1\nHost: portal.example.net\nUser-Agent: Mozilla/5.0\n(decoded: /account?id=1042' OR '1'='1)",
 o:[
  {t:"SQL injection",ok:true,x:"The single quote followed by OR '1'='1 is a classic tautology that makes a database WHERE clause always true. The attacker is trying to dump every account row instead of id 1042."},
  {t:"Cross-site scripting",ok:false,x:"XSS payloads contain script tags or event handlers aimed at other users' browsers; this payload is targeting the back-end query, not the browser."},
  {t:"Directory traversal",ok:false,x:"Traversal uses ../ sequences to escape the web root and read files. Nothing in this request references file paths."},
  {t:"Cross-site request forgery",ok:false,x:"CSRF tricks a logged-in user's browser into sending an unwanted request. This is a crafted parameter value sent directly by the attacker, not a forged user action."}
 ],
 w:"A quote plus OR '1'='1 in a parameter is the signature of SQL injection. Input validation and parameterized queries are the fix."},
{id:"a003",obj:"5.2",d:5,cat:"gov",t:"mc",dg:"risk",
 q:"A hospital risk analyst values the MRI scheduling system at $2,000,000. A ransomware event is expected to affect 10% of that value and is estimated to occur once every four years. Which of the following is the annualized loss expectancy?",
 o:[
  {t:"$50,000",ok:true,x:"SLE = $2,000,000 × 0.10 = $200,000. ARO = 1/4 = 0.25. ALE = $200,000 × 0.25 = $50,000."},
  {t:"$200,000",ok:false,x:"$200,000 is the single loss expectancy (asset value × exposure factor), not the annualized figure. It must still be multiplied by ARO."},
  {t:"$800,000",ok:false,x:"This multiplies the SLE by 4 as if the event happened four times a year. Once every four years is an ARO of 0.25, not 4."},
  {t:"$500,000",ok:false,x:"This multiplies the full asset value by 0.25 and ignores the 10% exposure factor. Only the exposed portion is lost per event."}
 ],
 w:"SLE = AV × EF; ALE = SLE × ARO. An event every N years has an ARO of 1/N."},
{id:"a004",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A K-12 school district moves its student information system to a cloud provider's IaaS offering. The district's own staff install and manage the Linux virtual machines and database software. A critical kernel vulnerability is announced. Which of the following is responsible for patching it?",
 o:[
  {t:"The school district, because the guest operating system is the customer's responsibility in IaaS",ok:true,x:"In IaaS the provider secures the hypervisor and physical hosts; everything from the guest OS upward belongs to the customer. The district must patch its own VMs."},
  {t:"The cloud provider, because it owns the physical servers running the virtual machines",ok:false,x:"The provider patches the hypervisor and hardware firmware, not the guest kernel inside a customer-managed VM."},
  {t:"The database vendor, because the vulnerability affects the system hosting its product",ok:false,x:"A database vendor supports its own software. It has no role in the operating system beneath it."},
  {t:"Neither party, because IaaS virtual machines are isolated from kernel exploits",ok:false,x:"Virtualization does not remove OS vulnerabilities; an unpatched guest kernel is fully exploitable from inside the VM."}
 ],
 w:"Shared responsibility: IaaS = customer owns the guest OS and up; PaaS = customer owns application and data; SaaS = customer owns data and access."},
{id:"a005",obj:"1.2",d:1,cat:"controls",t:"mc",dg:"zerotrust",
 q:"A hospital is adopting a zero trust architecture. A physician's tablet requests access to the imaging archive. One component evaluates the physician's role, the tablet's compliance state, and current threat intelligence and decides to allow the session. Which of the following zero trust components made that decision?",
 o:[
  {t:"Policy engine",ok:true,x:"The policy engine is the control-plane brain that evaluates identity, device posture, and context against policy and renders the allow/deny decision."},
  {t:"Policy enforcement point",ok:false,x:"The PEP sits in the data plane and merely opens or closes the path to the imaging archive after being told the decision; it does not weigh the inputs itself."},
  {t:"Policy administrator",ok:false,x:"The policy administrator is also in the control plane, but it relays the engine's decision to the enforcement point and manages the session rather than deciding."},
  {t:"Implicit trust zone",ok:false,x:"An implicit trust zone is the small data-plane segment where traffic is allowed after a decision has been made; it is a place, not a decision-making component."}
 ],
 w:"Zero trust control plane: policy engine decides, policy administrator communicates the decision. Data plane: policy enforcement point applies it; subjects and implicit trust zones live there."},
{id:"a006",obj:"4.6",d:4,cat:"iam",t:"mc",dg:"saml",
 q:"A software company wants its engineers to sign in to a third-party bug-tracking SaaS using their corporate identity provider. The SaaS must receive a signed XML assertion listing the user's identity and group memberships, and the corporate password must never be sent to the SaaS. Which of the following should be implemented?",
 o:[
  {t:"SAML federation with the company as the identity provider",ok:true,x:"SAML exchanges signed XML assertions between an identity provider and a service provider, delivering identity and attributes without the SP ever seeing the password."},
  {t:"OAuth 2.0 with the SaaS acting as the resource server",ok:false,x:"OAuth is an authorization framework that issues access tokens for delegated API access; it does not itself deliver a signed XML identity assertion."},
  {t:"LDAP bind from the SaaS to the corporate directory",ok:false,x:"An LDAP bind would require the SaaS to receive and forward the user's password to the directory, which violates the requirement."},
  {t:"RADIUS with EAP-TLS between the SaaS and the identity provider",ok:false,x:"RADIUS is for network access authentication (VPN, Wi-Fi, switch ports), not for browser-based SSO into a web application."}
 ],
 w:"SAML = XML assertions for web SSO between IdP and SP. OAuth = delegated authorization tokens. OIDC = identity layer on OAuth using JSON tokens."},
{id:"a007",obj:"2.1",d:2,cat:"actors",t:"mc",
 q:"A hospital's research department stores unpublished clinical trial data. Investigators find a long-running, quiet intrusion that used custom malware, several previously unknown exploits, and exfiltrated only trial results over 14 months. No ransom demand or data sale has been observed. Which of the following threat actors is MOST likely responsible?",
 o:[
  {t:"Nation-state actor motivated by espionage",ok:true,x:"Custom tooling, multiple zero-days, patience over 14 months, and interest only in research data with no monetization are the hallmarks of a well-resourced state espionage campaign."},
  {t:"Organized crime group motivated by financial gain",ok:false,x:"Criminal groups monetize quickly through ransom, extortion, or sale of data. Fourteen months of silent collection with no cash-out does not fit."},
  {t:"Hacktivist motivated by philosophical beliefs",ok:false,x:"Hacktivists seek publicity through defacement, leaks, or disruption. A covert, unpublicized intrusion is the opposite of their goal."},
  {t:"Unskilled attacker using downloaded tools",ok:false,x:"Unskilled attackers rely on public tools and known exploits; they do not develop custom malware or possess multiple zero-day exploits."}
 ],
 w:"Match actor to resources and motivation: zero-days plus patience plus data-only interest = nation-state espionage."},
{id:"a008",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"A school district is choosing a vendor to host student records. One candidate offers a report in which an independent accounting firm tested the vendor's security controls over a 12-month period and gave an opinion on their effectiveness. Which of the following vendor assessment methods does this report represent?",
 o:[
  {t:"Independent third-party assessment",ok:true,x:"A report issued by an outside firm that tested the vendor's controls is an independent assessment. It gives the district assurance without having to audit the vendor itself."},
  {t:"Evidence of internal audits",ok:false,x:"Internal audit evidence is produced by the vendor's own staff. This report was produced by an outside accounting firm, which carries more weight."},
  {t:"Right-to-audit clause",ok:false,x:"A right-to-audit clause is a contract term letting the district perform its own inspection. Here the district is relying on someone else's completed report."},
  {t:"Supply chain analysis",ok:false,x:"Supply chain analysis examines the vendor's own suppliers and dependencies, not the vendor's control effectiveness over a test period."}
 ],
 w:"Vendor due diligence tools: independent third-party assessment reports, evidence of internal audits, right-to-audit clauses, questionnaires, and pen test results."},
{id:"a009",obj:"3.3",d:3,cat:"data",t:"mc",
 q:"A software company's developers need realistic customer records to test a new billing feature. Compliance requires that no real names, card numbers, or addresses ever reach the development environment, but the data must keep its format so that validation code works. Which of the following BEST meets this requirement?",
 o:[
  {t:"Data masking that replaces sensitive fields with realistic substitute values",ok:true,x:"Masking swaps real values for format-preserving fake ones, so developers get usable test data while no actual PII leaves production."},
  {t:"Encrypting the production database export before copying it to development",ok:false,x:"Encryption protects the copy in transit, but developers would decrypt it to use it, so real PII would still land in the development environment."},
  {t:"Hashing every sensitive field before the export",ok:false,x:"Hashes are fixed-length hex strings, so card and address validation code would fail; hashing does not preserve format."},
  {t:"Restricting the export to developers who have signed an NDA",ok:false,x:"An NDA is an administrative control that still allows real PII into development, which the compliance requirement forbids."}
 ],
 w:"Masking = realistic, format-preserving fake data for non-production use. Tokenization keeps a reversible lookup; hashing is one-way and not format-preserving."},
{id:"a010",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"A hospital's mail administrator reviews the TXT record below after users report that spoofed messages claiming to come from the hospital's domain are being delivered to patients. Which of the following changes would BEST reduce successful spoofing of the domain?",
 ex:"hospital.example    IN TXT  \"v=spf1 ip4:203.0.113.0/24 include:mailrelay.example.net ~all\"\n_dmarc.hospital.example   (no record found)",
 o:[
  {t:"Publish a DMARC record with a reject policy and add DKIM signing",ok:true,x:"SPF alone only produces a soft fail (~all) and has no policy telling receivers what to do. DMARC with p=reject instructs receivers to discard unaligned mail, and DKIM adds a signature that survives forwarding."},
  {t:"Change the SPF mechanism from ~all to +all",ok:false,x:"+all authorizes every host on the internet to send as the hospital, which would make spoofing trivial rather than harder."},
  {t:"Remove the include mechanism from the SPF record",ok:false,x:"The include authorizes the hospital's legitimate relay provider; removing it would cause the hospital's real mail to fail SPF while doing nothing about spoofers."},
  {t:"Add a wildcard MX record pointing to the hospital's mail server",ok:false,x:"MX records control where inbound mail is delivered; they have no role in authenticating outbound mail or telling receivers to reject forgeries."}
 ],
 w:"SPF says which servers may send; DKIM signs the message; DMARC tells receivers what to do when both fail and where to send reports. Without DMARC, SPF results are advisory."},
{id:"a011",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"A school district's payroll clerk receives a call from someone who says they are with the district's IT help desk, explains that the clerk's account is being migrated, and asks the clerk to approve the MFA prompts that are about to appear on their phone. Which of the following BEST describes this attack?",
 o:[
  {t:"Vishing combined with an MFA fatigue push",ok:true,x:"A voice call using a fabricated IT pretext is vishing, and asking the victim to approve incoming prompts is the attacker pushing MFA notifications from a stolen password to get one accepted."},
  {t:"Smishing",ok:false,x:"Smishing is delivered by SMS text message. This attack arrived as a phone call, and the MFA prompts are push notifications, not texts."},
  {t:"Business email compromise",ok:false,x:"BEC uses a compromised or spoofed email account to request payments or data. No email is involved here, and the goal is account access, not a payment."},
  {t:"Watering hole attack",ok:false,x:"A watering hole compromises a website the target group visits. This attack contacts the victim directly by phone."}
 ],
 w:"Vishing = voice phishing. Coaching a victim to accept MFA prompts is the social side of an MFA fatigue attack; number matching and training defeat it."},
{id:"a012",obj:"5.2",d:5,cat:"gov",t:"mc",
 q:"A software company's board has directed that new products may be launched only after all high-severity findings are fixed, even if it delays revenue. A competitor ships faster and accepts more residual risk. Which of the following BEST describes the software company's stance?",
 o:[
  {t:"Conservative risk appetite",ok:true,x:"Refusing to launch with known high-severity risk, even at the cost of revenue, is a conservative appetite: the board is willing to trade speed for lower residual risk."},
  {t:"Expansionary risk appetite",ok:false,x:"An expansionary appetite accepts higher risk to grow faster; that describes the competitor, not this company."},
  {t:"Risk avoidance",ok:false,x:"Avoidance would mean not building the product at all. The company still ships, just after remediation."},
  {t:"Risk transference",ok:false,x:"Transference shifts financial impact to another party such as an insurer. No third party is taking on the risk here."}
 ],
 w:"Risk appetite is the amount of risk an organization is willing to pursue: expansionary (more), neutral, or conservative (less). Strategies (avoid, transfer, mitigate, accept) are how you treat a specific risk."},
{id:"a013",obj:"4.3",d:4,cat:"ops",t:"mc",
 q:"A software company's vulnerability scanner reports the finding below on a build server. The administrator confirms that the server is on the internal network only, runs the patched vendor package with backported fixes, and the service is reachable only from the build subnet. Which of the following should the administrator do FIRST?",
 ex:"Host: build02 (10.20.4.15)\nPlugin: Apache HTTP Server 2.4.x < 2.4.58 Multiple Vulnerabilities\nCVE-2023-45802   CVSS v3.1 Base: 7.5 (High)\nDetected version: 2.4.52 (from banner)\nService: tcp/8080",
 o:[
  {t:"Document the finding as a false positive and submit it for exception review with the evidence",ok:true,x:"The scanner keyed on a banner while the distro backported the fix, so the vulnerability is not actually present. Confirmation and documentation come before any remediation effort."},
  {t:"Upgrade the server immediately because the CVSS score is High",ok:false,x:"CVSS measures theoretical severity, not whether the flaw exists here. Upgrading a system that is already fixed wastes a change window and skips the analysis step."},
  {t:"Move the build server to the screened subnet to reduce exposure",ok:false,x:"The server is internal and reachable only from the build subnet; moving it toward the perimeter would increase, not reduce, its exposure."},
  {t:"Disable the vulnerability scanner plugin for all hosts",ok:false,x:"Silencing the plugin globally would hide real instances of the vulnerability on other servers that are not backported."}
 ],
 w:"Vulnerability analysis: confirm (false positive vs true positive), then prioritize with CVSS plus environmental context, then respond. Banner-based detections need version verification."},
{id:"a014",obj:"3.2",d:3,cat:"netsec",t:"mc",dg:"dmz",
 q:"A school district is deploying a new parent portal that must be reachable from the internet and that queries a student database. The security team wants a compromise of the portal to give an attacker no direct path to the internal network. Which of the following placements is BEST?",
 o:[
  {t:"Portal in a screened subnet; database kept internal and reachable only on its database port from the portal",ok:true,x:"A screened subnet isolates the internet-facing server between two firewall boundaries. Allowing only the portal to reach only the database port limits what a breach of the portal can touch."},
  {t:"Portal and database together in the screened subnet",ok:false,x:"Placing the database next to the portal exposes the district's student data in the least trusted zone; a portal compromise would sit on the same segment as the data."},
  {t:"Portal on the internal network with a firewall port-forward from the internet",ok:false,x:"A port-forward puts an internet-exposed host directly on the internal LAN, so compromising the portal gives immediate access to everything inside."},
  {t:"Portal and database both on the internal network, published through a VPN",ok:false,x:"Parents cannot be expected to use a district VPN, and the requirement is public reachability."}
 ],
 w:"Public-facing services go in a screened subnet (DMZ). Back-end data stays internal, reachable only over the specific ports the front end needs."},
{id:"a015",obj:"2.5",d:2,cat:"vulns",t:"mc",
 q:"A hospital's network team runs the scan below against a server that a vendor installed last week to manage the building's lighting. Which of the following should the team address FIRST?",
 ex:"Nmap scan report for 10.30.8.40\nPORT      STATE  SERVICE   VERSION\n22/tcp    open   ssh       OpenSSH 8.9\n23/tcp    open   telnet    Linux telnetd\n80/tcp    open   http      lighttpd 1.4\n443/tcp   open   https     lighttpd 1.4\n1883/tcp  open   mqtt      Mosquitto 2.0 (anonymous access allowed)",
 o:[
  {t:"Disable Telnet and the anonymous MQTT access, then place the server on an isolated building-systems VLAN",ok:true,x:"Telnet sends credentials in cleartext and anonymous MQTT lets anyone publish lighting commands. Removing unnecessary and unauthenticated services and segmenting the host reduces the attack surface immediately."},
  {t:"Upgrade OpenSSH to the latest release",ok:false,x:"OpenSSH 8.9 is a reasonably current, encrypted management protocol. The cleartext and unauthenticated services are the far larger exposure."},
  {t:"Replace lighttpd with a different web server",ok:false,x:"Changing the web server product does not address the open Telnet and anonymous MQTT services and may break the vendor's application."},
  {t:"Block port 443 at the firewall because the certificate is likely self-signed",ok:false,x:"HTTPS is the encrypted management path you want to keep; a self-signed certificate is a lesser concern than cleartext Telnet and unauthenticated MQTT."}
 ],
 w:"Hardening order of operations: remove cleartext and unauthenticated services, disable what is unnecessary, then segment. Open service ports and default configurations are common threat vectors."},
{id:"a016",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"A software company signs a broad contract with a security consultancy that sets payment terms, liability, and confidentiality for all future engagements. Two months later it wants a two-week API penetration test with specific deliverables and a fixed price. Which of the following documents should be created for the test?",
 o:[
  {t:"Statement of work under the existing master service agreement",ok:true,x:"The MSA already governs the relationship; each individual engagement is scoped by a SOW (or work order) describing deliverables, timeline, and price."},
  {t:"A new master service agreement",ok:false,x:"The MSA is the umbrella already in place; creating another one for a single test duplicates terms rather than defining the work."},
  {t:"Memorandum of understanding",ok:false,x:"An MOU is a non-binding statement of intent, unsuitable for a paid engagement with defined deliverables."},
  {t:"Service-level agreement",ok:false,x:"An SLA defines ongoing performance metrics such as uptime or response time. It does not scope a one-time project."}
 ],
 w:"MSA = umbrella terms; SOW/WO = specific project scope and price; SLA = measurable service targets; MOU/MOA = intent or cooperation; NDA = confidentiality; BPA = partnership."},
{id:"a017",obj:"1.1",d:1,cat:"controls",t:"ms",pick:2,dg:"controls",
 q:"A school district's security officer is cataloging controls. Which TWO of the following classifications are correct?",
 o:[
  {t:"Reviewing badge-reader logs each morning for after-hours entries is an operational, detective control",ok:true,x:"Log review is performed by people as a routine process (operational) and it discovers events after they occur (detective)."},
  {t:"An acceptable use policy that tells staff what they may do is a managerial, directive control",ok:true,x:"Policies are managerial controls, and one that instructs behavior rather than technically enforcing it is directive."},
  {t:"Full-disk encryption on teacher laptops is a physical, preventive control",ok:false,x:"Encryption is implemented in software or hardware, making it a technical control. It is preventive, but the category is wrong."},
  {t:"Restoring a file server from backup after a crash is a technical, deterrent control",ok:false,x:"Restoring from backup is corrective; it fixes damage after the fact. It does not discourage an attacker, so it is not deterrent."},
  {t:"A sign warning that the parking lot is under video surveillance is a technical, detective control",ok:false,x:"The sign is a physical-category item whose purpose is to discourage misconduct, making it a deterrent, not a detective control."},
  {t:"A quarterly risk assessment is an operational, compensating control",ok:false,x:"Risk assessments are governance activities, so they are managerial. They are not stand-ins for a missing control, so they are not compensating."}
 ],
 w:"Category = who/what implements it (technical, managerial, operational, physical). Type = what it does (preventive, deterrent, detective, corrective, compensating, directive). Every control gets one of each."},
{id:"a018",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"A hospital network engineer wants administrators to log in to core switches with individual accounts, wants each configuration command to be authorized separately, and wants the full command history recorded centrally. Which of the following protocols BEST meets these requirements?",
 o:[
  {t:"TACACS+",ok:true,x:"TACACS+ separates authentication, authorization, and accounting, supports per-command authorization, and encrypts the whole packet body, which is why it is preferred for device administration."},
  {t:"RADIUS",ok:false,x:"RADIUS bundles authentication and authorization together and cannot authorize individual commands; it is best suited to network access such as Wi-Fi and VPN."},
  {t:"LDAPS",ok:false,x:"LDAPS is a secure directory lookup protocol; it can hold accounts but provides no command authorization or accounting for network devices."},
  {t:"Kerberos",ok:false,x:"Kerberos issues tickets for domain services; it does not provide per-command authorization or accounting on switches."}
 ],
 w:"TACACS+ = device administration with per-command authorization and full-packet encryption (TCP 49). RADIUS = network access AAA (UDP 1812/1813), encrypts only the password."},
{id:"a019",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A software company's identity provider shows the events below for one developer account within five minutes. The developer says they were on a video call and did not attempt to log in. Which of the following attacks is MOST likely occurring?",
 ex:"17:02:11  LOGIN FAIL  user=r.okafor  src=198.51.100.23  reason=bad password\n17:02:12  LOGIN FAIL  user=r.okafor  src=198.51.100.23  reason=bad password\n17:02:12  LOGIN FAIL  user=r.okafor  src=198.51.100.23  reason=bad password\n... (412 additional failures) ...\n17:06:40  ACCOUNT LOCKED user=r.okafor  (threshold 5 reached 83 times)",
 o:[
  {t:"Brute-force password attack against a single account",ok:true,x:"Hundreds of rapid failures against one username from one source, tripping the lockout repeatedly, is a brute-force attempt to guess that account's password."},
  {t:"Password spraying",ok:false,x:"Spraying tries one or two common passwords across many usernames to stay under lockout thresholds. Here a single account is hammered and locked repeatedly."},
  {t:"Credential replay",ok:false,x:"Replay reuses a captured valid credential or token and would produce successes, not hundreds of bad-password failures."},
  {t:"On-path attack",ok:false,x:"An on-path attacker intercepts traffic between the developer and the IdP; it would not generate a flood of failed logins from a separate source address."}
 ],
 w:"Brute force = many passwords, one account (lockouts). Spraying = one password, many accounts (few lockouts). Repeated lockouts on one user are an indicator to investigate."},
{id:"a020",obj:"3.4",d:3,cat:"data",t:"mc",dg:"backups",
 q:"A hospital performs a full backup of its lab results system every Sunday night and a differential backup every night from Monday through Saturday. The storage array fails on Thursday at 07:00. Which of the following describes the MINIMUM restore required to recover to the most recent backup?",
 o:[
  {t:"Sunday's full backup plus Wednesday night's differential",ok:true,x:"A differential captures everything changed since the last full, so the latest differential (Wednesday night) plus Sunday's full contains all data through Wednesday night."},
  {t:"Sunday's full backup plus Monday, Tuesday, and Wednesday differentials",ok:false,x:"That is how incrementals are restored. Each differential already includes the earlier days' changes, so only the newest one is needed."},
  {t:"Wednesday night's differential only",ok:false,x:"A differential holds only changes since Sunday; without the full backup the unchanged data is missing."},
  {t:"Sunday's full backup only",ok:false,x:"Restoring only the full backup would lose three days of lab results that the differentials captured."}
 ],
 w:"Full + latest differential = two sets to restore (differentials grow daily). Full + every incremental since = smaller backups but a longer restore chain."},
{id:"a021",obj:"5.2",d:5,cat:"gov",t:"ms",pick:2,
 q:"A software company's risk register contains the row shown below. Which TWO of the following statements are correct?",
 ex:"Risk ID: R-17   Source-code repository outage\nAsset value (AV): $500,000\nExposure factor (EF): 40%\nAnnualized rate of occurrence (ARO): 0.5\nRisk owner: Director of Engineering\nThreshold: 8 hours downtime",
 o:[
  {t:"The single loss expectancy is $200,000",ok:true,x:"SLE = AV × EF = $500,000 × 0.40 = $200,000."},
  {t:"The annualized loss expectancy is $100,000",ok:true,x:"ALE = SLE × ARO = $200,000 × 0.5 = $100,000."},
  {t:"The annualized loss expectancy is $200,000",ok:false,x:"$200,000 is the SLE. Multiplying by an ARO of 0.5 halves it to $100,000 per year."},
  {t:"An ARO of 0.5 means the outage is expected twice per year",ok:false,x:"ARO is events per year; 0.5 means one event every two years. Twice a year would be an ARO of 2."},
  {t:"The exposure factor means each outage costs $40,000",ok:false,x:"EF is a percentage of asset value lost per event: 40% of $500,000 is $200,000, not $40,000."},
  {t:"The threshold is the maximum annual loss the company will tolerate",ok:false,x:"The threshold here is expressed in hours of downtime, a key risk indicator trigger, not a dollar limit on annual loss."}
 ],
 w:"Read a risk register row carefully: SLE = AV × EF, ALE = SLE × ARO. ARO below 1 means less than once per year. Thresholds and KRIs tell the owner when to act."},
{id:"a022",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"A school district allows teachers to use personal phones for district email and wants to be able to wipe district data if a phone is lost, without touching the teacher's personal photos or apps. Which of the following BEST meets this requirement?",
 o:[
  {t:"Enroll the devices in MDM with a managed work container and selective wipe",ok:true,x:"Containerization separates district apps and data from personal content, and MDM can wipe only the managed container, matching the BYOD requirement."},
  {t:"Issue district-owned phones under a COPE model",ok:false,x:"COPE replaces the BYOD arrangement with new hardware purchases; the district wants to keep using teachers' own phones."},
  {t:"Require full-device encryption and a remote full wipe",ok:false,x:"A full wipe destroys the teacher's personal data, which the requirement explicitly forbids."},
  {t:"Block all mobile access and require district laptops for email",ok:false,x:"Blocking mobile access does not meet the goal of allowing personal phones; it removes the capability instead of securing it."}
 ],
 w:"BYOD = personal device, protect the org's data with a managed container and selective wipe. COPE = org-owned, personal use allowed. CYOD = org-owned, user picks from a list."},
{id:"a023",obj:"2.2",d:2,cat:"vulns",t:"mc",
 q:"A hospital still runs a specialized imaging workstation on an operating system whose vendor stopped releasing security updates two years ago. The application vendor has no supported upgrade path. Which of the following BEST describes the vulnerability, and which mitigation is MOST appropriate?",
 o:[
  {t:"Unsupported system; isolate it on a segmented network with strict ACLs",ok:true,x:"An OS that no longer receives patches is an unsupported/end-of-life system. Since patching is impossible, segmentation and tight access control are the compensating mitigations."},
  {t:"Zero-day; apply the vendor's emergency patch",ok:false,x:"A zero-day is a flaw unknown to the vendor with no patch yet. Here the vendor has simply ended support, and no patch will ever arrive."},
  {t:"Misconfiguration; run a hardening benchmark against it",ok:false,x:"Hardening helps but cannot fix kernel and library flaws that will never be patched; the root issue is lack of vendor support, not settings."},
  {t:"Firmware vulnerability; update the BIOS",ok:false,x:"The problem is the operating system's end of life, not the hardware firmware."}
 ],
 w:"Unsupported/legacy systems cannot be patched; mitigate with segmentation, isolation, allow lists, and monitoring while planning decommissioning."},
{id:"a024",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A software company runs a nightly report generator that is idle 23 hours a day. It wants to stop paying for an always-on virtual machine, avoid patching an operating system for this task, and have the code run only when a file lands in storage. Which of the following BEST fits?",
 o:[
  {t:"A serverless function triggered by the storage event",ok:true,x:"Serverless runs code on demand in response to events, bills only for execution time, and the provider manages the underlying OS and runtime."},
  {t:"A dedicated container host running the report service continuously",ok:false,x:"A container host is still an always-on system the company must patch and pay for around the clock."},
  {t:"A larger virtual machine with auto-scaling enabled",ok:false,x:"Auto-scaling adds capacity under load but still leaves at least one VM running and patched by the company."},
  {t:"An on-premises batch server in the data center",ok:false,x:"On-premises hardware carries the highest fixed cost and full patching responsibility, the opposite of what is wanted."}
 ],
 w:"Serverless = event-driven, pay-per-execution, provider-managed runtime. Trade-offs: vendor lock-in, cold starts, and less control over the execution environment."},
{id:"a025",obj:"4.8",d:4,cat:"ir",t:"mc",
 q:"A software company has contained a compromised CI server, removed the attacker's web shell and scheduled task, and closed the exploited vulnerability. Which of the following should the incident response team do NEXT?",
 o:[
  {t:"Restore the server to production from a clean image and monitor it closely",ok:true,x:"After eradication, recovery returns systems to normal operation from trusted sources and verifies they stay clean before the team moves to lessons learned."},
  {t:"Isolate the server from the build network",ok:false,x:"Isolation is containment, which was already completed before eradication began."},
  {t:"Hold the lessons-learned review with stakeholders",ok:false,x:"Lessons learned is the final phase, after services have been restored and verified."},
  {t:"Identify the initial alert and determine whether it was a true positive",ok:false,x:"Detection and analysis happened at the start of the incident; by this point the compromise is confirmed and cleaned."}
 ],
 w:"Containment stops the bleeding, eradication removes the cause, recovery restores service, lessons learned improves the plan. Know which phase comes after which."},
{id:"a026",obj:"5.4",d:5,cat:"gov",t:"mc",
 q:"A school district uses a cloud gradebook service. The district decides which student data is collected and why; the vendor stores and processes the data according to the district's instructions. Under privacy regulations, which of the following BEST describes the two roles?",
 o:[
  {t:"The district is the data controller and the vendor is the data processor",ok:true,x:"The controller determines the purpose and means of processing; the processor handles the data on the controller's behalf under contract."},
  {t:"The district is the data processor and the vendor is the data controller",ok:false,x:"The vendor does not decide what to collect or why; it only acts on the district's instructions, so it cannot be the controller."},
  {t:"Both parties are data owners with equal accountability",ok:false,x:"Privacy law assigns distinct duties to controllers and processors; the vendor's accountability is limited to its contracted processing."},
  {t:"The students are the data custodians",ok:false,x:"Students are the data subjects. Custodians are the staff who technically manage storage and protection of the data."}
 ],
 w:"Controller = decides purpose; processor = acts on instructions; subject = the individual; owner = accountable executive; custodian/steward = day-to-day handling."},
{id:"a027",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"Several hospital employees receive an email with the logo and footer of the hospital's actual benefits provider announcing open enrollment and linking to hr-benefits-portal.example.net, a domain the provider does not own. Which of the following BEST describes this attack?",
 o:[
  {t:"Brand impersonation phishing",ok:true,x:"The attacker copies a trusted company's visual identity to make the lure believable. The linked domain is unrelated to the real provider, revealing the impersonation."},
  {t:"Typosquatting",ok:false,x:"Typosquatting registers a near-misspelling of the real domain to catch mistyped URLs. This domain is not a misspelling; the deception is the borrowed branding."},
  {t:"Pretexting by phone",ok:false,x:"Pretexting builds a false story in a conversation; this attack is a mass email, not an interactive call."},
  {t:"Misinformation campaign",ok:false,x:"Misinformation spreads false narratives to influence beliefs. This message's goal is to harvest credentials, not to shape opinion."}
 ],
 w:"Brand impersonation borrows a real company's look; typosquatting borrows its domain name with a typo. Both aim at credential theft."},
{id:"a028",obj:"1.4",d:1,cat:"crypto",t:"mc",
 q:"A software company issues code-signing certificates to its release team. Auditors require that the signing private keys can never be exported or copied from the machine, even by an administrator. Which of the following should be used to store the keys?",
 o:[
  {t:"A hardware security module",ok:true,x:"An HSM generates and uses keys inside tamper-resistant hardware and is designed so that private keys cannot be extracted, satisfying a non-exportability requirement."},
  {t:"A password-protected PKCS#12 file on the build server",ok:false,x:"A software keystore can be copied by anyone with file access; the password only slows an attacker down."},
  {t:"A cloud key management service with the key exported to each signer's laptop",ok:false,x:"Exporting the key to laptops is exactly what the auditors forbid; the value of a KMS is lost once the key leaves it."},
  {t:"Key escrow with the certificate authority",ok:false,x:"Escrow deliberately keeps a copy of the private key with a third party for recovery, which contradicts the requirement that keys never be copied."}
 ],
 w:"HSM = tamper-resistant hardware for key generation and use; TPM = per-device chip for platform keys; KMS = cloud service managing keys; escrow = a stored copy for recovery."},
{id:"a029",obj:"4.4",d:4,cat:"ops",t:"mc",
 q:"A school district's SIEM shows a failed login at 08:41:07 on the domain controller followed by a related firewall deny at 08:38:55, and analysts cannot build a reliable timeline. Which of the following is the MOST likely cause?",
 o:[
  {t:"The firewall and domain controller are not synchronized to a common time source",ok:true,x:"Events appearing out of order across devices almost always mean clock drift. Without NTP synchronization, log correlation and forensic timelines are unreliable."},
  {t:"The SIEM is dropping events because of license limits",ok:false,x:"Dropped events would produce gaps, not events with timestamps in the wrong order."},
  {t:"The firewall is not sending logs in syslog format",ok:false,x:"The SIEM is clearly parsing the firewall events; the issue is the timestamp value, not the format."},
  {t:"An attacker is tampering with the domain controller's logs",ok:false,x:"Log tampering usually shows as missing or altered entries; a consistent offset between two devices points to clock skew."}
 ],
 w:"Log aggregation needs synchronized time (NTP) on every source. Out-of-order timestamps are a data quality issue, not an attack indicator by themselves."},
{id:"a030",obj:"3.2",d:3,cat:"netsec",t:"mc",dg:"vpn",
 q:"A hospital is connecting a new outpatient clinic to the main campus across the internet. All traffic between the two sites, including the original internal IP headers, must be encrypted, and individual users must not need any client software. Which of the following should be deployed?",
 o:[
  {t:"A site-to-site IPsec VPN in tunnel mode between the two firewalls",ok:true,x:"Tunnel mode encapsulates and encrypts the entire original packet, including internal IP headers, and a site-to-site VPN between gateways is transparent to users."},
  {t:"IPsec in transport mode between each clinic workstation and each campus server",ok:false,x:"Transport mode encrypts only the payload and leaves the original IP header exposed, and configuring every host pair does not meet the no-client requirement."},
  {t:"A TLS remote-access VPN that each clinician connects to at login",ok:false,x:"A remote-access VPN requires per-user client sessions, which the hospital wants to avoid for a fixed branch connection."},
  {t:"An SD-WAN overlay with traffic in the clear",ok:false,x:"SD-WAN provides path selection and management; without encryption it does not protect patient data crossing the internet."}
 ],
 w:"Site-to-site = gateway-to-gateway, transparent to users. IPsec tunnel mode protects the whole packet including the original headers; transport mode protects only the payload."},

{id:"a031",obj:"2.1",d:2,cat:"actors",t:"mc",
 q:"A school district's security team discovers that a group of teachers has been storing student assessment results in a free online whiteboard service with no district approval, contract, or review. The teachers say it was simply easier than the approved platform. Which of the following BEST describes this threat?",
 o:[
  {t:"Shadow IT",ok:true,x:"Staff adopting unapproved technology for convenience is shadow IT: an internal actor with no malicious intent that still puts regulated student data outside the district's controls."},
  {t:"Malicious insider",ok:false,x:"A malicious insider acts to harm the organization deliberately. The teachers were trying to do their jobs more easily, not to steal or damage data."},
  {t:"Supply chain compromise",ok:false,x:"A supply chain attack comes through a trusted vendor or product the district actually uses. This service was never a district supplier."},
  {t:"Hacktivist",ok:false,x:"Hacktivists are external actors with a political or social agenda; these are the district's own employees."}
 ],
 w:"Shadow IT = internal, usually well-meaning, low sophistication, but it bypasses data protection and compliance. Address it with policy, easy sanctioned tools, and monitoring."},
{id:"a032",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"A software company's mail gateway adds the header below to a message that asks the finance team to update a supplier's bank details. Which of the following BEST explains the result?",
 ex:"Authentication-Results: mx.example.net;\n  spf=pass smtp.mailfrom=bounce.bulk-mailer.example\n  dkim=fail (body hash did not verify) header.d=vendor-billing.example\n  dmarc=fail (p=quarantine) header.from=vendor-billing.example",
 o:[
  {t:"The message body was altered after it was signed, so it should be quarantined per the sender's DMARC policy",ok:true,x:"A DKIM body-hash failure means the content no longer matches what was signed. SPF passed only for an unrelated bulk-mailer domain, so it is not aligned with the From domain; DMARC fails and p=quarantine says to hold it."},
  {t:"The sending server is not authorized in the vendor's SPF record",ok:false,x:"SPF shows pass for the envelope domain used, so the sending IP is authorized for that domain. The failure is DKIM and alignment, not the SPF check itself."},
  {t:"The vendor has not published a DMARC record",ok:false,x:"The result line shows p=quarantine, which can only be read from a published DMARC record."},
  {t:"The gateway lacks the vendor's private key to verify the signature",ok:false,x:"DKIM verification uses the sender's public key published in DNS; the private key is never shared. The key was found, and the body hash did not match."}
 ],
 w:"dkim=fail with body hash mismatch = content changed in transit or forged. DMARC applies the domain owner's policy (none, quarantine, reject) when alignment fails."},
{id:"a033",obj:"1.2",d:1,cat:"controls",t:"mc",
 q:"After a zero trust redesign, a hospital's flat clinical network was replaced with many small segments so that a compromised lab analyzer can reach only the single results server it needs, and each connection is re-evaluated. Which of the following zero trust concepts does the redesign BEST illustrate?",
 o:[
  {t:"Threat scope reduction through minimized implicit trust zones",ok:true,x:"Shrinking large trusted segments into narrow implicit trust zones limits how far a compromised device can move, which is the threat scope reduction goal of zero trust."},
  {t:"Adaptive identity",ok:false,x:"Adaptive identity adjusts authentication demands based on user and device context. The redesign changed network reachability, not how identities are verified."},
  {t:"Policy administrator",ok:false,x:"The policy administrator is a control-plane component that passes decisions to enforcement points; it is not the concept of shrinking trust boundaries."},
  {t:"Centralized authentication",ok:false,x:"A single directory is useful but is not a zero trust principle; the scenario is about limiting lateral movement in the data plane."}
 ],
 w:"Zero trust control-plane ideas: adaptive identity, threat scope reduction, policy-driven access, policy engine and administrator. Data plane: subjects, implicit trust zones, enforcement points."},
{id:"a034",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A hospital's infusion pumps run a real-time operating system. The manufacturer releases firmware only after regulatory review, typically 12 to 18 months after a flaw is disclosed. Which of the following architecture considerations MOST directly shapes how the hospital secures these devices?",
 o:[
  {t:"Inability to patch in a timely manner, requiring segmentation and compensating controls",ok:true,x:"When patch availability lags by a year or more, the hospital cannot rely on patching. It must isolate the pumps on a medical-device network and add monitoring and access restrictions."},
  {t:"Ease of deployment, because RTOS devices can be replaced quickly",ok:false,x:"Regulated medical devices are expensive and slow to replace; ease of deployment is not the driving consideration here."},
  {t:"Scalability, because more pumps can be added on demand",ok:false,x:"Adding devices is not the security problem; the issue is that existing devices remain vulnerable for long periods."},
  {t:"Risk transference, because the manufacturer accepts liability for the firmware",ok:false,x:"The manufacturer's regulatory process does not transfer the hospital's risk of a compromised pump on its network."}
 ],
 w:"Embedded, RTOS, IoT, and ICS devices often cannot be patched promptly. Design for that: dedicated segments, allow lists, and monitoring instead of assuming timely updates."},
{id:"a035",obj:"5.2",d:5,cat:"gov",t:"mc",
 q:"A software company's BIA records that a storage controller fails about once every 20,000 hours of operation and that engineers typically need 3 hours to replace it and restore service. Which of the following metrics do these two figures represent, in order?",
 o:[
  {t:"MTBF and MTTR",ok:true,x:"Mean time between failures is the expected operating time between breakdowns (20,000 hours); mean time to repair is the average time to restore service after one (3 hours)."},
  {t:"RTO and RPO",ok:false,x:"RTO is the maximum tolerable downtime set by the business, and RPO is acceptable data loss in time. Neither is a measured failure interval or repair duration."},
  {t:"MTTR and MTBF",ok:false,x:"The order is reversed; 20,000 hours between failures is MTBF, and 3 hours to fix is MTTR."},
  {t:"ARO and SLE",ok:false,x:"ARO is a yearly event probability and SLE is a dollar loss; these figures are expressed in hours, not events per year or currency."}
 ],
 w:"MTBF = reliability (time between failures). MTTR = maintainability (time to fix). RTO = business tolerance for downtime. RPO = tolerance for data loss."},
{id:"a036",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"A hospital wants a scheduling app to read physicians' calendars in the hospital's cloud email platform. Physicians must grant the app access without giving it their passwords, and the hospital must be able to revoke that access later. Which of the following should the app use?",
 o:[
  {t:"OAuth 2.0 authorization with scoped access tokens",ok:true,x:"OAuth lets a user delegate limited access (a calendar-read scope) to a third-party app via tokens the provider can revoke, with no password ever shared."},
  {t:"SAML assertions from the hospital identity provider",ok:false,x:"SAML authenticates a user to a web application; it does not grant an app delegated permission to call an API on the user's behalf."},
  {t:"LDAP credentials stored in the app's configuration",ok:false,x:"Storing physician credentials violates the no-password requirement and cannot be revoked per app without changing the password."},
  {t:"Kerberos tickets forwarded from each physician's workstation",ok:false,x:"Kerberos delegation is an on-premises domain mechanism; it does not provide scoped, revocable API access to a cloud email platform."}
 ],
 w:"OAuth answers 'may this app act on my behalf for this scope?' OIDC adds 'who is this user?' SAML answers the same identity question with XML for enterprise SSO."},
{id:"a037",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A school district help desk notices that several lab computers intermittently receive certificate warnings for internal sites. On one computer the technician runs the command below. Which of the following attacks is MOST likely occurring?",
 ex:"C:\\> arp -a\nInterface: 10.50.12.31 --- 0x8\n  Internet Address      Physical Address      Type\n  10.50.12.1            3c-2a-f1-07-9b-44     dynamic\n  10.50.12.88           3c-2a-f1-07-9b-44     dynamic\n  10.50.12.200          00-1b-63-a4-12-e0     dynamic",
 o:[
  {t:"On-path attack using ARP poisoning",ok:true,x:"The default gateway 10.50.12.1 and host 10.50.12.88 share the same MAC address, meaning .88 is answering ARP for the gateway and intercepting traffic. The certificate warnings come from its TLS interception."},
  {t:"DNS cache poisoning",ok:false,x:"DNS poisoning alters name-to-IP answers; it would not cause two IP addresses in the local ARP table to map to one MAC."},
  {t:"MAC flooding of the lab switch",ok:false,x:"MAC flooding overwhelms the switch CAM table so it broadcasts frames; it does not make the gateway IP resolve to another host's MAC."},
  {t:"Rogue DHCP server",ok:false,x:"A rogue DHCP server hands out a wrong gateway IP address; here the gateway IP is correct but its MAC has been hijacked."}
 ],
 w:"Two IPs with one MAC in arp -a, especially when one is the gateway, is the classic ARP poisoning indicator. Dynamic ARP inspection and DHCP snooping on the switch prevent it."},
{id:"a038",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"A software company is redesigning its office Wi-Fi. Requirements: no shared passphrase, each employee authenticated with a unique certificate, and authentication decisions made by the corporate AAA server. Which of the following configurations meets ALL of the requirements?",
 o:[
  {t:"WPA3-Enterprise using 802.1X with EAP-TLS against a RADIUS server",ok:true,x:"WPA3-Enterprise defers authentication to RADIUS via 802.1X, and EAP-TLS uses per-user client certificates instead of any shared secret."},
  {t:"WPA3-Personal with SAE and a 24-character passphrase",ok:false,x:"SAE strengthens the handshake, but WPA3-Personal still relies on one shared passphrase for everyone, which the requirements forbid."},
  {t:"WPA2-Enterprise with PEAP-MSCHAPv2",ok:false,x:"PEAP with MSCHAPv2 uses usernames and passwords inside a TLS tunnel; it does not provide per-user certificate authentication."},
  {t:"Open network with a captive portal and MAC address filtering",ok:false,x:"MAC filtering is trivially bypassed by spoofing, and an open network provides no per-user cryptographic authentication."}
 ],
 w:"Enterprise Wi-Fi = 802.1X + RADIUS. EAP-TLS = mutual certificate authentication (strongest). PEAP/EAP-TTLS = password inside a TLS tunnel. Personal = shared passphrase (SAE in WPA3)."},
{id:"a039",obj:"5.5",d:5,cat:"third",t:"mc",
 q:"A hospital hires a penetration testing firm and provides only the hospital's public domain name. The testers spend the first week reviewing job postings, certificate transparency logs, and DNS records without sending any packets to hospital systems. Which of the following BEST describes the engagement and this phase?",
 o:[
  {t:"Unknown environment test; passive reconnaissance",ok:true,x:"Giving testers nothing beyond a domain name is an unknown (black box) test, and gathering public data without touching the target is passive reconnaissance."},
  {t:"Known environment test; active reconnaissance",ok:false,x:"A known environment test would include network diagrams and credentials, and active reconnaissance would involve scanning or probing hospital systems directly."},
  {t:"Partially known environment test; passive reconnaissance",ok:false,x:"Partially known means the testers received some internal details such as IP ranges or an account; a bare domain name does not qualify."},
  {t:"Unknown environment test; active reconnaissance",ok:false,x:"The testers have not sent traffic to the hospital, so the reconnaissance is passive, not active."}
 ],
 w:"Unknown / partially known / known environment = how much the testers are told. Passive recon uses public sources with no target contact; active recon probes the target directly."},
{id:"a040",obj:"2.4",d:2,cat:"social",t:"ms",pick:2,
 q:"A school district's file server begins behaving abnormally on a Monday morning. Which TWO of the following observations are the STRONGEST indicators that ransomware is executing on the server?",
 o:[
  {t:"Thousands of documents are being renamed with an unfamiliar extension and a text file appears in each folder",ok:true,x:"Mass renaming with a new extension is the encryption in progress, and a dropped note in every folder is the ransom demand. Together they are the definitive indicator."},
  {t:"Volume shadow copies were deleted minutes before the file activity began",ok:true,x:"Ransomware routinely destroys shadow copies so victims cannot roll files back. This action right before mass file changes is a strong early indicator."},
  {t:"The server's antivirus definitions updated overnight",ok:false,x:"A scheduled signature update is routine maintenance and would not by itself explain file renaming."},
  {t:"A scheduled defragmentation job ran over the weekend",ok:false,x:"Defragmentation rearranges data blocks on disk but never renames files or drops notes into folders."},
  {t:"Disk usage grew by 2% after a group of teachers uploaded lesson plans",ok:false,x:"Modest growth from legitimate uploads is normal use and is unrelated to encryption."},
  {t:"A user reports that the printer queue is slow",ok:false,x:"A slow print queue is a common performance complaint with many benign causes; it is not an indicator of ransomware."}
 ],
 w:"Ransomware indicators: mass file renames/extension changes, ransom notes, deleted shadow copies and backups, spiking disk I/O, and files that no longer open. Isolate the host immediately."},
{id:"a041",obj:"3.4",d:3,cat:"data",t:"mc",
 q:"A hospital's electronic health record database must keep running if the server hosting it fails, with the same data and connection address, and only one node may write to the database at a time. Which of the following should be deployed?",
 o:[
  {t:"An active-passive failover cluster with shared storage",ok:true,x:"A failover cluster presents one virtual address and moves the database role to the standby node on failure, while shared storage keeps a single writable copy."},
  {t:"A load balancer distributing queries across several independent database servers",ok:false,x:"Load balancing spreads stateless requests; independent database servers would diverge unless replicated, and the requirement allows only one writer."},
  {t:"Nightly snapshots replicated to a warm site",ok:false,x:"Snapshots protect against data loss but require a manual restore; they do not keep the database running through a server failure."},
  {t:"A content delivery network in front of the EHR application",ok:false,x:"A CDN caches static web content for performance; it does nothing for database availability."}
 ],
 w:"Clustering = failover for stateful services (databases), one virtual address. Load balancing = spreading traffic across identical, mostly stateless nodes (web tier)."},
{id:"a042",obj:"4.8",d:4,cat:"ir",t:"mc",
 q:"A software company receives notice that a former customer intends to sue over a data breach. The legal department instructs IT to ensure that all email, chat logs, and ticket records related to the customer are not deleted by normal retention jobs. Which of the following BEST describes this instruction?",
 o:[
  {t:"Legal hold",ok:true,x:"A legal hold suspends routine deletion so that potentially relevant evidence is preserved for anticipated litigation."},
  {t:"Chain of custody",ok:false,x:"Chain of custody documents who handled specific evidence and when; it does not stop retention jobs from deleting data."},
  {t:"E-discovery",ok:false,x:"E-discovery is the later process of identifying, collecting, and producing the preserved records; the hold must come first."},
  {t:"Data sanitization",ok:false,x:"Sanitization securely destroys data, the opposite of what legal is requesting."}
 ],
 w:"Legal hold = preserve now, before anything is deleted. Chain of custody = document handling. E-discovery = find and produce. Order matters."},
{id:"a043",obj:"1.4",d:1,cat:"crypto",t:"mc",
 q:"A school district is enabling full-disk encryption on 3,000 student laptops. The district wants the disk to unlock automatically only when the laptop boots with untampered firmware and boot loader, and wants the decryption key bound to that specific machine. Which of the following should be used?",
 o:[
  {t:"A Trusted Platform Module that seals the volume key to measured boot values",ok:true,x:"The TPM stores the key in hardware and releases it only if the boot measurements match, tying decryption to that machine's known-good boot state."},
  {t:"A password-based key stored on a USB drive kept with each laptop",ok:false,x:"A key that travels with the laptop unlocks the disk for whoever takes both, and it does nothing to verify the boot chain."},
  {t:"A network HSM that laptops contact during boot",ok:false,x:"An HSM is a shared appliance for server and CA keys; laptops that boot offline cannot depend on it, and it does not measure the local boot chain."},
  {t:"Key escrow with the district's certificate authority",ok:false,x:"Escrow gives administrators a recovery copy of the key; it does not unlock the disk automatically or validate firmware integrity."}
 ],
 w:"TPM = built-in chip that stores keys and boot measurements for a single device (BitLocker-style FDE). HSM = tamper-resistant appliance for high-value shared keys."},
{id:"a044",obj:"5.2",d:5,cat:"gov",t:"mc",
 q:"A school district's cafeteria payment system requires an outdated TLS version that violates the district's encryption standard. Replacing the system is budgeted for next fiscal year. The CIO signs a document allowing the system to keep operating until then, with added network restrictions. Which of the following risk strategies has been applied?",
 o:[
  {t:"Acceptance with a documented exception",ok:true,x:"The district is knowingly operating outside its own standard for a defined period; a signed, time-bound exception with compensating restrictions is formal risk acceptance."},
  {t:"Avoidance",ok:false,x:"Avoidance would mean shutting the payment system down now to eliminate the risk entirely, which the district chose not to do."},
  {t:"Transference",ok:false,x:"No insurer or vendor is assuming the financial consequences; the district retains the risk."},
  {t:"Mitigation as the sole strategy",ok:false,x:"Network restrictions reduce likelihood, but the underlying non-compliant TLS remains by decision; the governing action is the signed acceptance of that residual risk."}
 ],
 w:"Accept = knowingly keep the risk (with exception or exemption paperwork). Avoid = stop the activity. Transfer = insurance or contract. Mitigate = reduce likelihood or impact."},
{id:"a045",obj:"4.5",d:4,cat:"ports",t:"mc",
 q:"A hospital administrator reviews listening services on a legacy file transfer server used to send lab reports to a partner clinic. Which of the following changes would BEST protect the data in transit without changing the server's role?",
 ex:"$ sudo ss -tulnp\nNetid State  Local Address:Port  Process\ntcp   LISTEN 0.0.0.0:21          vsftpd\ntcp   LISTEN 0.0.0.0:22          sshd\nudp   UNCONN 0.0.0.0:161         snmpd (v2c, community: public)\ntcp   LISTEN 0.0.0.0:80          nginx",
 o:[
  {t:"Move lab transfers to SFTP over port 22, disable FTP, and migrate SNMP to version 3 with authentication",ok:true,x:"SFTP rides on the already-present SSH service and encrypts credentials and data; SNMPv3 replaces the cleartext community string with authenticated, encrypted management."},
  {t:"Change the FTP port from 21 to 2121 and the SNMP community string to a random value",ok:false,x:"Moving the port and changing the community string are obscurity measures; FTP and SNMPv2c still send everything in cleartext."},
  {t:"Enable FTPS by adding a certificate to vsftpd and keep SNMPv2c for compatibility",ok:false,x:"FTPS does encrypt the transfer, but leaving SNMPv2c exposes the public community string on UDP 161 to anyone on the network."},
  {t:"Block port 22 at the firewall because SSH allows remote shells",ok:false,x:"SSH is the encrypted transport the fix depends on; blocking it removes secure management while leaving the insecure services running."}
 ],
 w:"Protocol selection: FTP (21) to SFTP (22) or FTPS; SNMPv1/v2c to SNMPv3 (161/162); Telnet (23) to SSH; HTTP (80) to HTTPS (443). Choose the encrypted protocol, not a new port."},
{id:"a046",obj:"2.3",d:2,cat:"vulns",t:"mc",
 q:"A school district's parent portal lets users post comments on announcements. A parent reports that whenever they open a particular announcement, their browser is redirected to an unrelated site and their session appears to be logged out. The portal displays comments exactly as submitted. Which of the following vulnerabilities is being exploited?",
 o:[
  {t:"Stored cross-site scripting",ok:true,x:"A script saved in a comment executes in every visitor's browser because the portal echoes input without encoding. The redirect and session theft affecting all viewers marks it as stored, not reflected."},
  {t:"SQL injection",ok:false,x:"SQL injection targets the database query layer; it would not cause other users' browsers to redirect when viewing a page."},
  {t:"Reflected cross-site scripting",ok:false,x:"Reflected XSS requires each victim to click a crafted link; here the payload persists in the announcement and fires for everyone who opens it."},
  {t:"Buffer overflow",ok:false,x:"A buffer overflow corrupts memory in a native process and typically crashes it; it does not run script in visitors' browsers."}
 ],
 w:"Stored XSS = malicious input saved server-side and served to every viewer. Fix with output encoding, input validation, and HttpOnly cookies."},
{id:"a047",obj:"3.2",d:3,cat:"netsec",t:"mc",
 q:"A school district has 22 school sites connected by expensive leased lines to a central data center, and all internet-bound traffic hairpins through headquarters. It wants to add cheaper broadband links at each school, steer traffic across links by application and health, and manage it centrally. Which of the following BEST meets these goals?",
 o:[
  {t:"SD-WAN",ok:true,x:"SD-WAN abstracts multiple transport links under central policy, choosing paths per application and link health, and allows local internet breakout instead of backhauling."},
  {t:"A site-to-site IPsec VPN over each broadband link",ok:false,x:"Static VPN tunnels add encryption but do not provide application-aware path selection or centralized orchestration across links."},
  {t:"A larger core router at headquarters",ok:false,x:"Upgrading the hub does nothing to use the new broadband links at the schools or to stop the hairpin design."},
  {t:"MPLS circuits to every site",ok:false,x:"MPLS is the costly leased-line model the district is trying to supplement, not a way to use cheap broadband intelligently."}
 ],
 w:"SD-WAN = centrally managed, application-aware path selection over mixed transports. SASE = SD-WAN plus cloud-delivered security (SWG, CASB, ZTNA, FWaaS)."},
{id:"a048",obj:"4.5",d:4,cat:"ops",t:"mc",dg:"fwrules",
 q:"A software company's firewall protects a screened subnet holding a public web server at 203.0.113.10. Developers complain they can no longer connect to it over SSH from the office network 10.10.0.0/16. Which of the following changes fixes the problem with the LEAST additional exposure?",
 ex:"#  Action  Source           Destination        Proto/Port\n1  ALLOW   any              203.0.113.10       tcp/443\n2  ALLOW   any              203.0.113.10       tcp/80\n3  DENY    any              203.0.113.10       tcp/22\n4  ALLOW   10.10.0.0/16     203.0.113.10       tcp/22\n5  DENY    any              any                any",
 o:[
  {t:"Move rule 4 above rule 3",ok:true,x:"Firewalls process rules top-down and stop at the first match, so rule 3 blocks SSH before rule 4 can allow it. Reordering lets only the office range in on port 22."},
  {t:"Delete rule 3",ok:false,x:"Removing the explicit deny would work but relies on the final deny; it also invites a later ALLOW any tcp/22 to slip in unnoticed. Reordering is the least-change, least-exposure fix."},
  {t:"Change rule 3 to ALLOW any tcp/22",ok:false,x:"That opens SSH on a public server to the whole internet, the opposite of least exposure."},
  {t:"Add a rule allowing 10.10.0.0/16 to any on any port at the top",ok:false,x:"A blanket allow from the office to everything grants far more than SSH to one host."}
 ],
 w:"Rule order matters: first match wins. Specific allows must sit above broader denies, and the last rule is the implicit or explicit deny-all."},
{id:"a049",obj:"5.5",d:5,cat:"third",t:"mc",
 q:"A hospital's board wants assurance that the security team is following its own policies before a regulator arrives next year. It directs a group of board members to oversee a review performed by hospital staff who do not report to the CISO. Which of the following BEST describes this arrangement?",
 o:[
  {t:"An internal audit overseen by the audit committee",ok:true,x:"A board-level audit committee directing an independent internal team to check compliance with the organization's own policies is the definition of an internal audit."},
  {t:"An external regulatory examination",ok:false,x:"A regulatory examination is performed by the government body itself, which is what the hospital is preparing for, not what it is doing now."},
  {t:"A self-assessment by the security team",ok:false,x:"A self-assessment is done by the team being reviewed; here the reviewers deliberately do not report to the CISO."},
  {t:"An independent third-party audit",ok:false,x:"A third-party audit uses an outside firm. These reviewers are hospital employees."}
 ],
 w:"Internal audit = own staff, independent of the audited function, overseen by an audit committee. External = regulators or independent third parties. Self-assessment = the team checks itself."},
{id:"a050",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"Employees at a software company report that they were prompted to log in again after clicking a bookmark to the company's expense system. The security team finds the bookmark points to expense-examp1e.net, while the real system is expense-example.net. Which of the following BEST describes the attack?",
 o:[
  {t:"Typosquatting",ok:true,x:"The attacker registered a domain that differs from the real one by a visually similar character (1 for l) to capture users who mistype or misread the address."},
  {t:"Watering hole",ok:false,x:"A watering hole compromises a legitimate site the targets already visit; here the real expense site is untouched and a lookalike domain is used."},
  {t:"Pharming",ok:false,x:"Pharming redirects the correct domain name via DNS or hosts-file tampering; the users here typed or saved a different, lookalike name."},
  {t:"Business email compromise",ok:false,x:"BEC uses a hijacked or spoofed email account to request payments. No email account or payment request is involved."}
 ],
 w:"Typosquatting = lookalike domain with a typo or homoglyph. Defend with DNS filtering, defensive domain registration, and password managers that only fill on the true domain."},
{id:"a051",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"A software company is building a customer-facing mobile app and wants customers to sign in with an existing account from a large consumer identity provider. The app needs a signed JSON token that proves who the user is and includes basic profile claims. Which of the following should the developers implement?",
 o:[
  {t:"OpenID Connect",ok:true,x:"OIDC layers authentication on OAuth 2.0 and returns an ID token, a signed JWT with identity claims, which is exactly what a modern mobile app needs."},
  {t:"SAML 2.0",ok:false,x:"SAML delivers XML assertions through browser redirects designed for enterprise web SSO; it is heavier and poorly suited to native mobile apps needing JSON tokens."},
  {t:"OAuth 2.0 alone",ok:false,x:"OAuth alone issues access tokens for authorization to APIs; it does not standardize a token that asserts the user's identity."},
  {t:"LDAP over TLS",ok:false,x:"LDAPS is a directory query protocol; consumer identity providers do not expose it, and it would require the app to handle passwords."}
 ],
 w:"OIDC = OAuth 2.0 + ID token (JWT) for authentication. Use OIDC for 'log in with' flows in web and mobile apps; SAML remains common for enterprise SaaS SSO."},
{id:"a052",obj:"1.3",d:1,cat:"controls",t:"mc",
 q:"A school district's change board approves an upgrade to the student information system. During the maintenance window the upgrade succeeds, but the cafeteria point-of-sale and library systems stop working because they authenticate through an API the upgrade retired. Which of the following change management elements was MOST likely skipped?",
 o:[
  {t:"Impact analysis of dependencies",ok:true,x:"Identifying downstream systems that depend on the changed component is the purpose of impact analysis. The cafeteria and library integrations were dependencies nobody mapped."},
  {t:"Backout plan",ok:false,x:"A backout plan would help recover after the failure but would not have prevented it; the problem was not knowing the dependencies existed."},
  {t:"Maintenance window",ok:false,x:"The change was performed in an approved window; timing was not the issue."},
  {t:"Version control",ok:false,x:"Version control tracks configuration and code revisions; it does not identify which other systems consume a retired API."}
 ],
 w:"Change management: approval, ownership, stakeholders, impact analysis (including dependencies and legacy apps), test results, backout plan, maintenance window, documentation."},
{id:"a053",obj:"3.4",d:3,cat:"data",t:"mc",
 q:"A hospital wants to prove that its disaster recovery site can process the full patient admissions workload. Leadership will not accept any risk to live operations during the test. Which of the following testing methods BEST fits?",
 o:[
  {t:"Parallel processing test",ok:true,x:"In a parallel test the recovery site runs the workload alongside production using copied data, proving capacity and procedures without ever taking production offline."},
  {t:"Full failover test",ok:false,x:"A failover test actually switches production to the recovery site, which carries the live-operations risk leadership rejected."},
  {t:"Tabletop exercise",ok:false,x:"A tabletop is a discussion of the plan around a table; it proves nothing about the site's real processing capacity."},
  {t:"Simulation",ok:false,x:"A simulation walks teams through a scripted scenario, possibly with some technical steps, but does not run the full admissions workload at the recovery site."}
 ],
 w:"Tabletop (talk) < simulation (scripted walk-through) < parallel processing (recovery site runs alongside production) < failover (production actually moves)."},
{id:"a054",obj:"4.1",d:4,cat:"harden",t:"ms",pick:3,
 q:"A software company is building a secure baseline for new Linux web servers. Which THREE of the following should be included in the baseline?",
 o:[
  {t:"Remove unneeded packages and disable services that are not required for the web role",ok:true,x:"Every unnecessary package and listening service is attack surface. Removing them is a core hardening step for any server baseline."},
  {t:"Configure the host-based firewall to allow only TCP 22 from the management subnet and TCP 443 from anywhere",ok:true,x:"A host firewall enforcing least-privilege network access protects the server even if a network device is misconfigured."},
  {t:"Enforce SELinux in enforcing mode and apply the vendor's security benchmark settings",ok:true,x:"Mandatory access control confines the web process, and a recognized benchmark provides the tested settings that define the baseline."},
  {t:"Set the root password to a strong value and allow root SSH login for convenience",ok:false,x:"Direct root login removes accountability and is a prime brute-force target; baselines disable it in favor of sudo with individual accounts."},
  {t:"Install a broad set of development tools so engineers can debug in production",ok:false,x:"Compilers and debuggers on a production server give an attacker ready-made tools and enlarge the attack surface."},
  {t:"Disable automatic security updates to prevent unexpected changes",ok:false,x:"Turning off security updates leaves known vulnerabilities open; a baseline should ensure patches are applied through a managed process, not disabled."}
 ],
 w:"Secure baseline: minimal packages and services, host firewall, MAC (SELinux/AppArmor), benchmark settings, no direct root, managed patching, logging. Establish, deploy, then maintain."},
{id:"a055",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A hospital's cloud team notices that a research virtual machine's CPU has run at 100% for a week, the monthly compute bill has tripled, and the VM makes constant outbound connections to a mining pool on TCP 3333. The researchers say their jobs finished days ago. Which of the following indicators BEST describes this?",
 o:[
  {t:"Resource consumption from unauthorized cryptomining",ok:true,x:"Sustained CPU saturation, unexplained cost, and connections to a mining pool are the fingerprint of a cryptominer using the hospital's compute for the attacker's profit."},
  {t:"Resource inaccessibility from a denial-of-service attack",ok:false,x:"A DoS would make the VM unavailable to users; here the VM is running and busy, and the outbound connections point to abuse of its resources."},
  {t:"Impossible travel",ok:false,x:"Impossible travel concerns logins from distant locations in a short time; nothing about authentication location is described."},
  {t:"Out-of-cycle logging",ok:false,x:"Out-of-cycle logging is log activity at unexpected times; the indicator here is CPU and network consumption, not log timing."}
 ],
 w:"Resource consumption (CPU, bandwidth, cloud spend) that has no business explanation is a malicious activity indicator; cryptomining is the common cause."},
{id:"a056",obj:"5.1",d:5,cat:"gov",t:"mc",
 q:"A software company's security program includes a document with numbered, step-by-step actions the on-call engineer follows when the SIEM raises a credential-stuffing alert, including which accounts to lock and whom to notify. Which of the following BEST describes this document?",
 o:[
  {t:"Playbook",ok:true,x:"A playbook is a procedure: specific, ordered steps for handling one type of event. It tells the engineer exactly what to do for this alert."},
  {t:"Policy",ok:false,x:"A policy is a high-level statement of intent and requirements from management; it would say incidents must be handled, not list lock and notify steps."},
  {t:"Standard",ok:false,x:"A standard defines mandatory technical requirements such as password length or approved ciphers, not response actions."},
  {t:"Guideline",ok:false,x:"Guidelines are optional recommendations; the on-call steps here are mandatory and prescriptive."}
 ],
 w:"Policy (why/what, mandatory, high-level) > standard (measurable requirements) > procedure/playbook (step-by-step how) > guideline (recommended, optional)."},
{id:"a057",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"A hospital wants nurses to open patient charts only when they are assigned to that patient's unit, only from devices on the clinical network, and only during their scheduled shift. Roles alone cannot express this. Which of the following access control models BEST fits?",
 o:[
  {t:"Attribute-based access control",ok:true,x:"ABAC evaluates multiple attributes of the subject, object, and environment (unit assignment, device network, time of shift) at request time, which roles alone cannot capture."},
  {t:"Role-based access control",ok:false,x:"RBAC grants permissions by job role; a 'nurse' role cannot by itself restrict access by patient unit, device location, and shift time."},
  {t:"Discretionary access control",ok:false,x:"DAC lets the data owner assign permissions to individuals; it has no way to evaluate device or time conditions dynamically."},
  {t:"Mandatory access control",ok:false,x:"MAC compares fixed security labels and clearances; it does not account for unit assignment, network location, or shift schedule."}
 ],
 w:"RBAC = permissions by role. ABAC = decisions from attributes and context (who, what, where, when). MAC = labels and clearances. DAC = owner decides. Rule-based = fixed rules like time-of-day."},
{id:"a058",obj:"1.2",d:1,cat:"controls",t:"mc",
 q:"A software company's server room has no windows. Security wants an alarm if anyone moves inside the room after hours, but the HVAC blows air across the room and there are metal racks that might cause false alarms with some sensor types. Which of the following sensors is the MOST appropriate choice?",
 o:[
  {t:"Passive infrared motion sensor",ok:true,x:"PIR detects the body heat of a person moving through its field of view; airflow and static metal racks do not radiate changing infrared signatures, so it is well suited to this room."},
  {t:"Microwave sensor",ok:false,x:"Microwave sensors emit and measure reflected energy; metal racks reflect strongly and can cause nuisance alarms, and they may even detect movement through walls."},
  {t:"Pressure sensor",ok:false,x:"Pressure mats only trigger where someone steps; they do not cover a whole room and are easily bypassed."},
  {t:"Ultrasonic sensor",ok:false,x:"Ultrasonic sensors detect disturbances in sound waves and are prone to false alarms from moving air such as the HVAC flow described."}
 ],
 w:"Sensor types: infrared (body heat), microwave (reflected RF, penetrates walls), ultrasonic (sound, sensitive to air), pressure (weight on a surface). Match the sensor to the environment."},
{id:"a059",obj:"2.3",d:2,cat:"vulns",t:"mc",
 q:"A software company discovers that a cloud storage bucket used for customer support attachments has been listed on a public search engine, and anyone with the link can download files. The bucket was created by a developer with a quick default template. Which of the following vulnerability types does this represent?",
 o:[
  {t:"Cloud-specific misconfiguration",ok:true,x:"Public access on a storage bucket is not a software flaw; it is a configuration error in a cloud resource, one of the most common cloud-specific vulnerabilities."},
  {t:"Zero-day in the storage service",ok:false,x:"Nothing was exploited in the provider's software; the bucket was working as configured. The mistake was the permission setting."},
  {t:"Supply chain compromise",ok:false,x:"No vendor, supplier, or upstream component was tampered with; the company's own developer set the permissions."},
  {t:"Virtual machine escape",ok:false,x:"VM escape is a hypervisor break-out between tenants; this is object storage with an over-permissive access policy."}
 ],
 w:"Cloud misconfigurations (public buckets, open security groups, default credentials) are self-inflicted. Guard rails, IaC scanning, and configuration enforcement catch them."},
{id:"a060",obj:"3.2",d:3,cat:"arch",t:"mc",
 q:"A hospital's facilities network runs PLCs for the building's power and air handling. The security team wants to inventory the devices and detect threats, but a vendor warned that active probes have previously crashed the controllers. Which of the following approaches is MOST appropriate?",
 o:[
  {t:"Deploy a passive sensor on a switch mirror port to analyze ICS traffic without sending packets",ok:true,x:"A passive, out-of-band sensor sees all traffic copied from the SPAN or tap and can fingerprint devices and flag anomalies without ever transmitting to fragile PLCs."},
  {t:"Run an authenticated vulnerability scan against the PLC subnet monthly",ok:false,x:"Vulnerability scanners are active; they send probes that the vendor says can crash the controllers."},
  {t:"Place an inline IPS between the PLCs and the rest of the network in fail-closed mode",ok:false,x:"An inline device that fails closed could cut power and HVAC controls during a sensor fault, an unacceptable availability risk for building systems."},
  {t:"Install endpoint agents on each controller",ok:false,x:"PLCs run embedded firmware that cannot host third-party agents."}
 ],
 w:"Passive/tap = observe only, safe for ICS and medical devices. Active/inline = can block but can also disrupt. Choose device attributes based on fragility and failure-mode tolerance."},

{id:"a061",obj:"4.8",d:4,cat:"ir",t:"ms",pick:2,
 q:"A school district is building its incident response capability and has not yet experienced a major incident. Which TWO of the following activities belong to the preparation phase of the incident response process?",
 o:[
  {t:"Writing playbooks and running a tabletop exercise with the response team",ok:true,x:"Preparation is everything done before an incident: plans, playbooks, training, tooling, and exercises so the team can act when detection occurs."},
  {t:"Establishing an out-of-band communication channel and contact list for responders",ok:true,x:"Setting up communication paths that survive a compromised email system is a preparation task; you cannot build it during the incident."},
  {t:"Disconnecting an infected teacher laptop from the wireless network",ok:false,x:"Isolating an infected host is containment, which happens after detection and analysis of an actual incident."},
  {t:"Reviewing what went wrong after the incident is closed",ok:false,x:"That is the lessons-learned phase, which occurs last and feeds improvements back into preparation."},
  {t:"Restoring a database from a known-good backup",ok:false,x:"Restoration is recovery, performed after eradication of the threat."},
  {t:"Deciding whether a SIEM alert is a true positive",ok:false,x:"Validating alerts is the detection and analysis phase, not preparation."}
 ],
 w:"Preparation = plans, playbooks, training, tooling, communications, tabletop drills. Everything else in the lifecycle depends on how well this phase was done."},
{id:"a062",obj:"5.2",d:5,cat:"gov",t:"mc",dg:"risk",
 q:"A software company loses about six laptops a year to theft, and each loss costs $8,000 in hardware and breach handling. A tracking and encryption service costing $10,000 per year would cut the cost of each loss to $1,000. Which of the following BEST describes the cost-effectiveness of the service?",
 o:[
  {t:"Justified; it produces a net annual benefit of about $32,000",ok:true,x:"Current ALE = 6 × $8,000 = $48,000. With the control, ALE = 6 × $1,000 = $6,000, saving $42,000. Subtract the $10,000 cost and the net benefit is $32,000 per year."},
  {t:"Not justified; the $10,000 cost exceeds the new ALE of $6,000",ok:false,x:"The comparison is control cost versus the reduction in ALE ($42,000), not versus the residual ALE. The control saves far more than it costs."},
  {t:"Justified; it saves the full $48,000 per year",ok:false,x:"The control does not eliminate losses; $6,000 of ALE remains, so the saving is $42,000, and the control's own cost must also be deducted."},
  {t:"Not justified; it reduces the risk by only $7,000 per event",ok:false,x:"The per-event reduction is indeed $7,000, but with six events per year that is $42,000 annually, well above the $10,000 cost."}
 ],
 w:"Value of a control = (ALE before − ALE after) − annual cost of control. If the result is positive, the control is cost-justified."},
{id:"a063",obj:"1.2",d:1,cat:"controls",t:"mc",
 q:"A software company's identity platform normally lets engineers into the source repository with a password and a push notification. When an engineer connects from an unmanaged laptop in a country they have never logged in from, the platform requires a hardware security key and limits the session to read-only. Which of the following zero trust concepts is being applied?",
 o:[
  {t:"Adaptive identity",ok:true,x:"Adaptive identity raises or lowers authentication and authorization demands based on real-time context such as device trust and location, exactly what happened here."},
  {t:"Implicit trust zone",ok:false,x:"An implicit trust zone is a data-plane area where traffic flows freely after a decision; the scenario is about how the decision changed with context."},
  {t:"Policy enforcement point",ok:false,x:"The PEP is the gateway that carries out the decision; the concept described is the context-sensitive way the decision was reached."},
  {t:"Threat scope reduction",ok:false,x:"Threat scope reduction limits how far a compromise can spread by shrinking trust boundaries; the scenario is about stepping up identity assurance."}
 ],
 w:"Adaptive identity = risk-based, context-aware authentication and authorization. It is a control-plane concept alongside threat scope reduction and policy-driven access control."},
{id:"a064",obj:"2.3",d:2,cat:"attacks",t:"mc",
 q:"A hospital's legacy patient check-in kiosk service crashes repeatedly. The system log shows the entries below each time a visitor enters an unusually long name. Which of the following vulnerabilities is MOST likely being triggered?",
 ex:"kernel: checkin[4127]: segfault at 41414141 ip 0000000041414141 sp 00007ffd2c1e8a40 error 14\nsystemd: checkin.service: main process exited, code=killed, status=11/SEGV\nsystemd: checkin.service: scheduled restart job",
 o:[
  {t:"Buffer overflow",ok:true,x:"A crash at address 41414141 (the hex for AAAA) means user-supplied bytes overwrote the instruction pointer. Long input exceeding a fixed buffer is the classic overflow signature."},
  {t:"Race condition",ok:false,x:"A race condition is a timing flaw between two operations; it does not correlate with input length or fill the instruction pointer with input bytes."},
  {t:"SQL injection",ok:false,x:"SQL injection produces database errors or unexpected query results, not a segmentation fault in the process."},
  {t:"Directory traversal",ok:false,x:"Traversal attempts show up as ../ sequences in file paths, not as memory faults tied to input length."}
 ],
 w:"Segfault with 0x41414141 in the instruction pointer = memory overwritten by input. Buffer overflows are memory injection vulnerabilities; fix with bounds checking and modern languages or compiler protections."},
{id:"a065",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A software company's network team spends days reconfiguring switches by hand whenever a new development environment is built. They want the forwarding rules on all switches to be programmed from one controller through an API so that environments can be created and torn down in minutes. Which of the following should be adopted?",
 o:[
  {t:"Software-defined networking",ok:true,x:"SDN separates the control plane from the data plane so a central controller programs forwarding behavior across the fabric through APIs, enabling rapid, automated changes."},
  {t:"Physical isolation of each environment",ok:false,x:"Air-gapping each environment would require separate hardware for every build and makes changes slower, not faster."},
  {t:"A larger core switch with more VLANs",ok:false,x:"More VLAN capacity does not eliminate the manual per-switch configuration that is the bottleneck."},
  {t:"Spanning tree protocol tuning",ok:false,x:"Spanning tree prevents loops; it has nothing to do with programmatically provisioning network segments."}
 ],
 w:"SDN = centralized control plane with programmable data plane. Enables logical segmentation and IaC-style network automation; the controller becomes a critical asset to protect."},
{id:"a066",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"A hospital must stop staff from emailing spreadsheets that contain patient identifiers to personal accounts, while still allowing the same spreadsheets to be sent to the contracted billing partner. Which of the following should be deployed?",
 o:[
  {t:"Data loss prevention with content inspection rules and an allow list for the billing partner's domain",ok:true,x:"DLP inspects outbound content for patterns such as medical record numbers and can block, encrypt, or allow based on the destination, meeting both requirements."},
  {t:"A web filter blocking personal webmail sites",ok:false,x:"A web filter stops browsing to webmail but does nothing about attachments sent from the hospital's own email system."},
  {t:"File integrity monitoring on the file server",ok:false,x:"FIM detects changes to files on a host; it does not inspect or control outbound email content."},
  {t:"Full-disk encryption on all staff laptops",ok:false,x:"Disk encryption protects data at rest on a lost device; it has no effect on data a user deliberately emails."}
 ],
 w:"DLP = identify sensitive content (patterns, fingerprints, labels) and enforce policy on where it may go. Exceptions for approved partners are configured, not left to users."},
{id:"a067",obj:"5.6",d:5,cat:"third",t:"ms",pick:2,
 q:"A software company has shifted to a mostly remote workforce and is updating its security awareness program. Which TWO of the following are the MOST appropriate additions for this change?",
 o:[
  {t:"Guidance on securing home networks and separating work devices from household devices",ok:true,x:"Hybrid and remote work introduces home routers, shared computers, and family members; specific guidance for that environment is a core 701 awareness topic."},
  {t:"Training staff to recognize and report anomalous behavior, such as unusual data requests from colleagues",ok:true,x:"With less in-person contact, colleagues cannot easily verify each other; anomalous behavior recognition and reporting is how insider and impersonation risks get caught."},
  {t:"Removing phishing simulations because remote staff no longer use corporate email",ok:false,x:"Remote workers rely on email and chat even more, making phishing recognition training more important, not less."},
  {t:"Replacing the security policy handbook with a single annual video",ok:false,x:"A one-time video reduces the reinforcement and reference material staff need; awareness programs should be initial plus recurring."},
  {t:"Allowing staff to share credentials with family members who help with tasks",ok:false,x:"Credential sharing violates basic password management guidance and destroys accountability."},
  {t:"Ending reporting of program metrics to leadership since remote staff are harder to track",ok:false,x:"Reporting and monitoring are how the program is measured and improved; dropping them removes accountability for the program."}
 ],
 w:"Awareness program elements: phishing recognition, anomalous behavior recognition, guidance on policies, insider threat, passwords, removable media, social engineering, OPSEC, remote/hybrid work; initial and recurring reporting."},
{id:"a068",obj:"2.2",d:2,cat:"actors",t:"mc",
 q:"Several USB drives labeled 'Staff Salary Review 2026' are found in a school district's parking lot. One staff member plugs a drive into a workstation to identify the owner, and the drive immediately opens a command window before showing a folder. Which of the following threat vectors does this represent?",
 o:[
  {t:"Removable device",ok:true,x:"Baiting with planted USB drives is the removable-device vector; the drive acted as a keystroke injector or autorun payload the moment it was inserted."},
  {t:"Message-based",ok:false,x:"Message-based vectors arrive by email, SMS, or instant message. Nothing was sent to the staff member; the drive was physically picked up."},
  {t:"Supply chain",ok:false,x:"A supply chain vector comes through a legitimate vendor or product the district purchased. These drives were dropped by the attacker."},
  {t:"Unsecure wireless network",ok:false,x:"No wireless connection was involved; the compromise came through a physical USB port."}
 ],
 w:"Removable media is both a delivery vector and an exfiltration path. Mitigate with USB port controls, autorun disabled, endpoint protection, and training to hand found drives to security."},
{id:"a069",obj:"4.7",d:4,cat:"ops",t:"mc",
 q:"A software company automated all user provisioning, security-group changes, and ticket creation through one orchestration server. During a hardware failure, no accounts could be created and no alerts were routed for two days. Which of the following automation considerations does this incident BEST illustrate?",
 o:[
  {t:"Single point of failure",ok:true,x:"Consolidating every workflow on one server meant its failure halted all dependent processes at once; the orchestration platform itself needed redundancy."},
  {t:"Technical debt",ok:false,x:"Technical debt is the cost of past shortcuts in code or design; the failure here was a lack of redundancy, not poor-quality implementation."},
  {t:"Complexity",ok:false,x:"Complexity refers to workflows that are hard to understand and maintain; the outage was caused by hardware dependency, not confusing logic."},
  {t:"Ongoing supportability",ok:false,x:"Supportability concerns whether staff can maintain the automation over time; it does not describe a two-day outage from one failed host."}
 ],
 w:"Automation benefits: speed, consistency, scaling, reduced reaction time. Considerations: complexity, cost, single point of failure, technical debt, ongoing supportability."},
{id:"a070",obj:"1.1",d:1,cat:"controls",t:"mc",dg:"controls",
 q:"After a vehicle drove into the lobby of a hospital's emergency department, facilities installed a row of steel posts across the entrance that physically stop any vehicle from reaching the doors. Which of the following BEST classifies this control?",
 o:[
  {t:"Physical, preventive",ok:true,x:"Bollards are a physical control, and because they physically stop the vehicle rather than merely discouraging it, they are preventive."},
  {t:"Physical, deterrent",ok:false,x:"A deterrent, such as a warning sign, discourages an attempt. Bollards stop the vehicle whether or not the driver is deterred."},
  {t:"Technical, preventive",ok:false,x:"Technical controls are implemented in hardware or software systems; steel posts contain no technology."},
  {t:"Operational, corrective",ok:false,x:"Operational controls are processes performed by people, and corrective controls fix damage after an event; bollards are a permanent physical barrier that prevents the event."}
 ],
 w:"Ask two questions of every control: what category implements it (technical, managerial, operational, physical) and what it does (prevent, deter, detect, correct, compensate, direct)."},
{id:"a071",obj:"5.4",d:5,cat:"gov",t:"mc",
 q:"A software company receives a request from a customer under a privacy law to disclose every place the customer's personal data is stored and how long it is kept. The privacy officer discovers that no one can answer the question with confidence. Which of the following should the company create FIRST?",
 o:[
  {t:"A data inventory with retention periods",ok:true,x:"You cannot honor data-subject requests, apply retention rules, or scope protections until you know what personal data exists, where it lives, and how long it is kept."},
  {t:"A right-to-be-forgotten procedure",ok:false,x:"Deletion procedures depend on knowing where the data is; without an inventory the procedure cannot be executed completely."},
  {t:"A data processing agreement with each customer",ok:false,x:"Agreements set obligations but do not tell the company where its data actually resides."},
  {t:"An encryption standard for personal data",ok:false,x:"Encryption is a protection method that still requires knowing which systems hold the data; it does not answer the customer's question."}
 ],
 w:"Privacy foundations: data inventory and retention first, then controller/processor roles, data-subject rights (access, deletion), and legal considerations by jurisdiction."},
{id:"a072",obj:"3.2",d:3,cat:"netsec",t:"mc",
 q:"A software company wants its perimeter device to identify which application is in use regardless of port, apply rules by user identity from the directory, and inspect decrypted outbound TLS for malware. Which of the following firewall types is required?",
 o:[
  {t:"Next-generation firewall",ok:true,x:"An NGFW adds application awareness, user-identity integration, TLS inspection, and integrated IPS to traditional stateful filtering, covering every listed requirement."},
  {t:"Layer 4 stateful firewall",ok:false,x:"A layer 4 firewall makes decisions on IP addresses, ports, and connection state only; it cannot recognize applications on non-standard ports or map rules to users."},
  {t:"Web application firewall",ok:false,x:"A WAF protects inbound HTTP traffic to the company's own web apps from attacks like SQLi and XSS; it is not a general egress firewall with user-based policy."},
  {t:"Packet-filtering router ACLs",ok:false,x:"Router ACLs are stateless and see only headers, offering none of the application, identity, or TLS inspection capabilities."}
 ],
 w:"L4 = ports and state. NGFW = application, user, and content awareness plus IPS. WAF = HTTP-specific protection for your web apps. UTM = all-in-one bundle for smaller sites."},
{id:"a073",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"A school district allows student-owned laptops on the classroom wireless network but wants to ensure that only devices with current antivirus and operating system patches can reach the learning platform, while non-compliant devices are sent to a remediation page. Which of the following should be implemented?",
 o:[
  {t:"Network access control with posture assessment",ok:true,x:"NAC checks each connecting device's health (patches, antivirus, configuration) and places it on the production or remediation network accordingly."},
  {t:"A web application firewall in front of the learning platform",ok:false,x:"A WAF inspects HTTP requests for attacks; it cannot determine whether the connecting laptop is patched."},
  {t:"MAC address filtering on the access points",ok:false,x:"MAC filtering only checks an easily spoofed hardware address; it knows nothing about the device's patch or antivirus status."},
  {t:"Endpoint detection and response agents on district servers",ok:false,x:"EDR on servers monitors those servers; it does not evaluate student devices before granting network access."}
 ],
 w:"NAC = admission control based on identity and device posture, with quarantine or remediation VLANs for failures. Often paired with 802.1X for authentication."},
{id:"a074",obj:"2.3",d:2,cat:"attacks",t:"mc",
 q:"During a review of a hospital's Linux reporting server, an administrator finds the file below, which is run by a nightly cron job. A junior analyst asks what an attacker could do with it. Which of the following is the MOST accurate answer?",
 ex:"$ ls -l /opt/reports/rotate.sh\n-rwsrwxrwx 1 root root 1184 Mar  3 02:10 /opt/reports/rotate.sh\n$ id\nuid=1007(labtech) gid=1007(labtech)",
 o:[
  {t:"Edit the script to gain a root shell; this is a privilege escalation vulnerability",ok:true,x:"The file is world-writable and has the setuid bit (rws) as root. Any local user can append commands that will run with root privileges, a textbook local privilege escalation."},
  {t:"Read the report data; this is an information disclosure issue only",ok:false,x:"The danger is not reading the script but writing to it: the write bit for others combined with setuid root allows execution as root."},
  {t:"Nothing, because only root can run setuid files",ok:false,x:"Setuid means the file runs as its owner (root) no matter who executes it, which is exactly why world-writable setuid files are dangerous."},
  {t:"Crash the cron daemon; this is a denial-of-service issue",ok:false,x:"An attacker with the ability to run code as root has far more than a DoS; escalation to full control is the primary impact."}
 ],
 w:"World-writable plus setuid root = local privilege escalation. Audit with find / -perm -4000, strip unnecessary setuid bits, and never leave root-executed scripts writable."},
{id:"a075",obj:"5.4",d:5,cat:"gov",t:"mc",
 q:"A regional hospital failed to meet a regulator's data-protection requirements. In addition to a fine, the regulator suspended the hospital's authorization to operate its outpatient imaging program until corrective actions are verified. Which of the following consequences of non-compliance does the suspension represent?",
 o:[
  {t:"Loss of license",ok:true,x:"Suspending the authorization to provide a regulated service is a loss (or suspension) of license, one of the most severe compliance consequences."},
  {t:"Reputational damage",ok:false,x:"Reputational harm may follow, but the suspension is a formal regulatory action, not a change in public perception."},
  {t:"Contractual impact",ok:false,x:"Contractual impacts arise from private agreements with customers or vendors; this penalty comes from a government regulator."},
  {t:"Sanctions against an individual",ok:false,x:"Sanctions target specific people or entities with restrictions; here the hospital program's operating authorization was withdrawn."}
 ],
 w:"Non-compliance consequences: fines, sanctions, reputational damage, loss of license, contractual impacts. Regulators can stop you from operating, not just fine you."},
{id:"a076",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"A software company wants to find insecure coding patterns such as hard-coded credentials and unsanitized input in its source code every time a developer opens a pull request, before the application is built or run. Which of the following should be added to the pipeline?",
 o:[
  {t:"Static application security testing",ok:true,x:"SAST analyzes source code without executing it, so it can run on every pull request and catch insecure patterns before compilation."},
  {t:"Dynamic application security testing",ok:false,x:"DAST probes a running application; it requires a deployed build and cannot run at the pull-request stage before compilation."},
  {t:"Code signing",ok:false,x:"Code signing proves who produced a build and that it was not altered; it does not examine code for vulnerabilities."},
  {t:"Sandboxing the application",ok:false,x:"A sandbox contains the effects of untrusted code at runtime; it does not review source for flaws."}
 ],
 w:"SAST = source code, no execution, early in the SDLC. DAST = running app, later. Package monitoring covers dependencies. Code signing = integrity and origin of the build."},
{id:"a077",obj:"1.1",d:1,cat:"controls",t:"mc",
 q:"A hospital deploys an inline intrusion prevention system that drops packets matching known exploit signatures before they reach the electronic health record servers. Which of the following BEST classifies this control?",
 o:[
  {t:"Technical, preventive",ok:true,x:"An IPS is a technology-based control, and by dropping malicious traffic inline it stops the attack from succeeding, making it preventive."},
  {t:"Technical, detective",ok:false,x:"A detective control only identifies and reports; that describes an IDS on a mirror port. This device blocks, so it is preventive."},
  {t:"Operational, preventive",ok:false,x:"Operational controls are procedures carried out by people. The IPS acts automatically without human action."},
  {t:"Physical, deterrent",ok:false,x:"Physical controls protect facilities and hardware; the IPS operates on network traffic and does not discourage anyone through visibility."}
 ],
 w:"IDS = technical detective (monitor and alert). IPS = technical preventive (block inline). The same technology family can land in different type columns depending on what it does."},
{id:"a078",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"Two days before a school district's bond vote, a network of new social media accounts spreads fabricated screenshots claiming the district's superintendent was arrested and that schools will close. The posts are coordinated, false, and intended to influence the vote. Which of the following BEST describes this activity?",
 o:[
  {t:"Disinformation campaign",ok:true,x:"Deliberately fabricated content spread in a coordinated way to manipulate an outcome is disinformation; the intent to deceive is what distinguishes it."},
  {t:"Misinformation",ok:false,x:"Misinformation is false content shared by people who believe it is true. These accounts were created to spread a known fabrication on purpose."},
  {t:"Brand impersonation",ok:false,x:"Brand impersonation copies a trusted organization's identity to run a scam; these posts do not pose as the district, they attack it."},
  {t:"Pretexting",ok:false,x:"Pretexting is a fabricated story used in direct interaction to extract information or action from a target, not a public influence operation."}
 ],
 w:"Disinformation = intentional falsehood. Misinformation = unintentional spread of falsehood. Both are social engineering vectors that influence people rather than systems."},
{id:"a079",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"A hospital help desk resets passwords for callers who provide only their employee ID, which is printed on every badge. An attacker who photographed a badge in the cafeteria used this to take over a physician's account. Which of the following should the hospital strengthen FIRST?",
 o:[
  {t:"Identity proofing before credential changes",ok:true,x:"The failure was verifying who the caller was. Requiring proof beyond a visible identifier, such as a callback to a registered number, a manager confirmation, or an MFA challenge, closes the gap."},
  {t:"Password complexity requirements",ok:false,x:"The attacker never guessed a password; the help desk simply set a new one. Complexity rules do not address the reset process."},
  {t:"Account lockout thresholds",ok:false,x:"Lockout defends against repeated wrong guesses. A single successful reset call involves no failed attempts."},
  {t:"Badge printing standards",ok:false,x:"Hiding the employee ID on badges helps, but any public identifier will leak; the proofing process must not rely on a single visible fact."}
 ],
 w:"Identity proofing = confirming a person is who they claim before issuing or resetting credentials. Help desk resets are a prime social-engineering target; require strong verification."},
{id:"a080",obj:"3.3",d:3,cat:"data",t:"mc",
 q:"A hospital's data classification policy assigns handling rules to each data type. A new analytics project will use patient diagnosis records, the hospital's unpublished pricing negotiation strategy, and the public visiting-hours schedule. Which of the following correctly identifies the data types in that order?",
 o:[
  {t:"Regulated, trade secret, public",ok:true,x:"Diagnosis records are protected health information governed by law; internal negotiation strategy is proprietary competitive information; visiting hours are already public."},
  {t:"Trade secret, regulated, public",ok:false,x:"The order is swapped: diagnosis records are regulated by health privacy law, and the pricing strategy is the trade secret."},
  {t:"Regulated, financial, restricted",ok:false,x:"Negotiation strategy is a trade secret rather than a financial record, and visiting hours are public, not restricted."},
  {t:"Legal, intellectual property, private",ok:false,x:"Patient records are regulated health data, not legal documents, and a public schedule is not private."}
 ],
 w:"Data types: regulated (PHI, PII, payment), trade secret, intellectual property, legal, financial. Classifications: public, private/internal, sensitive, confidential, restricted, critical."},
{id:"a081",obj:"5.2",d:5,cat:"gov",t:"mc",
 q:"A software company's risk team reviews the risk register once a year before budgeting, and also re-assesses after any major architecture change. It now wants risk scores updated automatically as vulnerability scans, asset changes, and threat feeds arrive. Which of the following BEST describes the assessment approach being added?",
 o:[
  {t:"Continuous risk assessment",ok:true,x:"Feeding live telemetry into risk scoring so they update without waiting for a scheduled review is continuous assessment."},
  {t:"Recurring risk assessment",ok:false,x:"Recurring assessments happen on a fixed schedule, which is the annual review the company already does."},
  {t:"Ad hoc risk assessment",ok:false,x:"Ad hoc assessments are triggered by a specific event, like the architecture-change reviews already in place."},
  {t:"One-time risk assessment",ok:false,x:"A one-time assessment is performed once for a project or decision and not repeated; the goal here is constant updating."}
 ],
 w:"Assessment cadence: one-time (a project), ad hoc (a trigger), recurring (a schedule), continuous (automated, always current)."},
{id:"a082",obj:"2.5",d:2,cat:"vulns",t:"ms",pick:2,
 q:"A school district learns that its HVAC vendor's remote-support account was compromised and used to reach a district file server, because the vendor's VPN account had access to the entire internal network. Which TWO of the following mitigations would MOST directly address the weakness that was exploited?",
 o:[
  {t:"Segment vendor VPN access so the account can reach only the HVAC controllers",ok:true,x:"The exploited weakness was flat network access. Restricting the vendor's tunnel to the specific building-systems segment removes the path to unrelated servers."},
  {t:"Apply least privilege to the vendor account and require MFA on it",ok:true,x:"A support account should have only the rights its job needs, and MFA would have stopped the stolen credential from being used at all."},
  {t:"Install antivirus on the HVAC controllers",ok:false,x:"Embedded controllers cannot typically run antivirus, and the attacker's path was through the VPN account, not malware on the controllers."},
  {t:"Increase the password length requirement for district students",ok:false,x:"Student passwords played no role in a compromise that used a vendor's credential."},
  {t:"Move the file server to a cloud provider",ok:false,x:"Relocating the server does not fix over-broad vendor access; the vendor account could still reach whatever it is permitted to."},
  {t:"Disable logging on the VPN concentrator to reduce noise",ok:false,x:"Removing logs would blind the district to the next intrusion; monitoring should be increased, not reduced."}
 ],
 w:"Third-party remote access is a supply chain vector. Mitigate with segmentation, least privilege, MFA, time-bound access, and monitoring of vendor sessions."},
{id:"a083",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"A school district publishes the DMARC record below but still receives complaints that forged messages from its domain reach parents. Which of the following BEST explains why and what to change?",
 ex:"_dmarc.district.example  IN TXT  \"v=DMARC1; p=none; rua=mailto:dmarc-reports@district.example\"",
 o:[
  {t:"p=none only requests reports; move to p=quarantine and then p=reject once legitimate senders are verified",ok:true,x:"A none policy tells receivers to take no action on failures, so forgeries are delivered. After reviewing aggregate reports to confirm all real senders pass, tighten to quarantine and then reject."},
  {t:"The rua tag is sending reports to the attacker",ok:false,x:"rua directs aggregate reports to the district's own mailbox; it has no effect on delivery of forged mail."},
  {t:"DMARC requires an SPF record with -all before it can function",ok:false,x:"DMARC works with SPF or DKIM alignment; a soft-fail SPF is fine. The delivery problem is the enforcement policy set to none."},
  {t:"The record must be published at district.example rather than the _dmarc subdomain",ok:false,x:"_dmarc.<domain> is the correct location for a DMARC record; the placement is right."}
 ],
 w:"DMARC rollout: p=none (monitor via rua reports) -> p=quarantine -> p=reject. A none policy provides visibility but zero protection against spoofing."},
{id:"a084",obj:"3.4",d:3,cat:"data",t:"ms",pick:2,
 q:"A hospital is selecting a disaster recovery site for its clinical systems, which have a 15-minute recovery time objective. Which TWO of the following statements are correct?",
 o:[
  {t:"A hot site with continuous data replication is required to meet a 15-minute RTO",ok:true,x:"Only a hot site, already running with near-real-time data, can resume service within minutes. Warm and cold sites need hours to days."},
  {t:"The site should be geographically dispersed so that a regional disaster does not affect both locations",ok:true,x:"Placing the recovery site far enough away that the same flood, storm, or power grid failure cannot hit both is the purpose of geographic dispersion."},
  {t:"A cold site is sufficient because it is the least expensive option",ok:false,x:"A cold site is an empty facility needing equipment and data before use; recovery takes days, far beyond 15 minutes."},
  {t:"A warm site with nightly backups meets the objective",ok:false,x:"A warm site has hardware but needs data restored and services started, which takes hours; nightly backups would also violate a tight RPO."},
  {t:"The two sites should be on the same power grid to simplify maintenance",ok:false,x:"Sharing a grid means one regional outage takes down both sites, defeating the dispersion goal."},
  {t:"Replication can be replaced by weekly tape rotation to the DR site",ok:false,x:"Weekly tapes leave up to a week of data loss and a lengthy restore, incompatible with a minutes-level recovery objective."}
 ],
 w:"Hot (minutes, most expensive) > warm (hours) > cold (days, cheapest). Geographic dispersion and platform diversity keep one event from taking out both sites."},
{id:"a085",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"Before signing with a new payroll SaaS vendor, a software company reviews the vendor's financial stability, checks references, examines its independent security assessment, and confirms it has no undisclosed relationships with the company's procurement staff. Which of the following BEST describes this activity?",
 o:[
  {t:"Vendor due diligence",ok:true,x:"Investigating a vendor's stability, security posture, and potential conflicts of interest before entering an agreement is the due diligence step of vendor selection."},
  {t:"Vendor monitoring",ok:false,x:"Monitoring is the ongoing review of a vendor after the contract is signed, such as tracking SLA performance and re-assessing periodically."},
  {t:"Right-to-audit clause",ok:false,x:"A right-to-audit clause is a contract term granting future inspection rights; the company is doing pre-contract research, not exercising a clause."},
  {t:"Rules of engagement",ok:false,x:"Rules of engagement define the scope and limits of a penetration test, not the evaluation of a prospective vendor."}
 ],
 w:"Vendor selection = due diligence (research before signing, including conflict-of-interest checks). Vendor monitoring = ongoing oversight after signing. Due care = acting on what you learned."}
];
