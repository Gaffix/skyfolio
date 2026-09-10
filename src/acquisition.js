const WIKI='https://hypixelskyblock.minecraft.wiki';
function plainText(html){return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();}
function recipeDetails(item){
  const clean=value=>String(value||'').replace(/§[0-9a-fk-or]/gi,'');
  const methods=new Set(),ingredients={};
  if(item.recipe&&Object.values(item.recipe).some(Boolean)){methods.add('Crafting');for(const value of Object.values(item.recipe)){if(!value)continue;const [id,count]=String(value).split(':');ingredients[id]=(ingredients[id]||0)+Number(count||1);}}
  for(const recipe of item.recipes||[]){const kind={forge:'Forge',npc_shop:'NPC shop',mob_loot:'Mob drop',katgrade:'Kat upgrade',trade:'Trade'}[recipe.type];if(kind)methods.add(kind);}
  return {methods:[...methods],requirements:clean(item.crafttext),ingredients:Object.entries(ingredients).map(([id,count])=>({id,name:id.replaceAll('_',' '),count}))};
}
function createAcquisitionService({resourceJson,cache}){
  return async function getAcquisition(id){
    const key='acquisition:'+id,previous=cache.peek(key);
    return cache.get(key,previous?.value?.wikiStatus==='available'?86400000:60000,async()=>{
      const item=await resourceJson('https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/master/items/'+encodeURIComponent(id)+'.json');
      let title=String(item.displayname||id).replace(/§[0-9a-fk-or]/gi,'').replaceAll(' ','_');
      for(const value of item.info||[]){try{const url=new URL(value);if(url.hostname==='hypixelskyblock.minecraft.wiki'&&url.pathname.startsWith('/w/')){title=decodeURIComponent(url.pathname.slice(3));break}}catch{}}
      const result={...recipeDetails(item),wikiUrl:WIKI+'/w/'+encodeURIComponent(title)+'#Obtaining',wikiSource:'Hypixel SkyBlock community wiki',wikiExcerpt:null,wikiStatus:'unavailable',fetchedAt:Date.now()};
      try{
        const sections=await resourceJson(WIKI+'/api.php?'+new URLSearchParams({action:'parse',page:title,prop:'sections',format:'json',redirects:'1'}));
        const section=sections.parse?.sections?.find(x=>/^(obtaining|obtention|acquisition)$/i.test(plainText(x.line)));
        if(section){const page=await resourceJson(WIKI+'/api.php?'+new URLSearchParams({action:'parse',page:title,section:section.index,prop:'text',format:'json'}));const text=plainText(page.parse?.text?.['*']||'').replace(/^(Obtaining|Obtention|Acquisition)\s*(\[\s*edit.*?\])?/i,'').trim();if(text){result.wikiExcerpt=text.slice(0,500)+(text.length>500?'…':'');result.wikiStatus='available';}}
        else result.wikiStatus='no_section';
      }catch{}
      return result;
    });
  };
}
module.exports={createAcquisitionService,recipeDetails,plainText};
