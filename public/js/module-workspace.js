const moduleGroups=[
  {
    "name": "Combat & worlds",
    "description": "Take on your next challenge.",
    "items": [
      [
        "slayer",
        "Slayer",
        "Boss levels, XP and tier kills",
        "◇"
      ],
      [
        "dungeons",
        "Dungeons",
        "Classes, secrets and floor records",
        "◇"
      ],
      [
        "crimson",
        "Crimson Isle",
        "Factions, Kuudra and Dojo progress",
        "◇"
      ],
      [
        "rift",
        "Rift",
        "Timecharms and alternate-world progress",
        "◇"
      ]
    ]
  },
  {
    "name": "Skills & resources",
    "description": "Make every resource count.",
    "items": [
      [
        "skills",
        "Skills",
        "Explore every skill and its progress",
        "◇"
      ],
      [
        "mining",
        "Mining",
        "Powder balances and crystal progress",
        "◇"
      ],
      [
        "garden",
        "Garden",
        "Crops, visitors and your composter",
        "◇"
      ],
      [
        "minions",
        "Minions",
        "Crafts, slots and production",
        "◇"
      ],
      [
        "collections",
        "Collections",
        "Collection tiers and unlocks",
        "◇"
      ]
    ]
  },
  {
    "name": "Profile & equipment",
    "description": "Build a stronger profile.",
    "items": [
      [
        "pets",
        "Pets",
        "Companions, levels and held items",
        "◇"
      ],
      [
        "accessories",
        "Accessories",
        "Magical Power, tuning and your bag",
        "◇"
      ],
      [
        "essence",
        "Essence",
        "Balances and upgrades",
        "◇"
      ],
      [
        "museum",
        "Museum",
        "Donations and collection progress",
        "◇"
      ],
      [
        "networth",
        "Net Worth",
        "Coins and item value breakdown",
        "◇"
      ],
      [
        "misc",
        "Misc",
        "Bestiary and additional profile stats",
        "◇"
      ]
    ]
  },
  {
    "name": "Planning & tools",
    "description": "Decide what comes next.",
    "items": [
      [
        "planner",
        "Planner",
        "Recommendations for your next goal",
        "◇"
      ],
      [
        "progress",
        "Progress",
        "Track changes across your profile",
        "◇"
      ],
      [
        "compare",
        "Compare",
        "Compare profiles side by side",
        "◇"
      ],
      [
        "data",
        "Data",
        "Export your profile data",
        "◇"
      ],
      [
        "notebook",
        "Notebook",
        "Personal plans and reminders",
        "◇"
      ]
    ]
  },
  {
    "name": "Events & elections",
    "description": "Keep up with SkyBlock.",
    "items": [
      [
        "mayor",
        "Mayor",
        "Current perks and election standings",
        "◇"
      ],
      [
        "events",
        "Events",
        "Upcoming events and countdowns",
        "◇"
      ]
    ]
  }
];
const forgeModule=['ironpath','IronPath','Plan forge upgrades with the materials you own','⛏'];
const moduleCatalog=Object.fromEntries([forgeModule,...moduleGroups.flatMap(group=>group.items)].map(item=>[item[0],item]));

