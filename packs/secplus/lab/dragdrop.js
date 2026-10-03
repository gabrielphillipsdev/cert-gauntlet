// PBQ Lab — drag-and-drop items authored for Chat 2 (types "match" and "order"). order items use eq:[[i,j]] to declare
// steps that are interchangeable; the grader accepts every equivalent sequence.
export const LAB_DRAGDROP = [
{id:"m-logsrc",obj:"4.9",d:4,cat:"ops",type:"match",title:"Match the data source to the question it answers",
 prompt:"Drag each investigation question onto the log or data source that answers it best.",
 pairs:[
  ["Firewall logs","Did any internal host connect to the attacker's address, and when?"],
  ["IPS/IDS logs","Which exploit signature was fired against the web server?"],
  ["Endpoint (EDR) logs","Which process spawned the PowerShell that pulled the payload?"],
  ["Application logs","Which user triggered the failed money transfer in the banking app?"],
  ["Vulnerability scan output","Which hosts still have the unpatched CVE the attacker used?"],
  ["Packet captures","What exact data was inside the suspicious outbound session?"],
  ["NetFlow / metadata","Which host sent 40 GB out overnight without capturing payloads?"],
 ],
 why:"Objective 4.9 is about picking the source that answers the question: firewalls see allow/deny by address and port, IDS/IPS see signatures, EDR sees process trees, application logs see business actions, scans see exposure, packet captures see content, NetFlow sees volume without content."},

{id:"o-ransom",obj:"4.8",d:4,cat:"ir",type:"order",title:"Order the response to a confirmed ransomware outbreak",
 prompt:"Analysis has confirmed ransomware spreading from a finance workstation through a compromised account. Drag the response steps into order.",
 steps:[
  "Isolate the infected hosts from the network (EDR quarantine / port shutdown)",
  "Disable the compromised account and revoke its sessions and tokens",
  "Capture volatile evidence (memory image) from an isolated host before powering anything off",
  "Remove the malware and persistence, then patch the entry point",
  "Restore affected systems from known-clean backups and verify integrity",
  "Hold the lessons-learned review and update the playbook",
 ],
 eq:[[0,1]],
 note:"Isolating the hosts and disabling the account are both immediate containment actions; the exam accepts either first.",
 why:"Containment (isolate, disable), then preserve evidence while the host is still up, then eradication, recovery, and lessons learned. Powering off before a memory capture destroys the volatile evidence the investigation needs."},
];
