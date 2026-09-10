const availabilityLabels={live:'Live',cached:'Cached',stale:'Stale cached data',loading:'Loading',not_shared:'Not exposed by the API',unavailable:'Temporarily unavailable'};
function availabilityFor(type){
  const a=currentProfile?.availability||{};
  if(type==='accessories'&&a.accessories?.state!=='not_shared')return a.accessoryCatalog||a.accessories;
  if(type==='planner')return profileMeta?.phase==='core'?{state:'loading'}:a.prices;
  return a[type]||a.profile;
}
function availabilityText(status){if(!status)return '';return (availabilityLabels[status.state]||'Unknown')+(status.fetchedAt?' · '+new Date(status.fetchedAt).toLocaleTimeString(): '');}
function updateDataAvailability(){
  const a=currentProfile?.availability||{},entries=Object.entries(a),issues=entries.filter(([,s])=>['stale','not_shared','unavailable'].includes(s.state));
  $('#dataAvailability').innerHTML=`<details><summary>${profileMeta?.phase==='core'?'Profile loaded · loading additional data':issues.length?`${issues.length} data sources need attention`:'Profile data available'}${profileMeta?.stale?' · cached profile':''}</summary><div class="source-status-grid">${entries.map(([key,status])=>`<div><b>${escapeHtml(key.replace(/([A-Z])/g,' $1'))}</b><span data-state="${status.state}">${escapeHtml(availabilityText(status))}</span></div>`).join('')}</div>${profileMeta?.phase==='failed'?'<button data-retry-details>Retry additional data</button>':''}</details>`;
  const unavailable=key=>['not_shared','unavailable','loading'].includes(a[key]?.state);
  if(unavailable('collections')){$('#collectionPercent').textContent='—';$('#collectionSummary').textContent=availabilityText(a.collections);$('#collectionBar').style.width='0%';}
  if(unavailable('skills')){$('#skillAverage').textContent='—';$('#skillsList').innerHTML='<p class="module-note">Skill data not exposed by the API.</p>';}
  if(unavailable('inventory')){$('#storageSummary').textContent='Inventory data not exposed by the API.';$('#equipmentGrid').innerHTML='<p class="module-note">Equipment data not exposed by the API.</p>';$('#accessoryQuickPower').textContent='MP unavailable';}
  if(unavailable('bank'))$('#bank').textContent='—';
}
async function loadProfileDetails(name,id,sequence,signal){
  try{
    const response=await fetch(`/api/profile/${encodeURIComponent(name)}?profile=${encodeURIComponent(id)}`,{signal});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Additional data unavailable');
    if(sequence!==loadSequence||currentProfile?.id!==id)return;
    currentProfile=data.profile;profileMeta=data.meta;
    const c=currentProfile.collections;$('#collectionPercent').textContent=c.percent+'%';$('#collectionSummary').textContent=c.maxed+' of '+c.total+' collections maxed';$('#collectionBar').style.width=c.percent+'%';
    updateDataAvailability();updateFreshness();document.dispatchEvent(new Event('skyfolio:profile-details'));
    if($('#moduleModal').classList.contains('open')&&$('#moduleContent').querySelector('[data-module-waiting]'))openModule($('#moduleModal').dataset.module,false);
  }catch(error){
    if(signal.aborted||sequence!==loadSequence)return;
    profileMeta.phase='failed';Object.values(currentProfile.availability||{}).forEach(status=>{if(status.state==='loading')status.state='unavailable'});updateDataAvailability();
    if($('#moduleModal').classList.contains('open')&&$('#moduleContent').querySelector('[data-module-waiting]'))openModule($('#moduleModal').dataset.module,false);
  }
}
$('#dataAvailability').addEventListener('click',event=>{if(event.target.closest('[data-retry-details]'))loadProfileDetails(currentPlayer,currentProfile.id,loadSequence,profileAbort.signal)});
