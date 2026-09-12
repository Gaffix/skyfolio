// One dispatch table; callbacks resolve the current renderer after customization.
Object.assign(moduleRenderers,{
  skills:()=>renderDetailedSkills(),slayer:()=>renderSlayers(),dungeons:()=>renderDetailedDungeons(),
  pets:()=>renderPetsPerfect(),mining:()=>renderMiningSummary(),garden:()=>renderGardenSummary(),
  accessories:()=>renderAccessoriesDeep(),bestiary:()=>renderBestiaryDeep(),minions:()=>renderMinionsDeep(),
  networth:()=>renderAccurateNetworth(),collections:()=>renderCollections(),essence:()=>renderEssence(),
  museum:()=>renderMuseum(),crimson:()=>renderCrimsonDeep(),rift:()=>renderRiftDeep(),misc:()=>renderMiscDeep()
});
function renderMiningSummary(){const m=currentProfile.mining;$('#moduleTitle').textContent='Mining';$('#moduleContent').innerHTML=`<div class="module-grid">${['mithril','gemstone','glacite'].map(k=>statCard(k+' powder',compact(m[k].available),[['Spent',compact(m[k].spent)],['Total',compact(m[k].available+m[k].spent)]])).join('')}</div><h3>Crystals</h3><div class="module-grid">${m.crystals.map(x=>statCard(x.name,escapeHtml(x.state),[['Found',x.totalFound]])).join('')}</div>`;}
function renderGardenSummary(){const g=currentProfile.garden;$('#moduleTitle').textContent='Garden';$('#moduleContent').innerHTML=`<div class="module-grid">${statCard('Garden XP',number.format(g.experience),[['Copper',number.format(g.copper)],['Plots',g.plots]],true)}${statCard('Visitors',number.format(g.visitorsCompleted),[['Unique visitors',g.uniqueVisitors]])}${g.composter?statCard('Composter',number.format(g.composter.compost),[['Organic matter',number.format(g.composter.organicMatter)],['Fuel',number.format(g.composter.fuel)]]):''}</div><h3>Crop collection</h3><table class="module-table"><tbody>${g.crops.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>Upgrade ${x.upgrade}</td><td>${number.format(x.amount)}</td></tr>`).join('')}</tbody></table>`;}
