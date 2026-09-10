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
  const tile=([id,name,description,icon])=>`<button class="module-link" data-module="${id}"><span class="module-icon" aria-hidden="true">${icon}</span><span class="module-link-copy"><strong>${name}</strong><small>${description}</small></span><span class="module-arrow" aria-hidden="true">↗</span></button>`;
  $('#moduleNav').innerHTML=`<div class="module-feature"><div><span class="eyebrow">FORGE PLANNER</span><h3>Your next upgrade starts here.</h3><p>Turn a forge target into a material checklist. Track what you own and what is still missing.</p></div>${tile(forgeModule)}</div><div class="module-groups">${moduleGroups.map(group=>`<section class="module-group"><header><small>${group.name}</small><p>${group.description}</p></header><div>${group.items.map(tile).join('')}</div></section>`).join('')}</div>`;
  $('#moduleSidebar').innerHTML=[{name:'Planner',items:[forgeModule]},...moduleGroups].map(group=>`<div class="module-sidebar-group"><h3>${group.name}</h3>${group.items.map(([id,name,,icon])=>`<button data-module="${id}"><span aria-hidden="true">${icon}</span>${name}</button>`).join('')}</div>`).join('');
}

renderModuleNavigation();
document.querySelector('.module-count').textContent=Object.keys(moduleCatalog).length+' modules';
const workspaceOpenBase=openModule;
openModule=function(type,updateRoute=true){
  const entry=moduleCatalog[type];
  $('#moduleCategory').textContent=moduleGroups.find(group=>group.items.some(item=>item[0]===type))?.name||'Your toolkit';
  $('#moduleDescription').textContent=entry?.[2]||'';
  if(!currentProfile&&entry){
    closeWardrobe(false);
    $('#moduleTitle').textContent=entry[1];
    $('#moduleContent').innerHTML='<div class="module-empty"><span aria-hidden="true">&#9671;</span><h3>Your profile brings this to life.</h3><p>Search for a player to explore their stats and start planning.</p><button data-module-search>Search a player</button></div>';
    $('#moduleModal').classList.add('open');$('#moduleModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    $('#moduleModal .modal-close').focus();
  }else workspaceOpenBase(type,updateRoute);
  document.querySelectorAll('#moduleNav [data-module],#moduleSidebar [data-module]').forEach(button=>{const active=button.dataset.module===type;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
  $('#moduleContent').scrollTop=0;
};
const workspaceCloseBase=closeModule;
closeModule=function(updateRoute=true){workspaceCloseBase(updateRoute);document.querySelectorAll('#moduleSidebar [data-module],#moduleNav [data-module]').forEach(button=>{button.classList.remove('active');button.removeAttribute('aria-current')})};
$('#moduleSidebar').addEventListener('click',event=>{const button=event.target.closest('[data-module]');if(button)openModule(button.dataset.module)});
$('.module-home').addEventListener('click',event=>event.preventDefault());
$('#moduleContent').addEventListener('click',event=>{if(event.target.closest('[data-module-search]')){closeModule();$('#playerInput').focus()}});
