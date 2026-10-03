/* AZ-900 warm-up bank — 50 questions (mc/ms), skills as of 2026-07-20 */
export const AZ900_QUESTIONS = [
{id:"z001",d:1,obj:"1.1.2",cat:"cloud",t:"mc",
 q:"Fabrikam runs a line-of-business application on an Azure virtual machine that runs Windows Server. A critical operating system security update is released. According to the shared responsibility model, who is responsible for installing the update?",
 o:[
  {t:"Fabrikam",ok:true,x:"A virtual machine is IaaS. The customer owns everything from the guest operating system upward, including OS patching."},
  {t:"Microsoft",ok:false,x:"Microsoft patches the physical hosts and the hypervisor, not the guest operating system inside a customer's VM."},
  {t:"Fabrikam and Microsoft share the task equally",ok:false,x:"Guest OS maintenance is not a shared item in IaaS; it belongs entirely to the customer."},
  {t:"The software vendor of the line-of-business application",ok:false,x:"An application vendor supports its own product and has no role in the operating system beneath it."}
 ],
 w:"IaaS: customer owns the guest OS and everything above it. The provider owns the physical datacenter, network and hosts in every model."},
{id:"z002",d:2,obj:"2.1.2",cat:"arch",t:"mc",
 q:"Northwind plans to deploy a web application to Azure. The application must remain available if a single datacenter in the region fails, and all data must stay within one region. Which Azure feature should Northwind use?",
 o:[
  {t:"Availability zones",ok:true,x:"Zones are physically separate datacenter groups within one region, so deploying across zones survives a datacenter failure while keeping data in the region."},
  {t:"Region pairs",ok:false,x:"A region pair involves a second region, which would move data outside the single region the requirement specifies."},
  {t:"Resource groups",ok:false,x:"A resource group is a logical container for management; it provides no physical redundancy."},
  {t:"Management groups",ok:false,x:"Management groups organize subscriptions for governance and have nothing to do with datacenter resilience."}
 ],
 w:"Datacenter failure inside a region = availability zones. Whole-region failure = a second region (often the paired region)."},
{id:"z003",d:3,obj:"3.1.4",cat:"cost",t:"mc",
 q:"Tailspin applies the tags shown in the exhibit. A user then creates a new virtual machine named VM3 in RG-Finance without specifying any tags. Which tags does VM3 have?",
 ex:"Scope                     Tag\n------------------------  --------------------\nSubscription Sub-Prod     Owner=CloudOps\nResource group RG-Finance Dept=Finance\nVM1 (in RG-Finance)       Env=Prod\nVM2 (in RG-Finance)       Env=Test",
 o:[
  {t:"No tags",ok:true,x:"Tags are not inherited from the resource group or subscription. A resource carries only the tags set directly on it, so VM3 starts with none."},
  {t:"Dept=Finance only",ok:false,x:"The resource group's tag does not flow down to resources created inside it unless an Azure Policy copies it."},
  {t:"Owner=CloudOps and Dept=Finance",ok:false,x:"Neither subscription nor resource group tags are inherited by child resources by default."},
  {t:"Owner=CloudOps, Dept=Finance and Env=Prod",ok:false,x:"Tags on a sibling VM have no effect on a new VM, and parent-scope tags are not inherited."}
 ],
 w:"Use Azure Policy built-ins (Require a tag = Deny, Append a tag = Append, Inherit a tag from the resource group = Modify) to make child resources carry the parent's tag."},
{id:"z004",d:1,obj:"1.1.3",cat:"cloud",t:"ms",pick:2,
 q:"Select the two statements that are true about the public cloud model. Each correct answer presents a complete solution.",
 o:[
  {t:"The cloud provider owns and operates the physical infrastructure",ok:true,x:"In a public cloud a third party such as Microsoft owns the datacenters and hardware."},
  {t:"Services are available to any customer over the internet",ok:true,x:"Public cloud resources are offered to the general public and reached over the internet."},
  {t:"Hardware is dedicated to a single organization",ok:false,x:"Dedicated hardware describes a private cloud; public cloud infrastructure is shared among tenants."},
  {t:"The customer must purchase the servers before deploying workloads",ok:false,x:"Public cloud has no up-front hardware purchase; that is the capital-expenditure model it replaces."},
  {t:"Workloads must be split between on-premises and cloud locations",ok:false,x:"Splitting workloads across locations describes a hybrid cloud, not a public cloud."}
 ],
 w:"Public = provider-owned, shared, internet-delivered, no CapEx. Private = dedicated to one organization. Hybrid = both connected."},
{id:"z005",d:2,obj:"2.1.6",cat:"arch",t:"mc",
 q:"Woodgrove is designing the governance hierarchy shown in the exhibit. The architect wants to add two more levels of management groups beneath MG-Retail-EU before the subscriptions. Will the design work, and why?",
 ex:"Tenant Root Group\n  MG-Corp\n    MG-Retail\n      MG-Retail-EU\n        MG-Retail-EU-Stores\n          MG-Retail-EU-Stores-Online\n            (subscriptions)",
 o:[
  {t:"No, because management groups support a maximum depth of six levels below the root",ok:true,x:"The exhibit already has five levels under the root. Adding two more would make seven, which exceeds the six-level limit (root and subscription levels do not count)."},
  {t:"No, because a management group can contain only one child management group",ok:false,x:"A management group can hold many children; the single-parent rule applies in the other direction."},
  {t:"Yes, because management groups can be nested without limit",ok:false,x:"Nesting is limited to six levels below the root management group."},
  {t:"Yes, because subscriptions can be placed at any depth up to ten levels",ok:false,x:"The depth limit is six, not ten, and it applies to management groups regardless of where subscriptions sit."}
 ],
 w:"Management groups: up to 10,000 per directory, up to six levels deep (excluding root and subscriptions), one parent each."},
{id:"z006",d:3,obj:"3.1.2",cat:"cost",t:"mc",
 q:"Litware is proposing a new solution that will use Azure App Service, Azure SQL Database and Azure Storage. Nothing has been deployed yet. Management wants an estimate of the monthly Azure cost to include in the proposal. Which tool should Litware use?",
 o:[
  {t:"The Azure pricing calculator",ok:true,x:"The pricing calculator builds an estimate from the services, regions, sizes and quantities you choose, without needing any deployed resources."},
  {t:"Cost analysis in Microsoft Cost Management",ok:false,x:"Cost analysis reports on actual spending of existing resources; nothing is deployed yet."},
  {t:"Azure Advisor cost recommendations",ok:false,x:"Advisor recommends savings on resources that already exist and have usage data."},
  {t:"A Cost Management budget",ok:false,x:"A budget tracks real spend against a threshold; it does not estimate the cost of a design."}
 ],
 w:"Pricing calculator = estimate before deployment. Cost Management = analyze, budget and alert on actual spend after deployment."},
{id:"z007",d:1,obj:"1.1.5",cat:"cloud",t:"mc",
 q:"Select the answer that correctly completes the sentence. In a consumption-based pricing model, an organization pays for ______.",
 o:[
  {t:"the resources it actually uses, with no up-front commitment",ok:true,x:"Consumption-based pricing meters usage and bills only for what is consumed, which is the defining feature of the model."},
  {t:"a fixed monthly fee regardless of usage",ok:false,x:"A flat fee independent of usage is the opposite of consumption-based billing."},
  {t:"the physical servers that host its workloads",ok:false,x:"Buying servers is a capital expenditure and belongs to the on-premises model."},
  {t:"the maximum capacity it estimates it will ever need",ok:false,x:"Paying for peak capacity in advance is the traditional datacenter approach the cloud model avoids."}
 ],
 w:"Consumption-based: no up-front cost, no wasted capacity, pay only for what you use, stop paying when you stop using."},
{id:"z008",d:2,obj:"2.1.4",cat:"arch",t:"mc",
 q:"Fabrikam has a resource group named RG1 located in East US. An administrator attempts to create a storage account in West Europe inside RG1. What is the result?",
 o:[
  {t:"The storage account is created in West Europe inside RG1",ok:true,x:"A resource group's location only stores its metadata. Resources inside it can be deployed to any region."},
  {t:"The operation fails because resources must match the resource group's region",ok:false,x:"There is no such restriction; co-locating is recommended but not required."},
  {t:"The storage account is created in East US automatically",ok:false,x:"Azure does not silently change the region you select for a resource."},
  {t:"RG1 is moved to West Europe to match the resource",ok:false,x:"A resource group's region does not change based on the resources placed in it."}
 ],
 w:"Resource group region = where metadata lives. Members can be in any region, cannot be in two groups, and groups cannot be nested."},
{id:"z009",d:3,obj:"3.1.3",cat:"cost",t:"mc",
 q:"Northwind configured the budget shown in the exhibit on subscription Sub-Dev. On the 20th of the month, actual spend reaches 4,100 USD. What happens?",
 ex:"Budget name:   Dev-Monthly\nScope:         Subscription Sub-Dev\nAmount:        5,000 USD / month\nAlert 1:       Actual cost >= 80%  -> email devleads@northwind.example\nAlert 2:       Actual cost >= 100% -> email finance@northwind.example",
 o:[
  {t:"An email is sent to devleads@northwind.example and resources keep running",ok:true,x:"4,100 USD is 82 percent of 5,000, so the 80 percent alert fires. A budget only notifies; it does not stop or delete resources."},
  {t:"All resources in Sub-Dev are stopped until the next month",ok:false,x:"Budgets never shut resources down by themselves; that would require an action group with automation."},
  {t:"An email is sent to finance@northwind.example only",ok:false,x:"The 100 percent condition has not been reached, so the finance alert does not fire."},
  {t:"Nothing happens until spending reaches 5,000 USD",ok:false,x:"The 80 percent threshold is 4,000 USD, which has already been exceeded."}
 ],
 w:"A budget alert notifies at the thresholds you define. It never stops spending on its own; pair it with an action group if you want automation."},
{id:"z010",d:1,obj:"1.2.1",cat:"cloud",t:"mc",
 q:"Tailspin's online store receives ten times its normal traffic during sales events. The company wants Azure to add virtual machines automatically when load rises and remove them when load falls, without an administrator intervening. Which cloud benefit does this describe?",
 o:[
  {t:"Elasticity",ok:true,x:"Elasticity is automatic scaling in both directions in response to demand, which is exactly the scenario."},
  {t:"High availability",ok:false,x:"High availability is about staying reachable despite failures, not about matching capacity to demand."},
  {t:"Predictability",ok:false,x:"Predictability concerns consistent performance and forecastable cost, not automatic resource changes."},
  {t:"Agility",ok:false,x:"Agility refers to deploying and reconfiguring resources quickly, not to automatic scaling based on load."}
 ],
 w:"Scalability = you can add or remove resources. Elasticity = it happens automatically as demand changes. Agility = you can do it fast."},
{id:"z011",d:2,obj:"2.2.2",cat:"compute",t:"mc",
 q:"Woodgrove hosts a stateless web tier on Azure virtual machines. The company needs the number of identical VMs to increase automatically when CPU utilization is high and decrease when it is low. Which Azure service should Woodgrove use?",
 o:[
  {t:"Azure Virtual Machine Scale Sets",ok:true,x:"A scale set manages a group of identical VMs and adds or removes instances automatically based on metrics or a schedule."},
  {t:"An availability set",ok:false,x:"An availability set spreads existing VMs across fault and update domains; it does not change the number of VMs."},
  {t:"Azure Virtual Desktop",ok:false,x:"Azure Virtual Desktop delivers Windows desktops and apps to users; it is not a general web-tier scaling solution."},
  {t:"Azure Container Instances",ok:false,x:"Container Instances runs individual containers without orchestration or VM autoscaling."}
 ],
 w:"Scale sets = identical VMs that scale out and in automatically. Availability sets = spread VMs over fault and update domains, no scaling."},
{id:"z012",d:3,obj:"3.2.3",cat:"govern",t:"mc",
 q:"Litware applies a ReadOnly lock to a resource group that contains a production SQL database and a virtual machine. A user who has the Owner role on the resource group attempts to resize the virtual machine. What is the result?",
 o:[
  {t:"The resize is blocked until the lock is removed",ok:true,x:"A ReadOnly lock prevents modification regardless of RBAC. Even an Owner must remove the lock first."},
  {t:"The resize succeeds because Owner overrides locks",ok:false,x:"Locks are not overridden by role assignments; they apply to all users."},
  {t:"The resize succeeds but the database cannot be deleted",ok:false,x:"ReadOnly blocks updates as well as deletes, so the resize does not proceed."},
  {t:"The virtual machine is deleted and recreated at the new size",ok:false,x:"Deletion is also prevented by the lock, and resizing never deletes a VM."}
 ],
 w:"CanNotDelete: read and modify allowed, delete blocked. ReadOnly: only reads allowed. Locks override RBAC and inherit to child resources."},
{id:"z013",d:2,obj:"2.2.5",cat:"compute",t:"ms",pick:2,
 q:"Fabrikam has three virtual networks: VNet1 and VNet2 in East US and VNet3 in West Europe. VNet1 is peered with VNet2, and VNet2 is peered with VNet3. Select the two statements that are true. Each correct answer presents a complete solution.",
 o:[
  {t:"Resources in VNet1 can communicate with resources in VNet2 over the Microsoft backbone",ok:true,x:"Peered VNets exchange traffic privately on Microsoft's network with no internet or gateway involved."},
  {t:"Resources in VNet1 cannot communicate directly with resources in VNet3",ok:true,x:"Peering is not transitive. VNet1 is not peered with VNet3, so there is no direct path."},
  {t:"VNet2 and VNet3 cannot be peered because they are in different regions",ok:false,x:"Global virtual network peering connects VNets in different regions."},
  {t:"Traffic between VNet1 and VNet2 traverses the public internet",ok:false,x:"Peered traffic stays on the Microsoft backbone and never touches the public internet."},
  {t:"VNet1 and VNet2 must use overlapping address spaces",ok:false,x:"Peered networks must have non-overlapping address spaces, not overlapping ones."}
 ],
 w:"Peering: private backbone path, regional or global, non-overlapping address spaces, and never transitive."},
{id:"z014",d:1,obj:"1.1.4",cat:"cloud",t:"mc",
 q:"Northwind must keep a regulated manufacturing control system in its own datacenter because of a legal requirement, but wants to move its customer-facing website to Azure and allow the two environments to exchange data securely. Which cloud model should Northwind adopt?",
 o:[
  {t:"Hybrid cloud",ok:true,x:"Keeping some workloads on-premises while running others in a public cloud, with connectivity between them, is the definition of hybrid."},
  {t:"Public cloud",ok:false,x:"A public-only approach would move everything to Azure, which the legal requirement prevents."},
  {t:"Private cloud",ok:false,x:"A private cloud alone would keep everything on dedicated infrastructure and would not deliver the public-cloud website."},
  {t:"Multi-cloud",ok:false,x:"Multi-cloud means using two or more public providers; the scenario involves on-premises plus one provider."}
 ],
 w:"Some workloads must stay local + some go to Azure + the two connect = hybrid cloud."},
{id:"z015",d:3,obj:"3.2.2",cat:"govern",t:"mc",
 q:"Tailspin needs to ensure that no one can create virtual machines in any region other than West Europe across every subscription in the company. Which Azure feature should Tailspin use?",
 o:[
  {t:"Azure Policy assigned at the root management group with a Deny effect",ok:true,x:"Policy evaluates resource properties such as location and can deny creation; assigning at the root covers all subscriptions through inheritance."},
  {t:"Azure RBAC with a custom role that excludes other regions",ok:false,x:"RBAC controls which actions a principal may perform, not which property values (like location) a resource may have."},
  {t:"A ReadOnly resource lock on each subscription",ok:false,x:"A lock would block all changes in the subscriptions, not just VMs outside West Europe."},
  {t:"Tags that record the allowed region on each resource group",ok:false,x:"Tags are metadata and enforce nothing by themselves."}
 ],
 w:"Policy = what resources must look like (Deny blocks non-compliant creates). RBAC = who can act. Locks = prevent change or delete for everyone."},
{id:"z016",d:2,obj:"2.2.5",cat:"compute",t:"mc",
 q:"Woodgrove needs to connect its on-premises datacenter to an Azure virtual network. The connection must not traverse the public internet and must provide consistent latency for large daily data transfers. Which Azure service should Woodgrove use?",
 o:[
  {t:"Azure ExpressRoute",ok:true,x:"ExpressRoute is a private dedicated connection through a connectivity partner that bypasses the public internet and offers predictable performance."},
  {t:"Azure VPN Gateway with a site-to-site connection",ok:false,x:"A site-to-site VPN is encrypted but still travels across the public internet."},
  {t:"Global virtual network peering",ok:false,x:"Peering connects two Azure VNets; it does not connect an on-premises network."},
  {t:"A point-to-site VPN",ok:false,x:"Point-to-site connects individual client devices over the internet, not a whole datacenter."}
 ],
 w:"VPN Gateway = encrypted tunnel over the internet. ExpressRoute = private circuit that avoids the internet, with higher reliability and cost."},
{id:"z017",d:1,obj:"1.3.4",cat:"cloud",t:"ms",pick:2,
 q:"Litware is evaluating Azure services. Select the two services that are examples of platform as a service (PaaS). Each correct answer presents a complete solution.",
 o:[
  {t:"Azure App Service",ok:true,x:"App Service provides a managed runtime for web apps; the customer deploys code and data while Azure manages the OS and platform."},
  {t:"Azure SQL Database",ok:true,x:"Azure SQL Database is a managed database platform; Microsoft patches the OS and database engine."},
  {t:"Azure Virtual Machines",ok:false,x:"Virtual machines are IaaS; the customer manages the operating system."},
  {t:"Microsoft 365",ok:false,x:"Microsoft 365 is a complete application delivered as SaaS."},
  {t:"Azure Virtual Network",ok:false,x:"Virtual networking is an infrastructure building block and classified as IaaS."}
 ],
 w:"IaaS = VMs, disks, networks. PaaS = managed platforms you deploy code or data into (App Service, SQL Database). SaaS = finished apps (Microsoft 365)."},
{id:"z018",d:3,obj:"3.2.1",cat:"govern",t:"mc",
 q:"Fabrikam stores data in Azure SQL Database, Azure Blob Storage, an on-premises SQL Server and Microsoft 365. The compliance team needs a single catalog that discovers these sources, classifies sensitive data and shows how data flows between systems. Which Microsoft service should Fabrikam use?",
 o:[
  {t:"Microsoft Purview",ok:true,x:"Purview's Data Map scans multicloud, Microsoft 365 and on-premises sources, applies classifications and records lineage in a unified catalog."},
  {t:"Azure Policy",ok:false,x:"Policy enforces resource configuration standards; it does not catalog or classify the data inside resources."},
  {t:"Microsoft Defender for Cloud",ok:false,x:"Defender for Cloud assesses security posture and detects threats; it is not a data governance catalog."},
  {t:"Azure Monitor",ok:false,x:"Azure Monitor collects telemetry about resource health and performance, not data classification and lineage."}
 ],
 w:"Purview = data governance (catalog, classification, lineage), data security and compliance across Microsoft 365, Azure, other clouds and on-premises."},
{id:"z019",d:2,obj:"2.2.6",cat:"compute",t:"mc",
 q:"Northwind has an Azure Storage account that must be reachable only from virtual machines in a specific virtual network by using a private IP address. The storage account's public endpoint must be disabled. Which feature should Northwind configure?",
 o:[
  {t:"A private endpoint",ok:true,x:"A private endpoint gives the storage account a network interface with a private IP in the VNet through Private Link, so the public endpoint can be turned off."},
  {t:"A public IP address on the storage account",ok:false,x:"A public IP is the opposite of the requirement and storage accounts do not take one directly."},
  {t:"A network security group on the storage account",ok:false,x:"NSGs attach to subnets and NICs, not to PaaS services like storage accounts."},
  {t:"Azure DNS public zone",ok:false,x:"A public DNS zone publishes names on the internet; it does not create a private path to the service."}
 ],
 w:"Public endpoint = reachable via public IP. Private endpoint = private IP in your VNet via Private Link, so the public side can be disabled."},
{id:"z020",d:1,obj:"1.1.5",cat:"cloud",t:"mc",
 q:"Tailspin's finance team wants to stop making large up-front purchases of servers every few years and instead pay for IT capacity as a recurring operating cost. Which change does moving to Azure make possible?",
 o:[
  {t:"Shifting spending from capital expenditure to operational expenditure",ok:true,x:"Cloud consumption is billed as an ongoing operating expense, replacing the capital outlay for hardware."},
  {t:"Shifting spending from operational expenditure to capital expenditure",ok:false,x:"This is backwards; the cloud reduces CapEx, not OpEx."},
  {t:"Eliminating all IT spending",ok:false,x:"Cloud services still cost money; the model of spending changes, not its existence."},
  {t:"Prepaying for three years of hardware depreciation",ok:false,x:"Depreciating owned hardware is the CapEx model the company wants to leave."}
 ],
 w:"CapEx = buy assets up front and depreciate them. OpEx = pay for services as you use them. Cloud moves IT to OpEx."},
{id:"z021",d:3,obj:"3.3.2",cat:"govern",t:"ms",pick:2,
 q:"Select the two statements that are true about Azure Cloud Shell. Each correct answer presents a complete solution.",
 o:[
  {t:"It can be opened from the Azure portal in a web browser",ok:true,x:"Cloud Shell launches from the portal toolbar, shell.azure.com and other entry points without any local installation."},
  {t:"It offers a choice of Bash or PowerShell",ok:true,x:"Users select either shell experience, and both include the Azure CLI and Azure PowerShell."},
  {t:"It requires the Azure CLI to be installed on the local computer",ok:false,x:"Nothing is installed locally; the tools run in a hosted session."},
  {t:"It can run only on Windows devices",ok:false,x:"Cloud Shell is browser-based and works from any operating system."},
  {t:"It cannot persist files between sessions",ok:false,x:"An Azure Files share can be mounted as the home directory so files persist across sessions."}
 ],
 w:"Cloud Shell: browser-based, authenticated, Bash or PowerShell, CLI and PowerShell preinstalled, optional Azure Files share for persistence."},
{id:"z022",d:2,obj:"2.3.2",cat:"storage",t:"mc",
 q:"Woodgrove must retain scanned legal records in Azure Blob Storage for seven years. The records are almost never read, and when one is requested a retrieval delay of several hours is acceptable. The company wants the lowest storage cost. Which access tier should Woodgrove use?",
 o:[
  {t:"Archive",ok:true,x:"Archive is the cheapest tier for data kept at least 180 days and read rarely; it is offline and must be rehydrated, which can take hours."},
  {t:"Hot",ok:false,x:"Hot has the highest storage cost and is meant for frequently accessed data."},
  {t:"Cool",ok:false,x:"Cool is cheaper than hot but still an online tier priced above archive."},
  {t:"Cold",ok:false,x:"Cold is an online tier with instant access; it costs more to store than archive."}
 ],
 w:"Hot > cool > cold > archive in storage cost. Archive is offline: rehydration takes hours (standard up to 15) and the minimum retention is 180 days."},
{id:"z023",d:2,obj:"2.3.3",cat:"storage",t:"mc",
 q:"Litware stores application files in an Azure Storage account. The data must remain readable and writable if one datacenter in the region fails, but the company does not want to pay for replication to a second region. Which redundancy option should Litware choose?",
 o:[
  {t:"Zone-redundant storage (ZRS)",ok:true,x:"ZRS replicates synchronously across availability zones in the primary region, surviving a datacenter outage without a second region."},
  {t:"Locally redundant storage (LRS)",ok:false,x:"LRS keeps all three copies in one datacenter, so a datacenter failure can make the data unavailable."},
  {t:"Geo-redundant storage (GRS)",ok:false,x:"GRS replicates to a second region, which the company wants to avoid paying for."},
  {t:"Read-access geo-zone-redundant storage (RA-GZRS)",ok:false,x:"RA-GZRS adds a second region and read access, which exceeds the requirement and the budget."}
 ],
 w:"LRS = one datacenter. ZRS = zones in one region. GRS/GZRS = add a second region. RA- prefix = secondary is readable."},
{id:"z024",d:1,obj:"1.1.6",cat:"cloud",t:"mc",
 q:"Fabrikam runs a database server on an Azure virtual machine that must operate 24 hours a day for at least the next three years. The company wants to reduce the compute cost of this VM as much as possible without changing its size. What should Fabrikam do?",
 o:[
  {t:"Purchase a three-year reservation for the virtual machine",ok:true,x:"A reservation commits to a VM configuration for one or three years in exchange for a significant discount, ideal for steady 24x7 workloads."},
  {t:"Switch the virtual machine to Spot pricing",ok:false,x:"Spot VMs can be evicted at any time, which is unacceptable for a database that must run continuously."},
  {t:"Move the virtual machine to pay-as-you-go pricing",ok:false,x:"Pay-as-you-go is the baseline list price with no discount."},
  {t:"Deallocate the virtual machine each night",ok:false,x:"The database must run around the clock, so it cannot be stopped nightly."}
 ],
 w:"Steady, long-running workload = reservation or savings plan. Interruptible batch = Spot. Unpredictable or short-lived = pay-as-you-go."},
{id:"z025",d:3,obj:"3.3.3",cat:"govern",t:"mc",
 q:"Northwind has 200 Windows and Linux servers in its own datacenter and 50 virtual machines in Azure. The operations team wants to apply Azure Policy, assign Azure RBAC roles and view all 250 machines in the Azure portal as a single inventory. Which Azure service should Northwind use?",
 o:[
  {t:"Azure Arc",ok:true,x:"Arc projects non-Azure servers into Azure Resource Manager so they can be governed with Policy, RBAC, tags and monitoring alongside native resources."},
  {t:"Azure Migrate",ok:false,x:"Migrate discovers and moves servers to Azure; the scenario wants to manage them where they are."},
  {t:"Azure Virtual Desktop",ok:false,x:"Azure Virtual Desktop delivers desktops to users and has nothing to do with managing on-premises servers."},
  {t:"Azure Site Recovery",ok:false,x:"Site Recovery replicates machines for disaster recovery; it does not provide governance of on-premises servers."}
 ],
 w:"Azure Arc = extend Azure management (Policy, RBAC, Monitor, Defender, Update Manager) to servers, Kubernetes and data services outside Azure."},
{id:"z026",d:2,obj:"2.3.6",cat:"storage",t:"mc",
 q:"Tailspin needs to move 120 TB of archived video footage from a remote site to Azure Blob Storage. The site has a 20 Mbps internet connection that is also used for daily operations. Which option should Tailspin use to transfer the data?",
 o:[
  {t:"Azure Data Box",ok:true,x:"Data Box is a physical appliance shipped to you for offline bulk transfer, suited to tens or hundreds of terabytes over a slow link."},
  {t:"AzCopy over the existing connection",ok:false,x:"At 20 Mbps, 120 TB would take well over a year and saturate the shared connection."},
  {t:"Azure Storage Explorer",ok:false,x:"Storage Explorer is a desktop GUI that still transfers over the network."},
  {t:"Azure File Sync",ok:false,x:"File Sync keeps Windows Server file shares in sync with Azure Files; it is not a bulk one-time import tool and still uses the network."}
 ],
 w:"Huge dataset + slow or unavailable network = ship a Data Box. Scriptable network transfers = AzCopy. Visual management = Storage Explorer."},
{id:"z027",d:3,obj:"3.3.5",cat:"govern",t:"mc",
 q:"Woodgrove wants to deploy an identical set of Azure resources to five regions. The deployment files must describe the desired end state rather than a sequence of commands, must be repeatable, and should be as readable as possible. Which option should Woodgrove use?",
 o:[
  {t:"Bicep files deployed through Azure Resource Manager",ok:true,x:"Bicep is a declarative, idempotent language with concise syntax that compiles to ARM JSON templates."},
  {t:"An Azure CLI script that runs az create commands in order",ok:false,x:"A command sequence is imperative, not a description of the desired state."},
  {t:"Manual deployment through the Azure portal in each region",ok:false,x:"Manual portal work is neither repeatable nor expressed as code."},
  {t:"An Azure PowerShell script that creates each resource",ok:false,x:"PowerShell scripts are imperative step-by-step instructions."}
 ],
 w:"Declarative IaC on Azure = ARM templates (JSON) or Bicep (simpler syntax, same engine). CLI and PowerShell scripts are imperative."},
{id:"z028",d:1,obj:"1.1.7",cat:"cloud",t:"mc",
 q:"Select the answer that correctly completes the sentence. In a serverless computing model, the customer ______.",
 o:[
  {t:"deploys code and is billed only for its execution while the provider manages all servers",ok:true,x:"Serverless abstracts the infrastructure entirely: the platform provisions, scales and bills by execution and resources consumed."},
  {t:"manages the operating system of the servers that run the code",ok:false,x:"OS management belongs to IaaS; serverless hides the servers completely."},
  {t:"pays a fixed monthly fee for a dedicated server",ok:false,x:"Fixed fees for dedicated capacity are the opposite of execution-based serverless billing."},
  {t:"must provision virtual machines before the code can run",ok:false,x:"No VMs are provisioned by the customer; that is what makes it serverless."}
 ],
 w:"Serverless = no servers to manage, automatic scaling (including to zero), billed per execution. Azure Functions and Container Apps are the examples."},
{id:"z029",d:2,obj:"2.4.1",cat:"idsec",t:"mc",
 q:"Litware is moving a legacy application to Azure virtual machines. The application requires LDAP queries, Kerberos authentication and Group Policy, and the company does not want to deploy or manage domain controllers. Which service should Litware use?",
 o:[
  {t:"Microsoft Entra Domain Services",ok:true,x:"Domain Services provides a managed domain with LDAP, Kerberos/NTLM, domain join and Group Policy, synchronized from Entra ID, with no domain controllers to run."},
  {t:"Microsoft Entra ID alone",ok:false,x:"Entra ID speaks web protocols such as SAML and OpenID Connect; it does not provide LDAP, Kerberos or Group Policy."},
  {t:"Microsoft Entra External ID",ok:false,x:"External ID handles guests and customer identities; it is unrelated to legacy domain protocols."},
  {t:"Active Directory Domain Services on Azure virtual machines",ok:false,x:"This would work but requires deploying and managing domain controllers, which the company wants to avoid."}
 ],
 w:"Entra ID = cloud identity for modern apps. Entra Domain Services = managed legacy domain (LDAP, Kerberos, Group Policy) with no DCs to run."},
{id:"z030",d:3,obj:"3.4.1",cat:"monitor",t:"mc",
 q:"An administrator at Fabrikam opens a tool in the Azure portal that lists recommendations such as resizing underutilized virtual machines, enabling backup for a database and adding availability zones to a critical workload. Which tool is the administrator using?",
 o:[
  {t:"Azure Advisor",ok:true,x:"Advisor produces personalized recommendations across cost, reliability, security, performance and operational excellence."},
  {t:"Azure Service Health",ok:false,x:"Service Health reports platform incidents and maintenance, not configuration recommendations."},
  {t:"Azure Monitor metrics explorer",ok:false,x:"Metrics explorer charts telemetry; it does not generate best-practice advice."},
  {t:"Microsoft Cost Management",ok:false,x:"Cost Management analyzes spend; it surfaces Advisor's cost items but not reliability recommendations."}
 ],
 w:"Advisor = five categories of recommendations (reliability, security, performance, cost, operational excellence) drawn from your configuration and usage."},
{id:"z031",d:2,obj:"2.4.4",cat:"idsec",t:"ms",pick:2,
 q:"Northwind wants to require multifactor authentication only when users sign in from outside the corporate network or from a device that is not managed by the company. Which two signals should the Conditional Access policy evaluate? Each correct answer presents part of the solution.",
 o:[
  {t:"IP location",ok:true,x:"Named locations based on IP ranges let the policy distinguish the corporate network from everywhere else."},
  {t:"Device state",ok:true,x:"Device compliance or join state identifies whether the device is managed."},
  {t:"The user's password length",ok:false,x:"Password characteristics are not a Conditional Access signal."},
  {t:"The storage redundancy of the user's OneDrive",ok:false,x:"Storage configuration has nothing to do with sign-in conditions."},
  {t:"The Azure region of the application's resource group",ok:false,x:"Resource location is not a sign-in signal evaluated by Conditional Access."}
 ],
 w:"Conditional Access signals: user or group, IP location, device, application, real-time risk. Decisions: block, or grant with MFA, compliant device and similar controls."},
{id:"z032",d:1,obj:"1.2.1",cat:"cloud",t:"mc",
 q:"Tailspin signs an agreement with Microsoft that guarantees an Azure service will be reachable 99.99 percent of the time each month. Which cloud benefit does this guarantee describe?",
 o:[
  {t:"High availability",ok:true,x:"High availability is the ability of a service to stay reachable despite failures, expressed as an uptime SLA percentage."},
  {t:"Scalability",ok:false,x:"Scalability is about adding or removing capacity, not guaranteed uptime."},
  {t:"Governance",ok:false,x:"Governance concerns enforcing standards and compliance, not uptime."},
  {t:"Manageability",ok:false,x:"Manageability covers the tools and automation for operating resources, not availability guarantees."}
 ],
 w:"Uptime SLA percentage = high availability. Each additional nine cuts the allowed downtime by a factor of ten."},
{id:"z033",d:3,obj:"3.4.2",cat:"monitor",t:"mc",
 q:"Woodgrove's operations team wants to be told in advance when Microsoft schedules maintenance that could affect the virtual machines in the company's subscriptions, and to see the history of such events for the past three months. Which Azure service should the team use?",
 o:[
  {t:"Azure Service Health",ok:true,x:"Service Health shows planned maintenance, service issues, health advisories and security advisories personalized to your subscriptions, with 90 days of history and alerting."},
  {t:"Azure Advisor",ok:false,x:"Advisor gives best-practice recommendations; it does not publish maintenance schedules."},
  {t:"Azure Monitor Application Insights",ok:false,x:"Application Insights monitors application performance, not platform maintenance."},
  {t:"The Azure status page",ok:false,x:"The public status page shows global incidents and is not personalized to your subscriptions or maintenance windows."}
 ],
 w:"Azure status = global, public. Service Health = personalized events (issues, planned maintenance, advisories) with alerts. Resource Health = one resource."},
{id:"z034",d:2,obj:"2.4.5",cat:"idsec",t:"mc",
 q:"Litware needs to give a contractor the ability to create, modify and delete all resources in a resource group, but the contractor must not be able to grant anyone else access to the resource group. Which built-in Azure role should Litware assign?",
 o:[
  {t:"Contributor",ok:true,x:"Contributor grants full control over resources but excludes the ability to assign roles."},
  {t:"Owner",ok:false,x:"Owner includes the ability to assign roles, which would let the contractor grant access to others."},
  {t:"Reader",ok:false,x:"Reader can only view resources and cannot create or change anything."},
  {t:"User Access Administrator",ok:false,x:"This role manages role assignments and cannot manage the resources themselves; it is the opposite of what is needed."}
 ],
 w:"Owner = everything including role assignment. Contributor = everything except role assignment. Reader = view only. User Access Administrator = access management only."},
{id:"z035",d:3,obj:"3.4.3",cat:"monitor",t:"mc",
 q:"Fabrikam hosts a web application in Azure App Service. Developers need to see request rates, response times, failed dependency calls and exceptions for the live application, and run availability tests against it from outside Azure. Which Azure Monitor feature should Fabrikam use?",
 o:[
  {t:"Application Insights",ok:true,x:"Application Insights is Azure Monitor's application performance monitoring feature, covering requests, dependencies, exceptions and availability tests."},
  {t:"Azure Monitor metrics for the App Service plan",ok:false,x:"Plan metrics show CPU and memory of the hosting infrastructure, not application-level request and dependency telemetry."},
  {t:"Azure Service Health",ok:false,x:"Service Health reports Azure platform events, not application behavior."},
  {t:"Azure Advisor",ok:false,x:"Advisor provides recommendations, not live application telemetry."}
 ],
 w:"Application Insights = APM for live web apps (requests, dependencies, exceptions, availability tests). Metrics and logs cover the infrastructure underneath."},
{id:"z036",d:1,obj:"1.3.3",cat:"cloud",t:"mc",
 q:"Northwind subscribes to Microsoft 365 so that employees can use email and collaboration tools from a browser. Northwind does not install or patch any servers or application software. Which cloud service type is Northwind consuming?",
 o:[
  {t:"Software as a service (SaaS)",ok:true,x:"A complete application delivered over the internet on a subscription, with the provider running everything beneath the data, is SaaS."},
  {t:"Platform as a service (PaaS)",ok:false,x:"PaaS provides a platform for the customer's own code; Northwind is not deploying any code."},
  {t:"Infrastructure as a service (IaaS)",ok:false,x:"IaaS would require Northwind to manage virtual machines and operating systems."},
  {t:"Function as a service (FaaS)",ok:false,x:"FaaS runs the customer's event-driven code, which is not the scenario."}
 ],
 w:"SaaS = finished application you subscribe to (Microsoft 365). You still own your data and user access."},
{id:"z037",d:2,obj:"2.4.6",cat:"idsec",t:"mc",
 q:"Tailspin adopts a security model in which every access request is authenticated and authorized using all available signals, regardless of whether it originates from inside or outside the corporate network. Which Zero Trust principle does this describe?",
 o:[
  {t:"Verify explicitly",ok:true,x:"Verify explicitly means always authenticating and authorizing based on all available data points, never trusting network location."},
  {t:"Use least privilege access",ok:false,x:"Least privilege limits how much access is granted and for how long; it is not about verifying each request."},
  {t:"Assume breach",ok:false,x:"Assume breach drives segmentation, encryption and detection on the premise that attackers are already inside."},
  {t:"Defense in depth",ok:false,x:"Defense in depth is a layered-control model, not one of the three Zero Trust principles."}
 ],
 w:"Zero Trust principles: verify explicitly, use least privilege access, assume breach."},
{id:"z038",d:3,obj:"3.1.1",cat:"cost",t:"ms",pick:3,
 q:"Woodgrove is reviewing why its Azure bill changed this month. Select the three factors that can affect the cost of Azure resources. Each correct answer presents a complete solution.",
 o:[
  {t:"The region in which resources are deployed",ok:true,x:"Prices for the same resource differ by geography because of power, labor, taxes and fees."},
  {t:"The amount of outbound network traffic leaving Azure",ok:true,x:"Egress and cross-region data transfer are billed by zone; inbound is generally free."},
  {t:"Unused resources such as orphaned disks that were never deleted",ok:true,x:"Resources keep billing until removed; maintenance of the environment is a listed cost factor."},
  {t:"The number of users signed in to the Azure portal",ok:false,x:"Portal access is free and does not affect resource charges."},
  {t:"The name chosen for each resource group",ok:false,x:"Resource names have no effect on pricing."},
  {t:"The number of tags applied to a resource",ok:false,x:"Tags are free metadata and do not change costs."}
 ],
 w:"Cost factors: resource type, consumption, maintenance, geography, network traffic, subscription type, Azure Marketplace."},
{id:"z039",d:1,obj:"1.1.2",cat:"cloud",t:"ms",pick:3,
 q:"Select the three statements that are true about the shared responsibility model. Each correct answer presents a complete solution.",
 o:[
  {t:"The customer is always responsible for the data it stores in the cloud",ok:true,x:"Data, devices and identities remain the customer's responsibility in every service model."},
  {t:"The cloud provider is always responsible for the physical datacenter",ok:true,x:"Physical hosts, network and datacenter belong to the provider in every service model."},
  {t:"Responsibility for the operating system depends on the service type",ok:true,x:"The customer manages the OS in IaaS; the provider manages it in PaaS and SaaS."},
  {t:"In SaaS the provider is responsible for managing the customer's user accounts",ok:false,x:"Accounts and identities stay with the customer even in SaaS."},
  {t:"In IaaS the provider patches the guest operating system",ok:false,x:"Guest OS patching in IaaS is the customer's job."},
  {t:"The customer is responsible for the physical network in PaaS",ok:false,x:"Physical networking is always the provider's responsibility."}
 ],
 w:"Always customer: data, devices, accounts. Always provider: physical layer. Varies: OS, network controls, applications, identity infrastructure."},
{id:"z040",d:2,obj:"2.4.7",cat:"idsec",t:"mc",
 q:"Litware enables Azure DDoS Protection on the virtual network that hosts its public web application. In the defense-in-depth model, which layer does this control belong to?",
 o:[
  {t:"Perimeter",ok:true,x:"The perimeter layer defends against network-based attacks arriving from outside, and DDoS protection is its signature control."},
  {t:"Network",ok:false,x:"The network layer limits connectivity between resources inside the environment, such as with NSGs and segmentation."},
  {t:"Compute",ok:false,x:"The compute layer covers securing virtual machines and endpoints, such as patching and anti-malware."},
  {t:"Identity and access",ok:false,x:"Identity and access covers authentication, SSO, MFA and auditing of access."}
 ],
 w:"Defense in depth layers outside in: physical, identity and access, perimeter (DDoS, firewalls), network, compute, application, data."},
{id:"z041",d:3,obj:"3.4.3",cat:"monitor",t:"mc",
 q:"Fabrikam has created an Azure Monitor alert rule that fires when a virtual machine's CPU exceeds 90 percent for five minutes. The on-call engineer must receive an SMS message and a Logic App must run when the alert fires. Where should Fabrikam define these notifications and actions?",
 o:[
  {t:"In an action group attached to the alert rule",ok:true,x:"Action groups hold the notification channels and automated actions (SMS, email, Logic App, webhook, runbook) that alert rules invoke."},
  {t:"In the virtual machine's diagnostic settings",ok:false,x:"Diagnostic settings control where telemetry is sent, not who is notified when an alert fires."},
  {t:"In a Log Analytics workspace query",ok:false,x:"Queries define conditions and analysis; they do not send notifications."},
  {t:"In Azure Service Health",ok:false,x:"Service Health concerns Azure platform events, not custom metric alerts on your VMs."}
 ],
 w:"Alert rule = the condition. Action group = the response (email, SMS, push, voice, webhook, Logic App, Function, runbook). Many rules can share one group."},
{id:"z042",d:2,obj:"2.4.8",cat:"idsec",t:"mc",
 q:"Northwind's security lead wants a single numeric indicator that reflects how well the company's Azure, AWS and on-premises resources follow security best practices, together with prioritized recommendations to improve it. Which capability should the lead use?",
 o:[
  {t:"Secure score in Microsoft Defender for Cloud",ok:true,x:"Defender for Cloud's posture management rates resources against the cloud security benchmark and expresses the result as a secure score with recommendations, across Azure, other clouds and Arc-connected machines."},
  {t:"Advisor score in Azure Advisor",ok:false,x:"Advisor score aggregates all five Advisor categories; Advisor's security items themselves come from Defender for Cloud, and Advisor does not cover AWS."},
  {t:"Compliance state in Azure Policy",ok:false,x:"Policy compliance counts resources against your assigned policies; it is not a security best-practice score across clouds."},
  {t:"Cost analysis in Microsoft Cost Management",ok:false,x:"Cost analysis is about spending, not security posture."}
 ],
 w:"Defender for Cloud = CSPM (recommendations, secure score) plus CWP (Defender plans that detect threats), across Azure, AWS, GCP and on-premises via Arc."},
{id:"z043",d:1,obj:"1.2.3",cat:"cloud",t:"mc",
 q:"Tailspin wants every resource deployed by any team to meet corporate standards automatically, with non-compliant deployments reported or blocked, instead of relying on manual reviews. Which benefit of cloud computing does this describe?",
 o:[
  {t:"Governance",ok:true,x:"Cloud governance uses templates and policy to enforce standards across all deployments and audit compliance automatically."},
  {t:"Elasticity",ok:false,x:"Elasticity is automatic scaling with demand, unrelated to standards enforcement."},
  {t:"Reliability",ok:false,x:"Reliability is the ability to recover from failures, not compliance with standards."},
  {t:"Predictability",ok:false,x:"Predictability concerns consistent performance and forecastable cost."}
 ],
 w:"Governance benefit = standards enforced by templates and policy, with compliance reporting. Implemented by Azure Policy and management groups."},
{id:"z044",d:3,obj:"3.3.1",cat:"govern",t:"mc",
 q:"A new administrator at Woodgrove needs to create a storage account and review the health of several virtual machines from a managed laptop on which no software can be installed. Which tool should the administrator use?",
 o:[
  {t:"The Azure portal",ok:true,x:"The portal is a browser-based graphical console for creating, configuring and monitoring every Azure resource without installing anything."},
  {t:"Azure PowerShell installed locally",ok:false,x:"Local installation is not permitted on the laptop."},
  {t:"The Azure CLI installed locally",ok:false,x:"The CLI would need to be installed on the device."},
  {t:"Azure Storage Explorer",ok:false,x:"Storage Explorer is a desktop app that must be installed and manages only storage, not VM health."}
 ],
 w:"Portal = browser GUI, nothing to install, good for one-off tasks and visual monitoring. Cloud Shell inside it gives command-line access too."},
{id:"z045",d:2,obj:"2.2.2",cat:"compute",t:"mc",
 q:"Litware places four virtual machines in an availability set that uses the default settings. During planned platform maintenance, how are the VMs restarted?",
 o:[
  {t:"One update domain at a time, so the VMs in other update domains keep running",ok:true,x:"Update domains are groups rebooted together during planned maintenance; Azure services only one update domain at a time with recovery time between them."},
  {t:"All four VMs at the same time",ok:false,x:"Spreading VMs across update domains exists precisely to avoid simultaneous reboots."},
  {t:"One fault domain at a time",ok:false,x:"Fault domains protect against hardware failures (shared power and switch); update domains govern maintenance reboots."},
  {t:"The VMs are never restarted during planned maintenance",ok:false,x:"Some planned maintenance requires a reboot; availability sets limit the impact rather than eliminate it."}
 ],
 w:"Availability set: fault domains (up to 3, hardware failure isolation) and update domains (default 5, max 20, rebooted one at a time)."},
{id:"z046",d:3,obj:"3.3.4",cat:"govern",t:"mc",
 q:"Fabrikam keeps the definition of its Azure environment in template files stored in a Git repository. Every change is reviewed in a pull request and deployed by a pipeline, and the production environment can be recreated from the files at any time. Which practice does this describe?",
 o:[
  {t:"Infrastructure as code",ok:true,x:"Treating infrastructure definitions as version-controlled, reviewed and pipeline-deployed source files is infrastructure as code."},
  {t:"Lift and shift",ok:false,x:"Lift and shift is a migration approach that moves workloads unchanged."},
  {t:"Zero Trust",ok:false,x:"Zero Trust is a security model about verifying every access request."},
  {t:"Vertical scaling",ok:false,x:"Vertical scaling changes the size of a resource; it is unrelated to how environments are defined."}
 ],
 w:"IaC = infrastructure defined in files, version-controlled, reviewed and deployed repeatably. ARM templates, Bicep and Terraform implement it on Azure."},
{id:"z047",d:1,obj:"1.1.3",cat:"cloud",t:"mc",
 q:"Northwind deploys a cloud environment that offers self-service provisioning and elastic scaling, but the hardware is used exclusively by Northwind and is hosted in a third-party facility. Which cloud model is this?",
 o:[
  {t:"Private cloud",ok:true,x:"Infrastructure dedicated to one organization is a private cloud whether it sits on-premises or is hosted by a third party."},
  {t:"Public cloud",ok:false,x:"Public cloud hardware is shared among many customers of the provider."},
  {t:"Hybrid cloud",ok:false,x:"Hybrid requires a public and a private environment working together; only one environment is described."},
  {t:"Community cloud",ok:false,x:"Community cloud is shared among several organizations with common concerns, not dedicated to one."}
 ],
 w:"Private cloud = dedicated to one organization, on-premises or third-party hosted. Dedicated is the test, not the location."},
{id:"z048",d:2,obj:"2.3.1",cat:"storage",t:"mc",
 q:"Tailspin is migrating an application that reads and writes to a shared network drive by using the SMB protocol. The application will run on Azure virtual machines and must continue to use SMB without code changes. Which Azure Storage service should Tailspin use?",
 o:[
  {t:"Azure Files",ok:true,x:"Azure Files provides fully managed file shares accessible over SMB (and NFS), ideal for lift-and-shift applications that expect a network drive."},
  {t:"Azure Blob Storage",ok:false,x:"Blob Storage is object storage accessed over HTTP, not an SMB share."},
  {t:"Azure Queue Storage",ok:false,x:"Queue Storage holds messages for asynchronous processing, not files."},
  {t:"Azure Table Storage",ok:false,x:"Table Storage is a NoSQL key-value store."}
 ],
 w:"Blob = unstructured objects over HTTP. Files = SMB/NFS shares. Queue = messages. Table = NoSQL key-value. Disks = block storage for VMs."},
{id:"z049",d:3,obj:"3.4.2",cat:"monitor",t:"mc",
 q:"Users report that a specific Azure virtual machine named VM-ERP01 is unreachable. The Woodgrove administrator wants to determine whether the outage is caused by an Azure platform problem affecting that VM or by something the company changed. Which tool should the administrator check first?",
 o:[
  {t:"Resource Health for VM-ERP01",ok:true,x:"Resource Health reports the availability of an individual resource and indicates whether a problem is platform-initiated or user-initiated."},
  {t:"The Azure status page",ok:false,x:"The public status page shows global incidents and does not report on a single resource."},
  {t:"Azure Advisor",ok:false,x:"Advisor offers recommendations, not real-time health of a specific VM."},
  {t:"Microsoft Cost Management",ok:false,x:"Cost Management is about spending and has no health information."}
 ],
 w:"Resource Health = health of one resource, minute by minute, platform versus user caused. Service Health = your services and regions. Status page = global."},
{id:"z050",d:2,obj:"2.4.3",cat:"idsec",t:"mc",
 q:"Litware wants to let an employee of a partner company access a Litware SharePoint site. The partner must sign in with the credentials from their own organization, and Litware must be able to apply its own Conditional Access policies to the partner. Which Microsoft Entra capability should Litware use?",
 o:[
  {t:"B2B collaboration",ok:true,x:"B2B collaboration invites the partner as a guest user who authenticates with their home credentials while Litware controls access and policies."},
  {t:"Microsoft Entra External ID for customers",ok:false,x:"External ID for customers is a separate tenant for consumer-facing apps, and it does not provide SSO to Microsoft 365 resources like SharePoint."},
  {t:"Microsoft Entra Domain Services",ok:false,x:"Domain Services provides legacy domain protocols; it is unrelated to partner access."},
  {t:"A new internal user account for the partner",ok:false,x:"Creating a Litware account would require the partner to use separate credentials, violating the requirement."}
 ],
 w:"B2B collaboration = guest users with their own credentials. B2B direct connect = Teams shared channels without guest objects. External ID for customers = consumer apps in an external tenant."}
];