function renderModuleNavigation(){
  const tile=([id,name])=>`<button class="module-link" data-module="${id}"><strong>${name}</strong></button>`;
  const group=(name,items)=>`<section class="module-group"><small>${name}</small><div>${items.map(tile).join('')}</div></section>`;
  const primary=moduleGroups.slice(0,3).map(g=>({...g,items:g.items.filter(x=>x[0]!=='accessories')}));
  $('#moduleNav').innerHTML=primary.map(g=>group(g.name,g.items)).join('');
  $('#moduleSecondary').innerHTML=moduleGroups.slice(3).map(g=>group(g.name,g.items)).join('');
  $('#moduleSidebar').innerHTML=[{name:'Essentials',items:[moduleCatalog.accessories,forgeModule]},...moduleGroups.map(g=>({...g,items:g.items.filter(x=>x[0]!=='accessories')}))].map(g=>`<div class="module-sidebar-group"><h3>${g.name}</h3>${g.items.map(([id,name])=>`<button data-module="${id}">${name}</button>`).join('')}</div>`).join('');
}
renderModuleNavigation();
let workspaceReturnFocus=null,pendingAccessoryView=null;
const workspaceOpenBase=openModule;
openModule=function(type,updateRoute=true){
  const wasOpen=$('#moduleModal').classList.contains('open');if(!wasOpen)workspaceReturnFocus=document.activeElement;
  clearInterval(ironpathTimer);clearInterval(mayorTimer);clearInterval(eventTimer);
  const entry=moduleCatalog[type];
  $('#moduleCategory').textContent=moduleGroups.find(group=>group.items.some(item=>item[0]===type))?.name||'Your toolkit';
  $('#moduleDescription').textContent='';
  $('#moduleModal').dataset.module=type;if(type!=='accessories')pendingAccessoryView=null;
  const status=availabilityFor(type),blocked=currentProfile&&['loading','not_shared','unavailable'].includes(status?.state)&&!['notebook','data','compare','progress','events'].includes(type);
  $('#moduleAvailability').textContent=currentProfile?availabilityText(status):'';
  $('#moduleAvailability').dataset.state=status?.state||'';
  if((!currentProfile||blocked)&&entry){
    closeWardrobe(false);
    $('#moduleTitle').textContent=entry[1];
    $('#moduleContent').innerHTML='<div class="module-empty"><span aria-hidden="true">&#9671;</span><h3>Your profile brings this to life.</h3><p>Search for a player to explore their stats and start planning.</p><button data-module-search>Search a player</button></div>';
    if(blocked){const loading=status.state==='loading';$('#moduleContent').innerHTML=`<div class="module-empty" data-module-waiting><h3>${escapeHtml(availabilityLabels[status.state])}</h3><p>${loading?'Your profile is ready. This module is still loading.':status.state==='not_shared'?'This data was not exposed by Hypixel. Check the profile API settings in SkyBlock.':'The source could not be reached. Your other profile data is still available.'}</p>${loading?'':'<button data-retry-module>Retry</button>'}</div>`;if(updateRoute)history.pushState({module:type},'',profileUrl(modulePaths[type]));}
    $('#moduleModal').classList.add('open');$('#moduleModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    $('#moduleModal .modal-close').focus();
  }else workspaceOpenBase(type,updateRoute);
  document.querySelectorAll('#moduleNav [data-module],#moduleSidebar [data-module],#moduleSecondary [data-module],#moduleEssentials [data-module]').forEach(button=>{const active=button.dataset.module===type;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
  if(type==='accessories'&&pendingAccessoryView&&$('#accessoryPanel')){accessoryTab=pendingAccessoryView;pendingAccessoryView=null;drawAccessories();}
  $('#moduleContent').scrollTop=0;
  if(!wasOpen)$('#moduleModal .modal-close').focus();
  if(type==='ironpath'&&!blocked)ironpathTimer=setInterval(()=>document.querySelectorAll('[data-finish]').forEach(el=>{if(Number(el.dataset.finish))el.textContent=durationText((Number(el.dataset.finish)-Date.now())/1000)}),1000);
};
const workspaceCloseBase=closeModule;
closeModule=function(updateRoute=true){clearInterval(ironpathTimer);clearInterval(mayorTimer);clearInterval(eventTimer);workspaceReturnFocus?.focus?.();workspaceCloseBase(updateRoute);document.querySelectorAll('#moduleSidebar [data-module],#moduleNav [data-module],#moduleSecondary [data-module],#moduleEssentials [data-module]').forEach(button=>{button.classList.remove('active');button.removeAttribute('aria-current')})};
$('#moduleSidebar').addEventListener('click',event=>{const button=event.target.closest('[data-module]');if(button)openModule(button.dataset.module)});
$('.module-home').addEventListener('click',event=>event.preventDefault());
$('#moduleContent').addEventListener('click',event=>{if(event.target.closest('[data-module-search]')){closeModule();$('#playerInput').focus()}});

for(const selector of ['#moduleEssentials','#moduleSecondary'])$(selector).addEventListener('click',event=>{const button=event.target.closest('[data-module]');if(!button)return;pendingAccessoryView=button.dataset.accessoryView||null;openModule(button.dataset.module)});

$('#moduleContent').addEventListener('click',event=>{if(event.target.closest('[data-retry-module]'))loadProfile(currentPlayer,currentProfile.id,true)});
