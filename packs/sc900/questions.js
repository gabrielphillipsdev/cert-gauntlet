/* Cert Gauntlet — SC-900 practice bank. 50 original items, mc/ms only. Skills measured as of Oct 21, 2026. */
export const SC900_QUESTIONS = [
{id:"s001",d:3,obj:"3.1.1",cat:"aznet",t:"mc",
 q:"Fabrikam hosts a single public-facing web application in Azure that uses one public IP address. The company wants DDoS mitigation tuned to its traffic, with attack telemetry, but does not want to purchase a protection plan that covers entire virtual networks. Which Azure service tier should Fabrikam use?",
 o:[
  {t:"Azure DDoS IP Protection",ok:true,x:"IP Protection is billed per protected public IP and needs no plan, while still giving adaptive tuning, metrics and alerting."},
  {t:"Azure DDoS Network Protection",ok:false,x:"Network Protection is purchased as a plan that covers all protected resources in enrolled virtual networks, which is more than Fabrikam wants."},
  {t:"Azure DDoS infrastructure protection",ok:false,x:"The free baseline is always on but offers no customer-specific tuning, telemetry or alerting."},
  {t:"Azure Web Application Firewall",ok:false,x:"WAF protects against HTTP-layer attacks such as injection; it is not a volumetric DDoS mitigation service."}
 ],
 w:"DDoS Network Protection is a per-VNet plan; DDoS IP Protection is per public IP with no plan. Both mitigate L3/L4 floods; WAF handles L7."},
{id:"s002",d:2,obj:"2.1.2",cat:"entra",t:"mc",
 q:"An Azure virtual machine at Northwind runs an application that must read a connection string from Azure Key Vault. The security team requires that no credential be stored in the application's configuration and that Azure rotates the identity's credentials automatically. Which type of identity should the application use?",
 o:[
  {t:"A managed identity",ok:true,x:"A managed identity is a service principal whose credentials Azure creates and rotates; the VM authenticates to Key Vault without storing anything."},
  {t:"A user account with a long password",ok:false,x:"A user account is a human identity and would require a stored password, violating the requirement."},
  {t:"A guest user from a partner tenant",ok:false,x:"B2B guests are external human identities for collaboration, not workload identities for an Azure resource."},
  {t:"A device identity for the virtual machine",ok:false,x:"A device identity supports device-based Conditional Access; it does not give an application a way to call Key Vault."}
 ],
 w:"Workload identities in Entra: applications, service principals and managed identities. 'No stored credentials' plus 'Azure resource' points to a managed identity."},
{id:"s003",d:1,obj:"1.1.1",cat:"concepts",t:"mc",
 q:"Tailspin Toys moves its email from an on-premises Exchange server to Microsoft 365, a SaaS offering. Select the answer that correctly completes the sentence. After the move, Tailspin Toys remains responsible for ______.",
 o:[
  {t:"its data, user accounts and the devices that connect to the service",ok:true,x:"Data, identities, endpoints and access decisions always stay with the customer regardless of the service model."},
  {t:"patching the operating system of the servers that host the mailboxes",ok:false,x:"In SaaS the provider owns the operating system, runtime and application layers."},
  {t:"the physical security of the datacenter",ok:false,x:"Physical hosts, network and datacenter are the provider's responsibility in every cloud model."},
  {t:"nothing, because the provider assumes all security obligations in SaaS",ok:false,x:"Moving to the cloud never removes the customer's responsibility for data, identities and endpoints."}
 ],
 w:"Shared responsibility: the customer always keeps data, identities, endpoints and access management; the provider always keeps the physical layers."},
{id:"s004",d:3,obj:"3.1.5",cat:"aznet",t:"mc",
 q:"You review the inbound security rules of a network security group associated with a subnet at Woodgrove Bank, shown in the exhibit. A user on the internet at 203.0.113.25 attempts an RDP connection to a VM in the subnet. What happens to the connection?",
 ex:"Priority  Name              Source           Dest  Port   Protocol  Action\n100       Deny-RDP-Internet Internet         Any   3389   TCP       Deny\n200       Allow-RDP-Mgmt    10.10.5.0/24     Any   3389   TCP       Allow\n300       Allow-HTTPS       Any              Any   443    TCP       Allow\n65000     AllowVNetInBound  VirtualNetwork   VNet  Any    Any       Allow\n65001     AllowAzureLBIn    AzureLoadBalancer Any  Any    Any       Allow\n65500     DenyAllInbound    Any              Any   Any    Any       Deny",
 o:[
  {t:"It is denied by the rule at priority 100",ok:true,x:"Rules are evaluated lowest priority number first and processing stops at the first match. Internet-sourced RDP matches priority 100, which denies it."},
  {t:"It is allowed by the rule at priority 200",ok:false,x:"Priority 200 is never reached for this packet because priority 100 already matched, and the source is not 10.10.5.0/24 anyway."},
  {t:"It is allowed by the default AllowVNetInBound rule",ok:false,x:"The source is the internet, not the VirtualNetwork service tag, and default rules are only reached if no custom rule matches."},
  {t:"It is denied by the default DenyAllInbound rule",ok:false,x:"The packet never falls through to 65500 because a custom rule at priority 100 matched it first."}
 ],
 w:"NSG evaluation: ascending priority, first match wins, custom rules 100–4096 run before defaults at 65000+."},
{id:"s005",d:4,obj:"4.1.1",cat:"purview",t:"mc",
 q:"An auditor asks Litware to provide the independent SOC 2 audit report that covers Microsoft 365. Which Microsoft resource should a Litware compliance officer use to download the report?",
 o:[
  {t:"The Service Trust Portal",ok:true,x:"The Service Trust Portal publishes Microsoft's audit reports, certifications and compliance documents, including SOC and ISO reports, after NDA acceptance."},
  {t:"Microsoft Purview Compliance Manager",ok:false,x:"Compliance Manager assesses Litware's own compliance posture; it does not host Microsoft's third-party audit reports."},
  {t:"The Microsoft Defender portal",ok:false,x:"The Defender portal is for security operations such as incidents and hunting."},
  {t:"The Microsoft Entra admin center",ok:false,x:"The Entra admin center manages identities and access, not compliance documentation."}
 ],
 w:"Service Trust Portal = evidence about Microsoft's compliance. Compliance Manager = tracking your own compliance."},
{id:"s006",d:2,obj:"2.1.3",cat:"entra",t:"mc",
 q:"Northwind synchronizes its on-premises Active Directory to Microsoft Entra ID. Company policy states that user passwords, including hashed forms, must never be stored in the cloud, and the company does not want to deploy AD FS. Which sign-in method should Northwind configure in Microsoft Entra Connect?",
 o:[
  {t:"Pass-through authentication",ok:true,x:"PTA validates each sign-in against on-premises AD DS through a lightweight agent, so no password hash is stored in Entra ID and no federation servers are needed."},
  {t:"Password hash synchronization",ok:false,x:"PHS stores a hash of the password hash in Entra ID, which the policy forbids."},
  {t:"Federation with AD FS",ok:false,x:"Federation would satisfy the password requirement but requires the AD FS infrastructure the company wants to avoid."},
  {t:"Microsoft Entra Cloud Sync with password writeback",ok:false,x:"Cloud Sync is a synchronization tool, not a sign-in method, and password writeback concerns SSPR."}
 ],
 w:"PHS: cloud validates a synced hash. PTA: on-premises agent validates live. Federation: AD FS or another IdP issues the token."},
{id:"s007",d:3,obj:"3.1.2",cat:"aznet",t:"mc",
 q:"Fabrikam plans to deploy Azure Firewall in a hub virtual network. A requirement states that outbound HTTPS traffic from the spokes must be decrypted and inspected for malware signatures before leaving the environment. Which Azure Firewall SKU meets the requirement?",
 o:[
  {t:"Premium",ok:true,x:"Only the Premium SKU offers TLS inspection and a signature-based intrusion detection and prevention system."},
  {t:"Standard",ok:false,x:"Standard filters at layers 3 to 7 and uses threat intelligence, but it cannot terminate and inspect TLS sessions."},
  {t:"Basic",ok:false,x:"Basic is a limited-throughput SKU for small businesses with threat intelligence in alert mode only."},
  {t:"Azure Firewall Manager",ok:false,x:"Firewall Manager is a central management service for policies, not a firewall SKU."}
 ],
 w:"Azure Firewall Premium = TLS inspection, IDPS, URL filtering, web categories. Standard = L3–L7 filtering plus threat intel. Basic = SMB."},
{id:"s008",d:2,obj:"2.3.1",cat:"entra",t:"ms",pick:3,
 q:"You review the Conditional Access policy summary shown in the exhibit for the Woodgrove tenant. Which three statements about the policy are true? Each correct answer presents a complete solution.",
 ex:"Policy name:   CA02 - Protect Finance apps\nState:         On\nUsers:         Include group 'Finance Staff'; exclude 'Break-glass admins'\nTarget:        Cloud apps: Dynamics 365, SharePoint Online\nConditions:    Locations: Any location, excluding 'HQ-Trusted'\n               Device platforms: Any\nGrant:         Require multifactor authentication\n               Require device to be marked as compliant\n               (Require one of the selected controls)",
 o:[
  {t:"A Finance Staff member connecting from the HQ-Trusted named location is not subject to the policy",ok:true,x:"Excluding a location from the condition means sign-ins from it skip the policy entirely."},
  {t:"A Finance Staff member connecting from home on a compliant device can access Dynamics 365 without MFA",ok:true,x:"The grant is 'require one of the selected controls', so a compliant device alone satisfies it."},
  {t:"Members of the Break-glass admins group are never evaluated by this policy",ok:true,x:"Excluded users are removed from the policy's scope regardless of other conditions."},
  {t:"The policy blocks all access from outside HQ-Trusted",ok:false,x:"The policy grants access with controls; it contains no Block decision."},
  {t:"The policy applies to every application in the tenant",ok:false,x:"Only Dynamics 365 and SharePoint Online are targeted."},
  {t:"The policy requires Microsoft Entra ID P2 because it uses device compliance",ok:false,x:"Device compliance is a P1 grant control; P2 is needed only for risk-based conditions."}
 ],
 w:"Read a Conditional Access policy as if-then: scope (users, apps, conditions) then grant controls, noting whether ALL or ONE of the controls is required."},
{id:"s009",d:4,obj:"4.2.3",cat:"purview",t:"mc",
 q:"In Microsoft Purview Compliance Manager, Litware compares two improvement actions. Action A enforces a centrally managed password policy that users cannot bypass. Action B asks users to lock their screens when away from their desks. Both are preventative. Which statement about their contribution to the compliance score is correct?",
 o:[
  {t:"Action A is worth 27 points and Action B is worth 9 points",ok:true,x:"A preventative mandatory action scores 27; a preventative discretionary action, which relies on user behavior, scores 9."},
  {t:"Both actions are worth 27 points because both are preventative",ok:false,x:"Point values combine the preventative/detective/corrective type with whether the action is mandatory or discretionary."},
  {t:"Action A is worth 9 points and Action B is worth 27 points",ok:false,x:"This reverses the weighting; the mandatory, non-bypassable control carries the higher value."},
  {t:"Both actions are worth 1 point because they are managed by the customer",ok:false,x:"One point is the value of detective or corrective discretionary actions, not preventative ones, and ownership does not set the value."}
 ],
 w:"Compliance score weights: preventative mandatory 27, preventative discretionary 9, detective/corrective mandatory 3, detective/corrective discretionary 1."},
{id:"s010",d:3,obj:"3.2.2",cat:"dfc",t:"ms",pick:2,
 q:"Tailspin Toys enables Microsoft Defender for Cloud on an Azure subscription but has not purchased any Defender plans. Which two capabilities are available at no additional cost? Each correct answer presents a complete solution.",
 o:[
  {t:"Secure score based on Microsoft cloud security benchmark recommendations",ok:true,x:"Secure score and MCSB recommendations are part of Foundational CSPM, which is free."},
  {t:"Asset inventory of the subscription's resources",ok:true,x:"Inventory is included in the free foundational tier."},
  {t:"Attack path analysis across the cloud security graph",ok:false,x:"Attack path analysis requires the paid Defender CSPM plan."},
  {t:"Agentless vulnerability scanning of virtual machines",ok:false,x:"Agentless scanning needs Defender CSPM or Defender for Servers Plan 2."},
  {t:"Malware scanning of uploaded blobs in storage accounts",ok:false,x:"Malware scanning is a Defender for Storage workload protection feature."}
 ],
 w:"Foundational CSPM (free): inventory, secure score, MCSB recommendations. Defender CSPM (paid): attack paths, cloud security explorer, agentless scanning, data-aware posture."},
{id:"s011",d:1,obj:"1.1.3",cat:"concepts",t:"mc",
 q:"Select the answer that correctly completes the sentence. The Zero Trust guiding principle that leads an organization to segment its network, encrypt data end to end and monitor for lateral movement, because an attacker may already be inside, is ______.",
 o:[
  {t:"assume breach",ok:true,x:"Assume breach designs controls to limit the blast radius and detect intruders who have already gotten past the perimeter."},
  {t:"verify explicitly",ok:false,x:"Verify explicitly concerns authenticating and authorizing every request on all available signals."},
  {t:"use least privilege access",ok:false,x:"Least privilege limits what each identity can do, with just-in-time and just-enough access."},
  {t:"defense in depth",ok:false,x:"Defense in depth is a layered-control strategy, not one of the three Zero Trust principles."}
 ],
 w:"Zero Trust principles: verify explicitly, use least privilege access, assume breach. Segmentation and monitoring map to assume breach."},
{id:"s012",d:2,obj:"2.2.1",cat:"entra",t:"mc",
 q:"Northwind hires a new employee who will use a FIDO2 security key as their only sign-in method. On the first day the employee has no password and has not yet registered the key. Which Microsoft Entra feature allows the employee to sign in once and register the security key?",
 o:[
  {t:"Temporary Access Pass",ok:true,x:"A TAP is a time-limited, admin-issued passcode that satisfies strong authentication so the user can enroll passwordless methods."},
  {t:"Self-service password reset",ok:false,x:"SSPR resets an existing password; the employee has none and needs a passwordless bootstrap."},
  {t:"Smart lockout",ok:false,x:"Smart lockout defends against password guessing; it does not help a user register methods."},
  {t:"Security defaults",ok:false,x:"Security defaults enforce MFA registration tenant-wide but do not provide a credential for a user with no methods."}
 ],
 w:"Temporary Access Pass bootstraps passwordless onboarding and recovers users who lost their device. Lifecycle workflows can issue one automatically."},
{id:"s013",d:3,obj:"3.1.6",cat:"aznet",t:"mc",
 q:"Woodgrove administrators need RDP access to Azure virtual machines in a virtual network. A security requirement states that the VMs must not have public IP addresses and that ports 3389 and 22 must not be reachable from the internet. Which Azure service should Woodgrove deploy?",
 o:[
  {t:"Azure Bastion",ok:true,x:"Bastion brokers RDP and SSH sessions over TLS on port 443 using the VMs' private IP addresses, so the VMs expose nothing to the internet."},
  {t:"Azure VPN Gateway with a public IP on each VM",ok:false,x:"Adding public IPs to the VMs directly contradicts the requirement."},
  {t:"Azure Application Gateway",ok:false,x:"Application Gateway load-balances HTTP traffic; it does not provide RDP or SSH sessions."},
  {t:"Azure DDoS Network Protection",ok:false,x:"DDoS Protection mitigates floods against public endpoints; it does not provide remote administration."}
 ],
 w:"Azure Bastion: managed jump host in the AzureBastionSubnet, RDP/SSH over 443 from the portal or native client, no public IP on VMs."},
{id:"s014",d:4,obj:"4.3.6",cat:"purview",t:"mc",
 q:"A document in a Litware SharePoint site is subject to the two retention settings shown in the exhibit. Based on the principles of retention, what happens to the document?",
 ex:"Setting                         Type              Action                      Period\nAll-Sites-Baseline              Retention policy  Retain, then delete         7 years\nContracts (applied by user)     Retention label   Delete only                 3 years",
 o:[
  {t:"It is retained for 7 years and then deleted",ok:true,x:"Retention wins over deletion, so the label's 3-year delete cannot remove the item while the policy retains it; the item is kept the full 7 years and then deleted."},
  {t:"It is deleted after 3 years because the label is explicit",ok:false,x:"Explicit-over-implicit only decides among competing settings of the same kind; retention always beats deletion first."},
  {t:"It is retained for 10 years, the sum of both periods",ok:false,x:"Retention periods are compared, not added; the longest retention wins."},
  {t:"It is deleted after 3 years and the policy no longer applies",ok:false,x:"The retention policy continues to apply to the site and keeps the item in place."}
 ],
 w:"Principles of retention: 1) retention wins over deletion, 2) longest retention wins, 3) explicit wins over implicit, 4) shortest deletion wins. Stop at the first rule that decides."},
{id:"s015",d:3,obj:"3.4.2",cat:"xdr",t:"mc",
 q:"Fabrikam receives phishing emails that pass initial scanning because the links point to harmless pages at delivery time and are redirected to credential-harvesting sites hours later. Which Microsoft Defender for Office 365 feature protects users when they click the links?",
 o:[
  {t:"Safe Links",ok:true,x:"Safe Links rewrites URLs and checks the destination at click time, so a link weaponized after delivery is still blocked."},
  {t:"Safe Attachments",ok:false,x:"Safe Attachments detonates file attachments in a sandbox before delivery; it does not evaluate URLs."},
  {t:"Attack simulation training",ok:false,x:"Attack simulation training educates users with simulated phishing; it does not block real malicious links."},
  {t:"Zero-hour auto purge",ok:false,x:"ZAP removes messages already delivered when they are later found malicious, but it does not inspect links at click time."}
 ],
 w:"Safe Links = click-time URL verification. Safe Attachments = sandbox detonation before delivery. Both are Defender for Office 365 Plan 1 features."},
{id:"s016",d:2,obj:"2.3.1",cat:"entra",t:"mc",
 q:"Tailspin Toys requires multifactor authentication for all users except when they sign in from the corporate office network, whose public IP range is 198.51.100.0/24. You need to configure Microsoft Entra ID to support the requirement. What should you do first?",
 o:[
  {t:"Create a named location for 198.51.100.0/24 and mark it as trusted",ok:true,x:"A trusted named location can then be excluded from the Conditional Access MFA policy so office sign-ins skip the prompt."},
  {t:"Enable security defaults for the tenant",ok:false,x:"Security defaults enforce MFA for everyone with no location exceptions."},
  {t:"Add 198.51.100.0/24 to the custom banned password list",ok:false,x:"The banned password list blocks weak passwords; it has nothing to do with network locations."},
  {t:"Create a user risk policy in Microsoft Entra ID Protection",ok:false,x:"User risk policies respond to compromised accounts, not to network location."}
 ],
 w:"Named locations (IP ranges or countries) are Conditional Access conditions; marking one trusted also improves ID Protection risk scoring."},
{id:"s017",d:3,obj:"3.1.7",cat:"aznet",t:"mc",
 q:"Northwind developers currently embed a database password in application source code. The security team wants the password stored in a managed Azure service, retrieved at runtime, with every retrieval logged. Which Azure service should Northwind use?",
 o:[
  {t:"Azure Key Vault",ok:true,x:"Key Vault stores secrets such as passwords and connection strings, controls access with Entra ID and RBAC, and logs every operation."},
  {t:"Azure Bastion",ok:false,x:"Bastion provides remote sessions to VMs; it does not store secrets."},
  {t:"Microsoft Entra ID Protection",ok:false,x:"ID Protection detects risky sign-ins; it is not a secret store."},
  {t:"Azure Firewall",ok:false,x:"Azure Firewall filters network traffic; it does not manage application secrets."}
 ],
 w:"Key Vault holds keys, secrets and certificates. Pair it with a managed identity so applications need no stored credentials at all."},
{id:"s018",d:4,obj:"4.3.1",cat:"purview",t:"mc",
 q:"Woodgrove Bank wants Microsoft Purview to automatically identify employment contracts stored across SharePoint, regardless of the template or wording used, so a sensitivity label can be applied. The documents contain no fixed identifier such as an account number. Which classification capability should Woodgrove use?",
 o:[
  {t:"A trainable classifier",ok:true,x:"Trainable classifiers use machine learning on sample documents to recognize a category of content that has no predictable pattern."},
  {t:"A built-in sensitive information type",ok:false,x:"Sensitive information types match patterns such as card or ID numbers; contracts have no such pattern."},
  {t:"Exact data match",ok:false,x:"EDM matches specific values from a reference table, which contracts do not contain."},
  {t:"A retention label",ok:false,x:"A retention label governs how long content is kept; it does not identify content categories by itself."}
 ],
 w:"SIT = pattern (regex, keywords, checksum). Trainable classifier = ML category (contracts, résumés, source code). EDM = lookup of exact values."},
{id:"s019",d:2,obj:"2.3.2",cat:"entra",t:"mc",
 q:"Litware wants its help desk to reset passwords for non-administrator users in Microsoft Entra ID. The help desk must not be able to manage Azure virtual machines or modify administrative accounts. Which role should Litware assign?",
 o:[
  {t:"The Helpdesk Administrator Microsoft Entra role",ok:true,x:"Helpdesk Administrator is a narrow Entra role that resets passwords for non-admins and follows least privilege."},
  {t:"The Global Administrator Microsoft Entra role",ok:false,x:"Global Administrator grants far more than needed and violates least privilege."},
  {t:"The Contributor Azure RBAC role on the subscription",ok:false,x:"Azure RBAC roles manage Azure resources such as VMs; they do not control Entra user passwords."},
  {t:"The Owner Azure RBAC role on the resource group",ok:false,x:"Owner is an Azure resource role and would grant VM management, which must be prevented."}
 ],
 w:"Entra roles govern directory objects and Microsoft 365; Azure RBAC governs Azure resources. Pick the least-privileged role that covers the task."},
{id:"s020",d:3,obj:"3.2.3",cat:"dfc",t:"mc",
 q:"In Microsoft Defender for Cloud, the Enable MFA security control at Tailspin Toys shows 10 maximum points. The control has three recommendations; two are fully remediated and one still reports unhealthy resources. Select the answer that correctly completes the sentence. The control currently contributes ______ to secure score.",
 o:[
  {t:"a partial score based on the proportion of healthy resources",ok:true,x:"A control's current score equals its max points multiplied by the share of resources that are healthy, so remaining unhealthy resources reduce it."},
  {t:"the full 10 points because most recommendations are complete",ok:false,x:"Full points require every recommendation in the control to be remediated for all resources."},
  {t:"zero points until the preview recommendations are also addressed",ok:false,x:"Preview recommendations are excluded from secure score entirely."},
  {t:"10 points plus a bonus for each remediated recommendation",ok:false,x:"Secure score never exceeds a control's maximum; there is no bonus."}
 ],
 w:"Secure score: per control, max points × healthy/total resources; all recommendations in a control must be fixed to earn its full points. Recalculates about every 8 hours."},
{id:"s021",d:1,obj:"1.1.4",cat:"concepts",t:"mc",
 q:"A Fabrikam developer stores user passwords by running each one through SHA-256 and keeping only the output. A reviewer notes that two users with the same password have identical stored values and that precomputed tables could reveal common passwords. Which change addresses the reviewer's concern?",
 o:[
  {t:"Add a unique random salt to each password before hashing",ok:true,x:"Salting makes identical passwords produce different hashes and renders precomputed rainbow tables useless."},
  {t:"Encrypt the passwords with a symmetric key instead of hashing them",ok:false,x:"Reversible encryption is weaker for password storage because anyone with the key can recover every password."},
  {t:"Hash the passwords twice with the same algorithm",ok:false,x:"Double hashing is still deterministic; identical passwords remain identical and tables can be precomputed."},
  {t:"Store the passwords with asymmetric encryption using the public key",ok:false,x:"Passwords should not be recoverable at all; hashing with a salt, not encryption, is the correct design."}
 ],
 w:"Hashing is one-way and deterministic; a per-user salt defeats rainbow tables. Encryption is reversible and is for confidentiality, not password storage."},
{id:"s022",d:4,obj:"4.3.3",cat:"purview",t:"mc",
 q:"Northwind must ensure that a spreadsheet labeled Highly Confidential can be opened only by members of the Finance group, even after the file is emailed to an external address. Which sensitivity label setting enforces the requirement?",
 o:[
  {t:"Encryption with permissions assigned to the Finance group",ok:true,x:"Label encryption binds usage rights to the file so only the specified users can open it, wherever it travels."},
  {t:"A watermark reading Highly Confidential",ok:false,x:"Content marking is visual only and does not prevent anyone from opening the file."},
  {t:"A default label in the label policy",ok:false,x:"A default label applies classification automatically but does not restrict who can open the content."},
  {t:"Mandatory labeling in the label policy",ok:false,x:"Mandatory labeling forces users to choose a label; it does not control access."}
 ],
 w:"Sensitivity labels can encrypt (access control that travels with the file), mark (headers, footers, watermarks) and protect containers. Only encryption restricts who can open content."},
{id:"s023",d:3,obj:"3.3.1",cat:"dfc",t:"mc",
 q:"Select the answer that correctly completes the sentence. A security solution that automatically opens a ticket, enriches an incident with threat intelligence and disables a compromised user account without analyst intervention is performing ______.",
 o:[
  {t:"security orchestration, automation and response (SOAR)",ok:true,x:"SOAR automates and coordinates response actions across tools once a threat is detected."},
  {t:"security information and event management (SIEM)",ok:false,x:"SIEM collects, correlates and analyzes log data to detect threats; acting on them is the SOAR function."},
  {t:"cloud security posture management (CSPM)",ok:false,x:"CSPM assesses configuration against standards; it does not respond to incidents."},
  {t:"endpoint detection and response (EDR)",ok:false,x:"EDR records and analyzes endpoint behavior; the described cross-tool automation is SOAR."}
 ],
 w:"SIEM = collect, correlate, detect, investigate. SOAR = automate and orchestrate response. Microsoft Sentinel does both."},
{id:"s024",d:2,obj:"2.2.2",cat:"entra",t:"mc",
 q:"Litware uses Microsoft Entra ID Free. The company wants to require multifactor authentication for all users and block legacy authentication protocols with the least administrative effort and no additional licenses. What should Litware enable?",
 o:[
  {t:"Security defaults",ok:true,x:"Security defaults are free, tenant-wide settings that require MFA registration for all users and block legacy authentication."},
  {t:"A Conditional Access policy",ok:false,x:"Conditional Access provides granular control but requires Microsoft Entra ID P1."},
  {t:"Microsoft Entra ID Protection sign-in risk policy",ok:false,x:"Risk-based policies require Entra ID P2."},
  {t:"Privileged Identity Management",ok:false,x:"PIM manages just-in-time role activation, not tenant-wide MFA, and requires P2."}
 ],
 w:"Security defaults: free, all-or-nothing MFA plus legacy auth block. Conditional Access: granular, needs P1. Risk-based: needs P2."},
{id:"s025",d:3,obj:"3.4.5",cat:"xdr",t:"mc",
 q:"Woodgrove Bank runs on-premises Active Directory Domain Services. The security team wants to detect pass-the-ticket attacks and view lateral movement paths toward domain administrator accounts by analyzing domain controller traffic. Which Microsoft service should Woodgrove deploy?",
 o:[
  {t:"Microsoft Defender for Identity",ok:true,x:"Defender for Identity installs sensors on domain controllers to detect on-premises identity attacks and map lateral movement paths."},
  {t:"Microsoft Entra ID Protection",ok:false,x:"ID Protection scores cloud sign-ins and accounts in Entra ID; it does not analyze Kerberos traffic on domain controllers."},
  {t:"Microsoft Defender for Cloud Apps",ok:false,x:"Defender for Cloud Apps is a CASB for SaaS applications."},
  {t:"Microsoft Defender Vulnerability Management",ok:false,x:"Vulnerability Management finds software weaknesses on devices; it does not detect identity attacks."}
 ],
 w:"Defender for Identity = on-premises AD attacks via DC sensors. Entra ID Protection = cloud sign-in and user risk. Hybrid orgs run both."},
{id:"s026",d:4,obj:"4.4.2",cat:"risk",t:"ms",pick:2,
 q:"Fabrikam's legal team is comparing Microsoft Purview eDiscovery (Standard) and eDiscovery (Premium). Which two capabilities are available only in eDiscovery (Premium)? Each correct answer presents a complete solution.",
 o:[
  {t:"Review sets with near-duplicate detection and email threading",ok:true,x:"Review sets and their analytics are Premium-only features."},
  {t:"Identifying custodians and sending legal hold notifications",ok:true,x:"Custodian management and hold notifications are part of the Premium workflow."},
  {t:"Placing a hold on a custodian's mailbox and OneDrive",ok:false,x:"Holds on content locations are available in Standard."},
  {t:"Exporting search results to a local computer",ok:false,x:"Export is a Standard capability."},
  {t:"Creating a case to organize searches",ok:false,x:"Case management is included in Standard."}
 ],
 w:"Standard: cases, holds, search, export. Premium adds custodians, review sets, analytics, predictive coding, OCR, advanced indexing."},
{id:"s027",d:2,obj:"2.2.1",cat:"entra",t:"mc",
 q:"Tailspin Toys wants administrators to use an authentication method that Microsoft classifies as phishing-resistant and that works on shared workstations the administrators move between. Which method should Tailspin Toys choose?",
 o:[
  {t:"FIDO2 security keys",ok:true,x:"FIDO2 keys use origin-bound public-key cryptography, are phishing-resistant, and travel with the user between devices."},
  {t:"SMS verification codes",ok:false,x:"SMS is rated medium security and is vulnerable to SIM swapping and interception."},
  {t:"Microsoft Authenticator push notifications",ok:false,x:"Push approval is strong but not classified as phishing-resistant."},
  {t:"Windows Hello for Business",ok:false,x:"Hello is phishing-resistant but its credential is bound to one device, which does not suit roaming between shared workstations."}
 ],
 w:"Phishing-resistant: FIDO2/passkeys, Windows Hello for Business, certificate-based auth. FIDO2 keys are portable; Hello is device-bound."},
{id:"s028",d:3,obj:"3.1.3",cat:"aznet",t:"mc",
 q:"Northwind publishes a web application globally through Azure Front Door. The company wants to block SQL injection and cross-site scripting attempts at the edge using Microsoft-managed rules, while logging matches before enforcing blocks during an initial tuning period. Which Microsoft service should Northwind use?",
 o:[
  {t:"Azure Web Application Firewall on Azure Front Door in Detection mode, then Prevention mode",ok:true,x:"WAF applies managed rule sets for OWASP-style attacks; Detection mode logs without blocking and Prevention mode blocks."},
  {t:"Azure Firewall Standard with network rules",ok:false,x:"Azure Firewall network rules filter by IP, port and protocol and cannot inspect HTTP request bodies for injection."},
  {t:"A network security group on the backend subnet",ok:false,x:"NSGs are layer 3/4 packet filters with no awareness of HTTP payloads."},
  {t:"Azure DDoS Network Protection",ok:false,x:"DDoS Protection mitigates volumetric floods, not application-layer attacks."}
 ],
 w:"WAF on Front Door or Application Gateway: managed OWASP/DRS rules, Detection (log) vs Prevention (block) modes, custom rules run first."},
{id:"s029",d:1,obj:"1.2.3",cat:"concepts",t:"ms",pick:2,
 q:"A Litware user signs in to Microsoft 365 successfully but receives an access denied message when opening a SharePoint document library. Which two statements are true? Each correct answer presents a complete solution.",
 o:[
  {t:"Authentication succeeded for the user",ok:true,x:"A successful sign-in means the identity was verified."},
  {t:"Authorization failed for the document library",ok:true,x:"Access denied after sign-in is an authorization decision about permissions on the resource."},
  {t:"The user's multifactor authentication must have failed",ok:false,x:"MFA is part of authentication, which completed successfully."},
  {t:"The user's identity could not be verified",ok:false,x:"Identity verification is authentication, and it succeeded."},
  {t:"The identity provider rejected the user's credentials",ok:false,x:"Rejected credentials would have prevented sign-in altogether."}
 ],
 w:"Authentication proves who you are; authorization decides what you may access. A successful sign-in followed by a denial is an authorization outcome."},
{id:"s030",d:2,obj:"2.4.1",cat:"entragov",t:"mc",
 q:"Woodgrove Bank wants project contractors to request a bundle consisting of a security group, a SaaS application and a SharePoint site. The request must be approved by the project manager and the access must expire automatically after 60 days. Which Microsoft Entra feature should Woodgrove use?",
 o:[
  {t:"Entitlement management access packages",ok:true,x:"An access package bundles resources with a policy that defines requesters, approvers and expiration."},
  {t:"Privileged Identity Management",ok:false,x:"PIM manages time-bound activation of privileged roles, not bundles of application and site access."},
  {t:"Dynamic group membership rules",ok:false,x:"Dynamic groups add users by attribute without approval or expiry and cover only group membership."},
  {t:"Conditional Access terms of use",ok:false,x:"Terms of use require acceptance of a statement; they do not grant or expire resource access."}
 ],
 w:"Entitlement management: access packages in catalogs, policies for who can request, approval stages, expiration and connected organizations."},
{id:"s031",d:4,obj:"4.3.4",cat:"purview",t:"mc",
 q:"Fabrikam needs to prevent users from copying files that contain credit card numbers to USB removable drives on their Windows laptops, while still allowing them to email the files internally. Which Microsoft Purview capability should Fabrikam configure?",
 o:[
  {t:"A data loss prevention policy with the Devices location",ok:true,x:"Endpoint DLP enforces policies on onboarded devices and can block copying sensitive files to removable media."},
  {t:"A retention label applied to the files",ok:false,x:"Retention labels control how long content is kept; they do not restrict device activities."},
  {t:"An insider risk management policy",ok:false,x:"Insider risk management detects and investigates risky activity; it does not block the USB copy itself."},
  {t:"A Conditional Access policy requiring a compliant device",ok:false,x:"Conditional Access controls sign-in to apps, not file operations on the local device."}
 ],
 w:"Endpoint DLP extends DLP policies to Windows and macOS devices: audit, warn or block USB copy, print, upload and clipboard activities."},
{id:"s032",d:3,obj:"3.2.3",cat:"dfc",t:"mc",
 q:"Tailspin Toys must report on how well its Azure subscriptions align with PCI DSS requirements and download a summary for auditors. Which Microsoft Defender for Cloud feature should the company use?",
 o:[
  {t:"The regulatory compliance dashboard",ok:true,x:"The dashboard shows passed and failed controls per assigned standard such as PCI DSS and exports compliance reports."},
  {t:"Secure score",ok:false,x:"Secure score summarizes posture against the Microsoft cloud security benchmark, not a specific regulation."},
  {t:"Microsoft Purview Compliance Manager",ok:false,x:"Compliance Manager assesses Microsoft 365 and related services, not Azure resource configuration."},
  {t:"The cloud security explorer",ok:false,x:"Cloud security explorer runs graph queries to find risks; it does not report regulatory compliance."}
 ],
 w:"Defender for Cloud regulatory compliance dashboard: MCSB by default; add PCI DSS, NIST, ISO 27001, CIS with Defender CSPM or a workload plan."},
{id:"s033",d:2,obj:"2.4.3",cat:"entragov",t:"ms",pick:3,
 q:"Which three statements about Microsoft Entra Privileged Identity Management are true? Each correct answer presents a complete solution.",
 o:[
  {t:"An eligible assignment requires the user to activate the role before its permissions apply",ok:true,x:"Eligible assignments are the basis of just-in-time access."},
  {t:"Role activation can require multifactor authentication, justification and approval",ok:true,x:"These are per-role activation settings in PIM."},
  {t:"PIM can manage Azure resource roles and group membership, not only Microsoft Entra roles",ok:true,x:"PIM supports Entra roles, Azure RBAC roles and PIM for Groups."},
  {t:"PIM is included with Microsoft Entra ID P1",ok:false,x:"PIM requires Microsoft Entra ID P2 or ID Governance."},
  {t:"An active assignment can never have an end date",ok:false,x:"Both eligible and active assignments can be permanent or time-bound."},
  {t:"PIM replaces the need for access reviews of privileged roles",ok:false,x:"PIM can schedule access reviews of role members; it does not remove the need for them."}
 ],
 w:"PIM: just-in-time, time-bound, approval, MFA, justification, notifications, audit history, access reviews; Entra roles, Azure roles, groups; P2 license."},
{id:"s034",d:3,obj:"3.4.4",cat:"xdr",t:"mc",
 q:"Northwind suspects employees are using unapproved cloud storage services. The security team wants to analyze firewall logs to discover which cloud apps are in use, see a risk score for each, and mark unapproved apps as unsanctioned. Which Microsoft service provides this capability?",
 o:[
  {t:"Microsoft Defender for Cloud Apps Cloud Discovery",ok:true,x:"Cloud Discovery ingests traffic logs, matches them to the cloud app catalog with risk scores, and lets admins sanction or unsanction apps."},
  {t:"Microsoft Defender for Cloud",ok:false,x:"Defender for Cloud secures Azure, AWS and GCP workloads; it does not discover SaaS usage from firewall logs."},
  {t:"Microsoft Defender for Endpoint",ok:false,x:"Defender for Endpoint can supply device network data and enforce blocks, but discovery and risk scoring are Defender for Cloud Apps functions."},
  {t:"Microsoft Entra ID Protection",ok:false,x:"ID Protection detects risky sign-ins and users; it does not catalog cloud apps."}
 ],
 w:"Defender for Cloud Apps: CASB with Cloud Discovery (shadow IT), app catalog risk scores, information protection, threat protection and SSPM."},
{id:"s035",d:4,obj:"4.4.1",cat:"risk",t:"mc",
 q:"Litware wants to be alerted when employees who have submitted a resignation begin downloading unusually large volumes of files from SharePoint before their departure date. The solution must keep user identities pseudonymized during initial triage. Which Microsoft Purview solution should Litware use?",
 o:[
  {t:"Insider risk management with the data theft by departing users policy template",ok:true,x:"This template uses an HR connector trigger and download indicators, and insider risk management pseudonymizes users by default."},
  {t:"Data loss prevention",ok:false,x:"DLP acts on sensitive content in individual actions; it does not score behavior around a resignation event."},
  {t:"eDiscovery (Premium)",ok:false,x:"eDiscovery collects and reviews content for legal matters; it does not detect risky behavior."},
  {t:"Audit (Premium)",ok:false,x:"Audit records events but does not correlate them into risk scores or alerts."}
 ],
 w:"Insider risk management: templates (departing users, data leaks, security violations), triggering events, indicators, pseudonymization, cases."},
{id:"s036",d:2,obj:"2.4.2",cat:"entragov",t:"mc",
 q:"Woodgrove Bank has a security group that grants access to a financial reporting application. Every quarter, the group's owner must confirm that each member still needs access, and anyone the owner does not approve must be removed automatically. Which Microsoft Entra feature should Woodgrove configure?",
 o:[
  {t:"A recurring access review with auto-apply results",ok:true,x:"Access reviews let the group owner recertify members on a schedule and apply the results automatically."},
  {t:"A Conditional Access policy",ok:false,x:"Conditional Access controls sign-in conditions; it does not recertify membership."},
  {t:"A lifecycle workflow",ok:false,x:"Lifecycle workflows automate joiner, mover and leaver tasks on attribute-based triggers, not periodic recertification."},
  {t:"Microsoft Entra ID Protection",ok:false,x:"ID Protection manages identity risk, not membership attestation."}
 ],
 w:"Access reviews: groups, apps, Entra roles, Azure roles, access packages; reviewers can be owners, managers, selected users or self; auto-apply removes denied users."},
{id:"s037",d:3,obj:"3.1.5",cat:"aznet",t:"mc",
 q:"Fabrikam's web tier and database tier VMs share a subnet. The network team wants an NSG rule that allows SQL traffic from the web servers to the database servers without listing IP addresses, and that automatically covers new web servers added later. What should the team use in the rule?",
 o:[
  {t:"Application security groups as the source and destination",ok:true,x:"ASGs group NICs by role so rules reference WebServers and DbServers; new VMs added to the ASG inherit the rule."},
  {t:"Service tags for the VirtualNetwork",ok:false,x:"The VirtualNetwork tag covers the entire VNet and cannot distinguish web servers from database servers."},
  {t:"Separate NSGs with duplicate rules on each NIC",ok:false,x:"This requires maintaining IP-specific rules and does not auto-cover new servers."},
  {t:"Azure Firewall DNAT rules",ok:false,x:"DNAT rules publish inbound internet traffic to private IPs; they are unrelated to intra-subnet filtering."}
 ],
 w:"Application security groups let NSG rules describe tiers by role instead of IP lists, reducing maintenance as VMs are added."},
{id:"s038",d:1,obj:"1.1.2",cat:"concepts",t:"mc",
 q:"Northwind applies a network security group to restrict traffic between subnets in an Azure virtual network. In the defense-in-depth model described by Microsoft, which layer does this control belong to?",
 o:[
  {t:"Network",ok:true,x:"The network layer limits communication between resources using segmentation and NSG filtering."},
  {t:"Perimeter",ok:false,x:"The perimeter layer defends the network boundary with DDoS protection and perimeter firewalls."},
  {t:"Compute",ok:false,x:"The compute layer secures VMs and containers through patching, closed ports and monitoring."},
  {t:"Identity and access",ok:false,x:"The identity and access layer covers MFA, RBAC and Conditional Access."}
 ],
 w:"Defense in depth layers: physical, identity and access, perimeter, network, compute, application, data. NSGs are network; DDoS Protection is perimeter."},
{id:"s039",d:3,obj:"3.4.1",cat:"xdr",t:"ms",pick:3,
 q:"Tailspin Toys is mapping requirements to Microsoft Defender XDR services. Which three statements are correct? Each correct answer presents a complete solution.",
 o:[
  {t:"Microsoft Defender for Office 365 protects email and Teams collaboration content",ok:true,x:"Defender for Office 365 covers Exchange Online, Teams, SharePoint and OneDrive content."},
  {t:"Microsoft Defender for Endpoint protects Windows, macOS, Linux and mobile devices",ok:true,x:"Defender for Endpoint covers those platforms plus network devices."},
  {t:"Microsoft Defender XDR correlates alerts from multiple services into a single incident",ok:true,x:"The unified incident queue shows the full attack scope across workloads."},
  {t:"Microsoft Defender for Identity protects SaaS applications from shadow IT",ok:false,x:"Shadow IT discovery is Defender for Cloud Apps; Defender for Identity covers on-premises AD."},
  {t:"Microsoft Defender Vulnerability Management detonates email attachments in a sandbox",ok:false,x:"Sandbox detonation is Safe Attachments in Defender for Office 365."},
  {t:"Microsoft Defender for Cloud Apps installs sensors on domain controllers",ok:false,x:"Domain controller sensors belong to Defender for Identity."}
 ],
 w:"Defender XDR services: Endpoint (devices), Office 365 (email and collaboration), Identity (on-premises AD), Cloud Apps (SaaS), Vulnerability Management (exposure); all unified in the Defender portal."},
{id:"s040",d:4,obj:"4.1.2",cat:"purview",t:"mc",
 q:"A Litware executive asks whether Microsoft can hand over the company's Microsoft 365 data to a government agency on request. Which Microsoft privacy commitment answers the concern?",
 o:[
  {t:"Microsoft defends customer data and does not give governments direct or unfettered access to it",ok:true,x:"Microsoft states it challenges improper requests, redirects requesters to the customer where possible, and provides no back-door access."},
  {t:"Microsoft encrypts data at rest and in transit",ok:false,x:"Encryption is a separate security commitment; it does not describe how legal requests are handled."},
  {t:"Microsoft lets customers choose the region where data is stored",ok:false,x:"Data location is a residency commitment, not the answer to government access."},
  {t:"Microsoft uses customer content to improve advertising relevance",ok:false,x:"Microsoft states that enterprise customer data is not used for advertising."}
 ],
 w:"Microsoft privacy commitments: you control your data, you know where it is located, it is secured at rest and in transit, and Microsoft defends it from improper requests."},
{id:"s041",d:2,obj:"2.4.3",cat:"entragov",t:"mc",
 q:"Woodgrove Bank wants its database administrators to hold the Contributor role on an Azure subscription only when they are performing maintenance, for no more than four hours at a time, and only after approval. Which Microsoft Entra feature should Woodgrove use?",
 o:[
  {t:"Privileged Identity Management with eligible assignments for the Azure role",ok:true,x:"PIM makes users eligible for Azure resource roles and enforces activation duration, MFA and approval."},
  {t:"Access reviews of the Contributor role",ok:false,x:"Access reviews recertify who holds a role; they do not provide time-limited activation."},
  {t:"A Conditional Access policy requiring MFA for Azure management",ok:false,x:"This adds MFA to Azure portal sign-ins but leaves the role permanently assigned."},
  {t:"Microsoft Entra ID Protection user risk policy",ok:false,x:"User risk policies respond to compromised accounts, not to role activation."}
 ],
 w:"PIM covers Azure RBAC roles as well as Entra roles: eligible assignment, max activation duration, approval, MFA, justification, audit."},
{id:"s042",d:3,obj:"3.2.4",cat:"dfc",t:"mc",
 q:"Fabrikam wants management ports on its Azure virtual machines to remain closed by default and to open only for an approved requester's source IP for a limited time. The company is choosing a Microsoft Defender for Cloud plan. Which plan provides the required feature?",
 o:[
  {t:"Microsoft Defender for Servers Plan 2",ok:true,x:"Just-in-time VM access is included in Defender for Servers Plan 2."},
  {t:"Microsoft Defender for Servers Plan 1",ok:false,x:"Plan 1 provides Defender for Endpoint integration for EDR but not just-in-time VM access."},
  {t:"Foundational cloud security posture management",ok:false,x:"The free tier offers recommendations and secure score, not JIT access enforcement."},
  {t:"Microsoft Defender for Key Vault",ok:false,x:"Defender for Key Vault alerts on unusual vault access; it is unrelated to VM ports."}
 ],
 w:"Defender for Servers Plan 2 adds JIT VM access, file integrity monitoring, agentless scanning, premium vulnerability management and a free data ingestion allowance over Plan 1."},
{id:"s043",d:4,obj:"4.2.2",cat:"purview",t:"mc",
 q:"Tailspin Toys must track its own progress toward ISO 27001 compliance for Microsoft 365, assign remediation tasks to employees, store evidence and view a score. Which Microsoft tool should the company use?",
 o:[
  {t:"Microsoft Purview Compliance Manager",ok:true,x:"Compliance Manager creates assessments from regulatory templates, assigns improvement actions, stores evidence and calculates a compliance score."},
  {t:"The Service Trust Portal",ok:false,x:"The Service Trust Portal documents Microsoft's own compliance; it does not track a customer's tasks."},
  {t:"The Microsoft Defender for Cloud regulatory compliance dashboard",ok:false,x:"That dashboard covers Azure, AWS and GCP resource configuration, not Microsoft 365 compliance tasks."},
  {t:"Microsoft Purview Audit",ok:false,x:"Audit records activity; it does not manage compliance assessments."}
 ],
 w:"Compliance Manager: 360+ templates become assessments of Microsoft-managed, customer-managed and shared controls; improvement actions drive the compliance score."},
{id:"s044",d:2,obj:"2.2.3",cat:"entra",t:"mc",
 q:"Northwind discovers that many users set passwords containing the company name or its product names. The company wants Microsoft Entra ID to reject such passwords, including variants that substitute digits for letters, during password changes. What should Northwind configure?",
 o:[
  {t:"A custom banned password list in Microsoft Entra Password Protection",ok:true,x:"The custom list adds organization-specific base terms; normalization and fuzzy matching catch variants automatically."},
  {t:"Smart lockout thresholds",ok:false,x:"Smart lockout limits failed sign-in attempts; it does not evaluate password content."},
  {t:"Self-service password reset with two methods",ok:false,x:"SSPR governs how users reset passwords, not which passwords are acceptable."},
  {t:"A Conditional Access policy requiring password change",ok:false,x:"Forcing a change does not control the content of the new password."}
 ],
 w:"Password Protection: global banned list (always on) plus custom list of up to 1,000 base terms; substitutions and near matches are detected automatically."},
{id:"s045",d:3,obj:"3.3.2",cat:"dfc",t:"mc",
 q:"Woodgrove Bank uses Microsoft Sentinel. When an analytics rule creates a high-severity incident involving a user account, the SOC wants the user account to be disabled in Microsoft Entra ID and a ticket opened in the company's service desk automatically. What should the SOC create?",
 o:[
  {t:"A playbook based on Azure Logic Apps, triggered by an automation rule",ok:true,x:"Playbooks reach external systems such as Entra ID and ticketing tools; an automation rule runs the playbook when the incident is created."},
  {t:"A workbook",ok:false,x:"Workbooks are interactive dashboards for visualization, not response automation."},
  {t:"A hunting query",ok:false,x:"Hunting queries search data proactively; they do not take actions."},
  {t:"A data connector",ok:false,x:"Data connectors ingest logs; they are the collect capability, not respond."}
 ],
 w:"Sentinel respond: automation rules for incident triage and routing; playbooks (Logic Apps) for actions in external systems such as disabling a user or opening a ticket."},
{id:"s046",d:1,obj:"1.1.5",cat:"concepts",t:"mc",
 q:"Select the answer that correctly completes the sentence. The principle that data stored in a datacenter located in a particular country is subject to that country's laws and regulations, regardless of where the data owner is headquartered, is called ______.",
 o:[
  {t:"data sovereignty",ok:true,x:"Data sovereignty ties data to the legal jurisdiction where it is physically collected, held or processed."},
  {t:"data residency",ok:false,x:"Data residency refers to rules about where data may be stored and transferred, rather than which laws govern it."},
  {t:"data privacy",ok:false,x:"Data privacy concerns the appropriate handling of personal information."},
  {t:"data governance",ok:false,x:"Governance is the organization's own system of rules and accountability for managing data."}
 ],
 w:"Residency = where data may be stored. Sovereignty = whose laws apply where it sits. Privacy = handling of personal data."},
{id:"s047",d:4,obj:"4.4.3",cat:"risk",t:"ms",pick:2,
 q:"Which two statements about Microsoft Purview Audit are true? Each correct answer presents a complete solution.",
 o:[
  {t:"Audit (Standard) retains audit records for 180 days by default",ok:true,x:"The Standard default retention is 180 days for records generated since October 2023."},
  {t:"Audit (Premium) can retain audit records for up to 10 years with an add-on license",ok:true,x:"Premium offers one-year default retention and a 10-year retention add-on."},
  {t:"Auditing must be manually enabled before any records are collected",ok:false,x:"Auditing is enabled by default in Microsoft 365."},
  {t:"Audit records can be searched only through PowerShell",ok:false,x:"The Purview portal search, PowerShell, Graph API and the Management Activity API all work."},
  {t:"Audit (Premium) is included in every Microsoft 365 subscription",ok:false,x:"Premium requires E5, A5 or G5 or an add-on license."}
 ],
 w:"Audit Standard: 180 days, on by default, portal and API search. Premium: 1 year default, retention policies, 10-year add-on, intelligent insights, more API bandwidth."},
{id:"s048",d:2,obj:"2.4.4",cat:"entragov",t:"mc",
 q:"Microsoft Entra ID Protection reports that a Fabrikam user's credentials appeared in a published breach list, raising the user's risk level to high. Fabrikam wants the user to remediate the risk automatically without help desk involvement. Which control should the company's risk-based Conditional Access policy require?",
 o:[
  {t:"A secure password change",ok:true,x:"A user risk policy requiring password change with MFA remediates leaked credentials and resets the user's risk."},
  {t:"Multifactor authentication only",ok:false,x:"MFA alone remediates sign-in risk; it does not change the compromised password behind user risk."},
  {t:"A compliant device",ok:false,x:"Device compliance does not address a leaked password."},
  {t:"Acceptance of terms of use",ok:false,x:"Terms of use document consent; they do not remediate account compromise."}
 ],
 w:"User risk (for example leaked credentials) → require password change. Sign-in risk (atypical travel, anonymous IP) → require MFA. Needs Entra ID P2."},
{id:"s049",d:3,obj:"3.4.2",cat:"xdr",t:"mc",
 q:"Litware wants to measure how many employees would click a realistic phishing email and automatically assign training to those who do, without exposing anyone to real malware. Which Microsoft Defender for Office 365 capability should Litware use, and which plan is required?",
 o:[
  {t:"Attack simulation training, available in Plan 2",ok:true,x:"Attack simulation training runs benign simulated phishing campaigns and assigns training; it is a Plan 2 feature."},
  {t:"Safe Links, available in Plan 1",ok:false,x:"Safe Links blocks malicious URLs at click time; it does not run simulations or training."},
  {t:"Anti-phishing policies, available in Exchange Online Protection",ok:false,x:"Anti-phishing policies filter real messages; they do not simulate attacks."},
  {t:"Threat Explorer, available in Plan 1",ok:false,x:"Threat Explorer is a Plan 2 investigation tool, not a simulation feature."}
 ],
 w:"Defender for Office 365 Plan 2 adds attack simulation training, Threat Explorer, automated investigation and response, and campaign views over Plan 1."},
{id:"s050",d:3,obj:"3.4.7",cat:"xdr",t:"mc",
 q:"A news report describes a new ransomware campaign. Woodgrove Bank's SOC wants a Microsoft-authored report on the campaign that shows whether any Woodgrove devices are exposed, which incidents in the tenant relate to it, and which mitigations to apply. Where in the Microsoft Defender portal should the SOC look?",
 o:[
  {t:"Threat analytics",ok:true,x:"Threat analytics reports combine Microsoft researchers' analysis with tenant-specific exposure, related incidents and recommended actions."},
  {t:"Advanced hunting",ok:false,x:"Advanced hunting lets analysts write KQL queries over raw data but does not provide authored campaign reports."},
  {t:"The action center",ok:false,x:"The action center tracks pending and completed remediation actions."},
  {t:"Secure score",ok:false,x:"Secure score measures configuration posture; it does not describe specific threat campaigns."}
 ],
 w:"Threat analytics: Microsoft Threat Intelligence reports with analyst write-up, related incidents, impacted assets, exposure and recommended actions overlaid on your tenant."},
];
