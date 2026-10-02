# CompTIA Security+ SY0-701 — exam objectives (for item tagging)

Every item in the Sec+ pack carries `obj:"<n.n>"` — the single objective it most directly tests. Domain weights: 1 = 12%, 2 = 22%, 3 = 18%, 4 = 28%, 5 = 20%.

## Domain 1 — General Security Concepts
- 1.1 Compare and contrast various types of security controls (categories: technical, managerial, operational, physical; types: preventive, deterrent, detective, corrective, compensating, directive)
- 1.2 Summarize fundamental security concepts (CIA, non-repudiation, AAA, gap analysis, zero trust control/data plane, physical security, deception and disruption technology)
- 1.3 Explain the importance of change management processes and the impact to security (approval, ownership, stakeholders, impact analysis, test results, backout plan, maintenance window, SOP; allow/deny lists, restricted activities, downtime, restarts, legacy apps, dependencies; documentation, version control)
- 1.4 Explain the importance of using appropriate cryptographic solutions (PKI, encryption levels, symmetric/asymmetric, key exchange, algorithms, key length, TPM/HSM/KMS/secure enclave, obfuscation, hashing, salting, digital signatures, key stretching, blockchain, certificates)

## Domain 2 — Threats, Vulnerabilities, and Mitigations
- 2.1 Compare and contrast common threat actors and motivations
- 2.2 Explain common threat vectors and attack surfaces (message-based, image/file-based, voice, removable device, vulnerable software, unsupported systems, unsecure networks, open ports, default credentials, supply chain, human vectors/social engineering: phishing, vishing, smishing, misinformation, impersonation, BEC, pretexting, watering hole, brand impersonation, typosquatting)
- 2.3 Explain various types of vulnerabilities (application, OS, web-based, hardware, virtualization, cloud, supply chain, cryptographic, misconfiguration, mobile, zero-day)
- 2.4 Given a scenario, analyze indicators of malicious activity (malware types, physical, network, application, cryptographic, password attacks; indicators)
- 2.5 Explain the purpose of mitigation techniques used to secure the enterprise (segmentation, access control, application allow list, isolation, patching, encryption, monitoring, least privilege, configuration enforcement, decommissioning, hardening)

## Domain 3 — Security Architecture
- 3.1 Compare and contrast security implications of different architecture models (cloud, IaC, serverless, microservices, network infrastructure, on-prem, centralized/decentralized, containerization, virtualization, IoT, ICS/SCADA, RTOS, embedded, high availability; considerations)
- 3.2 Given a scenario, apply security principles to secure enterprise infrastructure (device placement, zones, attack surface, failure modes, active/passive, inline/tap, jump server, proxy, IPS/IDS, load balancer, sensors, port security/802.1X/EAP, firewall types, VPN/tunneling/SD-WAN/SASE, selecting controls)
- 3.3 Compare and contrast concepts and strategies to protect data (data types, classifications, states, sovereignty, geolocation, methods: geographic restrictions, encryption, hashing, masking, tokenization, obfuscation, segmentation, permission restrictions)
- 3.4 Explain the importance of resilience and recovery in security architecture (HA, site considerations, platform diversity, multi-cloud, COOP, capacity planning, testing, backups, power)

## Domain 4 — Security Operations
- 4.1 Given a scenario, apply common security techniques to computing resources (baselines, hardening targets, wireless devices, mobile solutions, wireless security, application security, sandboxing, monitoring)
- 4.2 Explain the security implications of proper hardware, software, and data asset management (acquisition, assignment, monitoring/tracking, disposal/decommissioning, sanitization, destruction, certification, retention)
- 4.3 Explain various activities associated with vulnerability management (identification, analysis incl. CVSS/CVE/false positives, response/remediation, validation, reporting)
- 4.4 Explain security alerting and monitoring concepts and tools (log aggregation, alerting, scanning, reporting, archiving, alert response/tuning; SCAP, benchmarks, agents, SIEM, antivirus, DLP, SNMP traps, NetFlow, vulnerability scanners)
- 4.5 Given a scenario, modify enterprise capabilities to enhance security (firewall rules/ACLs/screened subnets, IDS/IPS, web filter, OS security/Group Policy/SELinux, secure protocols and port selection, DNS filtering, email security SPF/DKIM/DMARC/gateway, FIM, DLP, NAC, EDR/XDR, UBA)
- 4.6 Given a scenario, implement and maintain identity and access management (provisioning, permissions, identity proofing, federation, SSO/LDAP/OAuth/SAML, interoperability, attestation, access control models, MFA, password concepts, passwordless, PAM)
- 4.7 Explain the importance of automation and orchestration related to secure operations
- 4.8 Explain appropriate incident response activities (process, training, testing, RCA, threat hunting, digital forensics: legal hold, chain of custody, acquisition, reporting, preservation, e-discovery)
- 4.9 Given a scenario, use data sources to support an investigation (log data, vulnerability scans, automated reports, dashboards, packet captures)

## Domain 5 — Security Program Management and Oversight
- 5.1 Summarize elements of effective security governance (guidelines, policies, standards, procedures, external considerations, monitoring/revision, governance structures, data roles)
- 5.2 Explain elements of the risk management process (identification, assessment, analysis incl. SLE/ALE/ARO, risk register, tolerance, appetite, strategies, reporting, BIA incl. RTO/RPO/MTTR/MTBF)
- 5.3 Explain the processes associated with third-party risk assessment and management (vendor assessment, selection, agreement types SLA/MOA/MOU/MSA/WO/SOW/NDA/BPA, monitoring, questionnaires, rules of engagement)
- 5.4 Summarize elements of effective security compliance (reporting, consequences, monitoring, privacy)
- 5.5 Explain types and purposes of audits and assessments (attestation, internal, external, penetration testing types/environments/reconnaissance)
- 5.6 Given a scenario, implement security awareness practices
