// PBQ Lab — incident console items (type "console"). Graded by end state: bad services stopped (+disabled when
// requireDisable), IoC addresses blocked on every host that talks to them, keep:true services untouched.
// Addresses are RFC 1918 / RFC 5737. All text original.
export const LAB_CONSOLE = [
{id:"c-web-c2",obj:"4.8",d:4,cat:"ir",type:"console",title:"Incident console: beaconing web server and finance workstation",
 prompt:"The SOC has confirmed two hosts talking to a known command-and-control range. You have a shell on each. Contain the incident without taking the business offline.",
 tasks:["Find the malicious service on each host (compare listening ports, process names and remote addresses with the IoC list).","Stop each malicious service AND disable it so it does not come back at boot.","Block the command-and-control addresses on the host that talks to them.","Leave nginx, sshd, the print spooler and Remote Desktop running — the business depends on them."],
 iocs:{ports:[4444,8443],procs:["kworkerd","svchost32.exe"],ips:["198.51.100.23","203.0.113.77"]},
 requireDisable:true,
 hosts:[
  {id:"web01",os:"linux",name:"web01",ip:"10.0.50.10",user:"sysadmin",
   services:[
    {name:"nginx",display:"A high performance web server",proc:"nginx",pid:1203,port:443,proto:"tcp",user:"www-data",cmd:"nginx: master process /usr/sbin/nginx",keep:true},
    {name:"ssh",display:"OpenBSD Secure Shell server",proc:"sshd",pid:812,port:22,proto:"tcp",user:"root",cmd:"sshd: /usr/sbin/sshd -D",keep:true},
    {name:"node_exporter",display:"Prometheus node exporter",proc:"node_exporter",pid:1410,port:9100,proto:"tcp",user:"prometheus",cmd:"/usr/local/bin/node_exporter"},
    {name:"kworkerd",display:"kworkerd",proc:"kworkerd",pid:2231,port:4444,proto:"tcp",bind:"0.0.0.0",user:"root",cmd:"/tmp/.cache/kworkerd -c 198.51.100.23:4444",remote:"198.51.100.23:4444",cpu:"12.4",bad:true},
   ],
   ufw:[["22/tcp","ALLOW IN","10.0.10.0/24"],["443/tcp","ALLOW IN","Anywhere"],["80/tcp","ALLOW IN","Anywhere"]],
   files:{
    "/var/log/auth.log":"Mar 14 02:11:08 web01 sshd[9931]: Accepted publickey for deploy from 10.0.10.25 port 50122 ssh2\nMar 14 02:11:08 web01 systemd-logind[611]: New session 44 of user deploy.\nMar 14 02:14:51 web01 sudo:   deploy : TTY=pts/1 ; PWD=/var/www ; USER=root ; COMMAND=/bin/bash /tmp/.cache/install.sh\nMar 14 02:14:52 web01 systemd[1]: Reloading.\nMar 14 02:14:53 web01 systemd[1]: Started kworkerd.\nMar 14 02:15:10 web01 sshd[9931]: Disconnected from user deploy 10.0.10.25 port 50122",
    "/var/log/syslog":"Mar 14 02:14:53 web01 systemd[1]: Started kworkerd.\nMar 14 02:15:01 web01 kworkerd[2231]: connected to 198.51.100.23:4444\nMar 14 02:20:01 web01 CRON[2290]: (root) CMD (/tmp/.cache/kworkerd -q)\nMar 14 02:25:01 web01 CRON[2301]: (root) CMD (/tmp/.cache/kworkerd -q)\nMar 14 02:30:01 web01 CRON[2314]: (root) CMD (/tmp/.cache/kworkerd -q)",
    "/etc/systemd/system/kworkerd.service":"[Unit]\nDescription=kworkerd\nAfter=network.target\n\n[Service]\nExecStart=/tmp/.cache/kworkerd -c 198.51.100.23:4444\nRestart=always\n\n[Install]\nWantedBy=multi-user.target",
    "/etc/cron.d/kworkerd":"*/5 * * * * root /tmp/.cache/kworkerd -q",
   }},
  {id:"ws-fin07",os:"windows",name:"WS-FIN07",ip:"10.0.10.67",user:"m.alvarez",domain:"CORP",
   services:[
    {name:"Spooler",display:"Print Spooler",proc:"spoolsv.exe",pid:1860,keep:true,mem:11240},
    {name:"TermService",display:"Remote Desktop Services",proc:"svchost.exe",pid:1104,port:3389,proto:"tcp",keep:true,mem:9820},
    {name:"W32Time",display:"Windows Time",proc:"svchost.exe",pid:1388,mem:4210},
    {name:"WinUpdSync",display:"Windows Update Sync Helper",proc:"svchost32.exe",pid:5124,port:8443,proto:"tcp",cmd:"C:\\Users\\Public\\Libraries\\svchost32.exe -s",remote:"203.0.113.77:8443",mem:48900,bad:true},
   ],
   files:{
    "C:\\Users\\Public\\Libraries\\readme.txt":"invoice_Q1.pdf.exe extracted 03/14/2026 01:58",
    "C:\\Temp\\update.log":"03/14/2026 01:58:40 installer: dropped svchost32.exe to C:\\Users\\Public\\Libraries\n03/14/2026 01:58:41 installer: sc create WinUpdSync binPath= \"C:\\Users\\Public\\Libraries\\svchost32.exe -s\" start= auto\n03/14/2026 01:58:42 installer: net start WinUpdSync\n03/14/2026 01:58:45 beacon: 203.0.113.77:8443 ok",
   }},
 ],
 why:"Listening-port and process listings (ss -tulpn / netstat -ano, ps / tasklist) are compared against the IoC list; the odd binary paths (/tmp/.cache, C:\\Users\\Public) confirm it. Stop AND disable so the unit file / auto-start service cannot revive it, block the C2 address on the host firewall, and never touch the services the business needs."},

{id:"c-db-miner",obj:"4.5",d:4,cat:"harden",type:"console",title:"Incident console: cryptominer on the database tier",
 prompt:"Monitoring shows the database host pegged at 100% CPU and the application server talking to the same external address. Clean up both hosts with the least possible disruption.",
 tasks:["Identify the unauthorized process on each host using the IoC list (ports, names, destination address).","Stop the unauthorized service on each host (disabling it too is good practice).","Block the mining pool address on BOTH hosts — each one connects to it.","PostgreSQL, SSH, SQL Server and Remote Desktop must keep running."],
 iocs:{ports:[3333,8081],procs:["sysupdated","wdupd.exe"],ips:["203.0.113.140"]},
 hosts:[
  {id:"db01",os:"linux",name:"db01",ip:"10.0.20.15",user:"dba",
   services:[
    {name:"postgresql",display:"PostgreSQL RDBMS",proc:"postgres",pid:980,port:5432,proto:"tcp",user:"postgres",cmd:"/usr/lib/postgresql/15/bin/postgres -D /var/lib/postgresql/15/main",keep:true,cpu:"3.1",mem:"18.2"},
    {name:"ssh",display:"OpenBSD Secure Shell server",proc:"sshd",pid:801,port:22,proto:"tcp",user:"root",cmd:"sshd: /usr/sbin/sshd -D",keep:true},
    {name:"node_exporter",display:"Prometheus node exporter",proc:"node_exporter",pid:1322,port:9100,proto:"tcp",user:"prometheus",cmd:"/usr/local/bin/node_exporter"},
    {name:"sysupdated",display:"System Update Daemon",proc:"sysupdated",pid:3377,user:"postgres",cmd:"/var/lib/postgresql/.config/sysupdated -o 203.0.113.140:3333 -u 4A7x...k2Q --threads 8",remote:"203.0.113.140:3333",cpu:"397.0",mem:"1.9",bad:true},
   ],
   files:{
    "/var/log/auth.log":"Mar 20 23:40:12 db01 sshd[7710]: Failed password for postgres from 203.0.113.140 port 41110 ssh2\nMar 20 23:40:15 db01 sshd[7710]: Failed password for postgres from 203.0.113.140 port 41110 ssh2\nMar 20 23:40:19 db01 sshd[7712]: Accepted password for postgres from 203.0.113.140 port 41118 ssh2\nMar 20 23:41:02 db01 systemd[1]: Started System Update Daemon.",
    "/var/log/syslog":"Mar 20 23:41:02 db01 systemd[1]: Started System Update Daemon.\nMar 20 23:41:03 db01 sysupdated[3377]: pool 203.0.113.140:3333 connected, 8 threads\nMar 20 23:41:03 db01 kernel: [ 9811.220] CPU0: Core temperature above threshold, cpu clock throttled\nMar 21 00:02:17 db01 postgres[980]: LOG:  checkpoint took 48.2 s (unusually slow)",
    "/etc/systemd/system/sysupdated.service":"[Unit]\nDescription=System Update Daemon\n\n[Service]\nUser=postgres\nExecStart=/var/lib/postgresql/.config/sysupdated -o 203.0.113.140:3333 -u 4A7x...k2Q --threads 8\nRestart=always\n\n[Install]\nWantedBy=multi-user.target",
   }},
  {id:"app02",os:"windows",name:"APP02",ip:"10.0.20.22",user:"administrator",domain:"CORP",
   services:[
    {name:"MSSQLSERVER",display:"SQL Server (MSSQLSERVER)",proc:"sqlservr.exe",pid:2040,port:1433,proto:"tcp",keep:true,mem:1048576},
    {name:"TermService",display:"Remote Desktop Services",proc:"svchost.exe",pid:1096,port:3389,proto:"tcp",keep:true,mem:9920},
    {name:"Spooler",display:"Print Spooler",proc:"spoolsv.exe",pid:1788,mem:10800},
    {name:"WinDefendUpdater",display:"Windows Defender Update Service",proc:"wdupd.exe",pid:6120,port:8081,proto:"tcp",cmd:"C:\\ProgramData\\WinDefend\\wdupd.exe --listen 8081",remote:"203.0.113.140:443",mem:302110,bad:true},
   ],
   files:{
    "C:\\ProgramData\\WinDefend\\config.json":"{ \"pool\": \"203.0.113.140:443\", \"wallet\": \"4A7x...k2Q\", \"api\": \"0.0.0.0:8081\", \"max-cpu\": 90 }",
    "C:\\Temp\\setup.log":"03/20/2026 23:52:10 schtasks /create /tn WinDefendUpdater /tr C:\\ProgramData\\WinDefend\\wdupd.exe /sc onlogon\n03/20/2026 23:52:11 sc create WinDefendUpdater binPath= \"C:\\ProgramData\\WinDefend\\wdupd.exe --listen 8081\" start= auto\n03/20/2026 23:52:14 connected 203.0.113.140:443",
   }},
 ],
 why:"A process named like a system component but running from a home or ProgramData directory, pinning the CPU and holding a connection to port 3333 (a classic mining-pool port) is a miner. Both hosts reach the same pool, so the block has to happen on both. node_exporter and the print spooler look unfamiliar but are legitimate — touching them is collateral damage, which the grader deducts for."},
];
