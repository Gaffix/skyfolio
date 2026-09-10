const manualPowerCalculator=renderMagicalPowerCalculator;
const accessoryPlanKey=()=>`skyfolio-accessory-plan-${currentPlayer.toLowerCase()}-${currentProfile.id}`;
function plannedAccessoryIds(){return readLocalList(accessoryPlanKey()).filter(x=>typeof x==='string');}
function currentAccessoryPlan(){return SkyfolioPlanning.accessoryPlan(currentProfile.accessories.magicalPower,currentProfile.accessories.planner?.candidates||[],plannedAccessoryIds());}
renderMagicalPowerCalculator=function(){
  const plan=currentAccessoryPlan();
  return `<section class="accessory-plan"><header><div><small>ITEM PLAN</small><h3>${number.format(plan.total)} projected MP <span>+${plan.gain}</span></h3></div><button data-accessory-tab="missing">Choose accessories</button></header><p class="module-note">Based on API-reported highest MP. One upgrade per family; special or dynamic item effects may differ in-game.</p><div>${plan.rows.map(row=>`<article><strong>${escapeHtml(row.name)}</strong><span>+${row.mpGain} MP</span><button data-unplan-accessory="${escapeHtml(row.id)}">Remove</button></article>`).join('')||'<p class="module-note">Choose missing accessories or recombobulations to build a plan.</p>'}</div><p>${currentProfile.identity?.gameMode==='ironman'?'Ironman · collect the items and materials':`${number.format(plan.cost)} coins estimated${plan.unknownCosts?' + '+plan.unknownCosts+' unpriced items':''}`}</p><button data-accessory-quest ${plan.rows.length?'':'disabled'}>Add plan to Quest Board</button></section><details class="accessory-details"><summary>Manual rarity calculator</summary>${manualPowerCalculator()}</details>`;
};
function accessoryActionRow(item){
  const selected=plannedAccessoryIds().includes(item.id),method=item.kind==='activate'?'Move to accessory bag':item.kind==='recomb'?'Recombobulate':item.kind==='upgrade'?'Family upgrade':'New accessory';
  return `<article class="accessory-option"><img loading="lazy" src="${item.icon}" alt=""><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(method)} · ${escapeHtml(item.rarity||'')}</small><span>${item.mpGain?`+${item.mpGain} MP`:''}${item.coinsPerMp!==null&&item.coinsPerMp!==undefined?` · ${number.format(item.coinsPerMp)} coins / MP`:''}</span></div><div class="accessory-option-actions"><button data-acquisition="${escapeHtml(item.kind==='recomb'?'RECOMBOBULATOR_3000':item.itemId||item.id)}">How to obtain</button>${item.mpGain?`<button data-plan-accessory="${escapeHtml(item.id)}" ${selected?'disabled':''}>${selected?'Planned':'Add to plan'}</button>`:''}</div></article>`;
}
let accessoryResultLimit=50;
drawMissingAccessories=function(){
  const a=currentProfile?.accessories||{},root=$('#missingAccessoryResults');if(!root)return;
  if(!a.inventoryAvailable||!a.catalogAvailable){root.innerHTML='<p class="module-note">'+(!a.inventoryAvailable?'Inventory data is not exposed by Hypixel.':'The accessory catalog is unavailable. Retry when the source recovers.')+'</p>';return;}
  if(!$('#accessoryListMode'))$('#missingAccessorySearch').insertAdjacentHTML('afterend','<select id="accessoryListMode" aria-label="Accessory list"><option value="recommended">Useful upgrades</option><option value="all">All unowned tiers</option></select><button data-accessory-tab="calculator">View plan</button>');
  const all=$('#accessoryListMode').value==='all',query=$('#missingAccessorySearch').value.trim().toLowerCase();
  if(!all&&a.planner?.available===false){root.innerHTML='<p class="module-note">Upgrade family data is unavailable. Choose All unowned tiers to browse the catalog.</p>';return;}
  const rows=(all?a.missingAccessories:(a.planner?.candidates||[])).filter(x=>`${x.name} ${x.rarity} ${x.kind||''}`.toLowerCase().includes(query));
  $('#missingAccessoryCount').textContent=rows.length+' results';
  root.innerHTML=`<div class="accessory-options">${rows.slice(0,accessoryResultLimit).map(accessoryActionRow).join('')||'<p class="module-note">No matching upgrades. Try another filter.</p>'}</div>${rows.length>accessoryResultLimit?'<button data-more-accessories>Show more</button>':''}<section id="acquisitionDetails" aria-live="polite"></section>`;
};
let acquisitionRequest=0;
async function showAcquisition(id){
  const token=++acquisitionRequest,root=$('#acquisitionDetails');if(!root)return;root.innerHTML='<p class="module-note">Loading obtaining methods…</p>';
  try{const response=await fetch('/api/acquisition/'+encodeURIComponent(id));const data=await response.json();if(!response.ok)throw Error();if(token!==acquisitionRequest||!root.isConnected)return;
    root.innerHTML=`<div class="acquisition-card"><header><h3>How to obtain</h3><button data-close-acquisition aria-label="Close obtaining details">×</button></header><p>${escapeHtml(data.methods.join(' · ')||'See wiki for obtaining methods')}</p>${data.requirements?`<p>${escapeHtml(data.requirements)}</p>`:''}${data.ingredients.length?`<ul>${data.ingredients.map(x=>`<li>${number.format(x.count)} × ${escapeHtml(x.name)}</li>`).join('')}</ul>`:''}${data.wikiExcerpt?`<blockquote>${escapeHtml(data.wikiExcerpt)}</blockquote>`:'<p class="module-note">The wiki excerpt is unavailable. Open the item page for details.</p>'}<a href="${escapeHtml(data.wikiUrl)}" target="_blank" rel="noopener">${escapeHtml(data.wikiSource)} ↗</a><small>Recipe data: NotEnoughUpdates · Checked ${new Date(data.fetchedAt).toLocaleDateString()}</small></div>`;root.scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch{if(token===acquisitionRequest&&root.isConnected)root.innerHTML=`<p class="module-note">Obtaining details are unavailable. <a href="https://hypixelskyblock.minecraft.wiki/w/Special:Search?search=${encodeURIComponent(id.replaceAll('_',' '))}" target="_blank" rel="noopener">Search the SkyBlock wiki ↗</a></p>`;}
}
$('#moduleContent').addEventListener('click',event=>{
  const add=event.target.closest('[data-plan-accessory]'),remove=event.target.closest('[data-unplan-accessory]'),obtaining=event.target.closest('[data-acquisition]');
  if(obtaining)showAcquisition(obtaining.dataset.acquisition);
  if(event.target.closest('[data-close-acquisition]')){$('#acquisitionDetails').innerHTML='';acquisitionRequest++;}
  if(add){const rows=currentProfile.accessories.planner.candidates,row=rows.find(x=>x.id===add.dataset.planAccessory);if(!row)return;const selected=plannedAccessoryIds().filter(id=>rows.find(x=>x.id===id)?.family!==row.family);selected.push(row.id);if(!writeLocalList(accessoryPlanKey(),selected))return showToast('Browser storage is full');drawMissingAccessories();}
  if(remove){writeLocalList(accessoryPlanKey(),plannedAccessoryIds().filter(id=>id!==remove.dataset.unplanAccessory));drawAccessories();}
  if(event.target.closest('[data-more-accessories]')){accessoryResultLimit+=50;drawMissingAccessories();}
  if(event.target.closest('[data-accessory-quest]')){const plan=currentAccessoryPlan();for(const row of plan.rows){const text=`${row.kind==='recomb'?'Recombobulate':row.kind==='activate'?'Activate':'Obtain'} ${row.name} (+${row.mpGain} MP)`;if(!goals.some(g=>g.text===text&&!g.done))goals.push({id:Date.now()+goals.length,text,done:false});}renderGoals();showToast('Accessory targets added to Quest Board');}
});
$('#moduleContent').addEventListener('change',event=>{if(event.target.id==='accessoryListMode'){accessoryResultLimit=50;drawMissingAccessories();}});
