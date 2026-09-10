function buildAvailability(member,profile,{core=false,stale=false,fetchedAt=null,sources={}}={}){
  const raw=(present)=>({state:present?(stale?'stale':'cached'):'not_shared',fetchedAt:present?fetchedAt:null});
  const source=key=>core?{state:'loading',fetchedAt:null}:sources[key]||{state:'unavailable',fetchedAt:null};
  const inventory=raw(Boolean(member.inventory?.bag_contents||member.inventory?.inv_contents));
  const skills=raw(Boolean(member.player_data?.experience||member.skill_experience||Object.keys(member).some(x=>x.startsWith('experience_skill_'))));
  const collections=raw(member.collection!==undefined);
  return {
    profile:{state:stale?'stale':'cached',fetchedAt},inventory,skills,bank:raw(profile.banking!==undefined),
    accessories:inventory,ironpath:inventory,pets:raw(member.pets_data!==undefined),
    collections:collections.state==='not_shared'?collections:source('collections'),
    garden:source('garden'),museum:source('museum'),mayor:source('election'),
    networth:inventory.state==='not_shared'?inventory:source('prices'),
    bestiary:source('bestiary'),accessoryCatalog:source('accessoryCatalog'),
    accessoryFamilies:source('accessoryParents'),prices:source('prices'),identity:source('identity')
  };
}
module.exports={buildAvailability};
