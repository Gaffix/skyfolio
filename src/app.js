const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { publicRoot, profileCacheMs: CACHE_MS, hypixelApiKey } = require('./config');
const { readGoals, writeGoals, readNotebook, writeNotebook, readIronpath, writeIronpath } = require('./data-store');
const { cleanName, titleCase, readEquipment, readLoadouts, readStorage, accessoryStats } = require('./items');
const { recipes: forgeRecipes, recipeById, itemName } = require('./forge-recipes');
const cache = new Map();
let collectionResources={time:0,data:null};
let bazaarResources={time:0,data:null};
let electionResources={time:0,data:null};
const gardenCache=new Map();

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchWithRetry(url,options={},attempts=2){let lastError,lastResponse;for(let attempt=0;attempt<attempts;attempt++){try{const response=await fetch(url,{...options,signal:AbortSignal.timeout(8000)});lastResponse=response;if(response.status!==429&&response.status<500)return response}catch(error){lastError=error}if(attempt+1<attempts)await wait(250*(attempt+1))}if(lastResponse)return lastResponse;const host=new URL(url).hostname;throw Object.assign(new Error(`Could not reach ${host}. Check your connection and try again.`),{status:502,cause:lastError})}
async function fetchJsonWithRetry(url,options={},attempts=2){let lastError;for(let attempt=0;attempt<attempts;attempt++){try{const response=await fetchWithRetry(url,options,1),text=await response.text();return{response,data:JSON.parse(text)}}catch(error){lastError=error;if(attempt+1<attempts)await wait(300*(attempt+1))}}if(lastError?.status)throw lastError;throw Object.assign(new Error(`Received an incomplete response from ${new URL(url).hostname}. Please try again.`),{status:502,cause:lastError})}
async function resolvePlayer(username){const urls=[`https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(username)}`,`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`];const results=await Promise.all(urls.map(async url=>{try{const response=await fetchWithRetry(url,{},2);if(response.ok)return{player:await response.json()};return{status:response.status}}catch(error){return{error}}}));const match=results.find(result=>result.player);if(match)return match.player;if(results.every(result=>result.status===404))throw Object.assign(new Error('Minecraft player not found.'),{status:404});throw results.find(result=>result.error)?.error||Object.assign(new Error('Minecraft profile lookup is temporarily unavailable.'),{status:502})}
async function getCollectionResources(){if(collectionResources.data&&Date.now()-collectionResources.time<60*60*1000)return collectionResources.data;try{const response=await fetchWithRetry('https://api.hypixel.net/v2/resources/skyblock/collections');if(!response.ok)throw new Error();const data=await response.json();collectionResources={time:Date.now(),data:data.collections||{}}}catch{collectionResources={time:Date.now(),data:{}}}return collectionResources.data}
async function getBazaarResources(){if(bazaarResources.data&&Date.now()-bazaarResources.time<5*60*1000)return bazaarResources.data;try{const response=await fetch('https://api.hypixel.net/v2/skyblock/bazaar');const data=await response.json();bazaarResources={time:Date.now(),data:data.products||{}}}catch{bazaarResources={time:Date.now(),data:{}}}return bazaarResources.data}
async function getElectionResources(){if(electionResources.data&&Date.now()-electionResources.time<5*60*1000)return electionResources.data;try{const response=await fetch('https://api.hypixel.net/v2/resources/skyblock/election'),data=await response.json();electionResources={time:Date.now(),data:{lastUpdated:data.lastUpdated||Date.now(),mayor:data.mayor||{},current:data.current||{}}}}catch{electionResources={time:Date.now(),data:{mayor:{},current:{}}}}return electionResources.data}
async function getGarden(profileId){const cached=gardenCache.get(profileId);if(cached&&Date.now()-cached.time<10*60*1000)return cached.data;try{const response=await fetch(`https://api.hypixel.net/v2/skyblock/garden?profile=${profileId}`,{headers:{'API-Key':hypixelApiKey}});const body=await response.json();const data=body.garden||{};gardenCache.set(profileId,{time:Date.now(),data});return data}catch{return{}}}
async function readJsonBody(req){let body='';for await(const chunk of req){body+=chunk;if(body.length>65536)throw Object.assign(new Error('Request is too large.'),{status:413})}try{return JSON.parse(body||'{}')}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400})}}

const skillXp = [50,125,200,300,500,750,1000,1500,2000,3500,5000,7500,10000,15000,20000,30000,50000,75000,100000,200000,300000,400000,500000,600000,700000,800000,900000,1000000,1100000,1200000,1300000,1400000,1500000,1600000,1700000,1800000,1900000,2000000,2100000,2200000,2300000,2400000,2500000,2600000,2750000,2900000,3100000,3400000,3700000,4000000,4300000,4600000,4900000,5200000,5500000,5800000,6100000,6400000,6700000,7000000];
const dungeonXp = [50,75,110,160,230,330,470,670,950,1340,1890,2665,3760,5260,7380,10300,14400,20000,27600,38000,52500,71500,97000,132000,180000,243000,328000,445000,600000,800000,1065000,1410000,1900000,2500000,3300000,4300000,5600000,7200000,9200000,12000000,15000000,19000000,24000000,30000000,38000000,48000000,60000000,75000000,93000000,116250000];

function levelFromXp(xp = 0, table = skillXp, cap = table.length) {
  let level = 0;
  for (let i = 0; i < Math.min(cap, table.length); i++) {
    if (xp < table[i]) return level + xp / table[i];
    xp -= table[i]; level++;
  }
  return level;
}
function first(obj, paths, fallback = 0) {
  for (const keys of paths) {
    let value = obj;
    for (const key of keys.split('.')) value = value?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
}
function memberOf(profile, uuid) {
  const compact = uuid.replaceAll('-', '');
  return profile.members?.[uuid] || profile.members?.[compact] || Object.values(profile.members || {}).find(m => (m.player_id || '').replaceAll('-', '') === compact);
}
function slayerStats(member){return Object.entries(member.slayer?.slayer_bosses||{}).map(([type,data])=>({type,name:titleCase(type),xp:Number(data.xp||0),level:Math.max(0,...Object.keys(data.claimed_levels||{}).map(x=>Number(x.match(/\d+/)?.[0]||0))),kills:[0,1,2,3,4].map(tier=>Number(data[`boss_kills_tier_${tier}`]||0))}))}
function dungeonStats(member){const d=member.dungeons||{},c=d.dungeon_types?.catacombs||{};return{level:levelFromXp(Number(c.experience||0),dungeonXp),experience:Number(c.experience||0),selectedClass:d.selected_dungeon_class||null,secrets:Number(d.secrets||0),classes:Object.entries(d.player_classes||{}).map(([name,x])=>({name:titleCase(name),level:levelFromXp(Number(x.experience||0),dungeonXp),experience:Number(x.experience||0)})),floors:[0,1,2,3,4,5,6,7].map(floor=>({floor,completions:Number(c.tier_completions?.[floor]||0),fastest:Number(c.fastest_time?.[floor]||0)}))}}
function petStats(member){return(member.pets_data?.pets||[]).map(p=>({type:p.type,name:titleCase(p.type),tier:p.tier,experience:Number(p.exp||0),active:Boolean(p.active),heldItem:p.heldItem?titleCase(p.heldItem):null,candyUsed:Number(p.candyUsed||0),soulbound:Boolean(p.petSoulbound)})).sort((a,b)=>Number(b.active)-Number(a.active)||b.experience-a.experience)}
function miningStats(member){const m=member.mining_core||{};return{mithril:{available:Number(m.powder_mithril||0),spent:Number(m.powder_spent_mithril||0)},gemstone:{available:Number(m.powder_gemstone||0),spent:Number(m.powder_spent_gemstone||0)},glacite:{available:Number(m.powder_glacite||0),spent:Number(m.powder_spent_glacite||0)},crystals:Object.entries(m.crystals||{}).map(([name,x])=>({name:titleCase(name),state:x?.state||'UNKNOWN',totalFound:Number(x?.total_found||0)}))}}
function gardenStats(member,garden){const collected=garden.resources_collected||{};return{experience:Number(garden.garden_experience||0),copper:Number(member.garden_player_data?.copper||0),visitorsCompleted:Number(garden.commission_data?.total_completed||0),uniqueVisitors:Number(garden.commission_data?.unique_npcs_served||0),plots:(garden.unlocked_plots_ids||[]).length,crops:Object.entries(collected).map(([name,amount])=>({name:titleCase(name.replace(':3','')),amount:Number(amount),upgrade:Number(garden.crop_upgrade_levels?.[name]||0)})).sort((a,b)=>b.amount-a.amount),composter:garden.composter_data?{organicMatter:Number(garden.composter_data.organic_matter||0),fuel:Number(garden.composter_data.fuel_units||0),compost:Number(garden.composter_data.compost_items||0)}:null}}
function bestiaryStats(member){const kills=member.bestiary?.kills||{};const mobs=Object.entries(kills).filter(([id,value])=>id!=='last_killed_mob'&&typeof value==='number').map(([id,value])=>({id,name:titleCase(id.replace(/_\d+$/,'')),kills:Number(value)})).sort((a,b)=>b.kills-a.kills);return{unique:mobs.length,totalKills:mobs.reduce((sum,x)=>sum+x.kills,0),lastKilled:titleCase(kills.last_killed_mob||'Unknown'),mobs:mobs.slice(0,100)}}
function networthStats(profile,member,storage,loadouts,bazaar){const containers=[storage.inventory,storage.enderChest,storage.personalVault,...storage.backpacks.map(x=>x.items),...storage.bags.map(x=>x.items),...loadouts.armorSets.map(x=>x.items),...loadouts.equipmentSets.map(x=>x.items)];const values={inventory:0,storage:0,wardrobe:0};containers.forEach((items,index)=>{for(const item of items||[]){if(!item)continue;const price=Number(bazaar[item.id]?.quick_status?.sellPrice||0)*Number(item.count||1);if(index===0)values.inventory+=price;else if(index<3+storage.backpacks.length+storage.bags.length)values.storage+=price;else values.wardrobe+=price}});const purse=Number(first(member,['currencies.coin_purse','coin_purse'])),bank=Number(first(profile,['banking.balance']));return{purse,bank,...values,total:purse+bank+values.inventory+values.storage+values.wardrobe,note:'Liquid coins plus Bazaar-sellable items; auction-only items and pets are not priced.'}}
function collectionProgress(member,resources){const amounts=member.collection||{};let total=0,maxed=0,tiersCompleted=0,totalTiers=0;for(const category of Object.values(resources||{})){for(const [id,item] of Object.entries(category.items||{})){const tiers=item.tiers||[];if(!tiers.length)continue;total++;totalTiers+=tiers.length;const amount=Number(amounts[id]||0);const completed=tiers.filter(t=>amount>=Number(t.amountRequired||0)).length;tiersCompleted+=completed;if(completed===tiers.length)maxed++}}return{maxed,total,tiersCompleted,totalTiers,percent:totalTiers?Math.round(tiersCompleted/totalTiers*100):0}}
function recentActivity(member){const events=[];for(const run of Object.values(member.dungeons?.treasures?.runs||{})){if(run?.completion_ts)events.push({type:'dungeon',title:'Dungeon completed',detail:`${cleanName(run.dungeon_type||'Catacombs')} Floor ${run.dungeon_tier??'?'}`,timestamp:run.completion_ts})}for(const shard of member.shards?.owned||[]){if(shard?.captured)events.push({type:'shard',title:'Shard captured',detail:cleanName(String(shard.type||'Unknown').replaceAll('_',' ')),timestamp:shard.captured})}for(const [id,objective] of Object.entries(member.objectives||{})){const timestamp=objective?.completed_at||objective?.completedAt;if(timestamp)events.push({type:'objective',title:'Objective completed',detail:cleanName(id.replaceAll('_',' ')),timestamp})}return events.filter(x=>Number(x.timestamp)>0&&Number(x.timestamp)<Date.now()+300000).sort((a,b)=>b.timestamp-a.timestamp).slice(0,5)}
function ironpathStats(member,storage,loadouts,equipment){
  const counts={};
  const add=(id,count)=>{if(id&&Number(count)>0)counts[id]=(counts[id]||0)+Number(count)};
  const containers=[storage.inventory,storage.enderChest,storage.personalVault,...storage.backpacks.map(x=>x.items),...storage.bags.map(x=>x.items),equipment,...loadouts.armorSets.map(x=>x.items),...loadouts.equipmentSets.map(x=>x.items)];
  for(const items of containers)for(const item of items||[])if(item)add(item.id,item.count);
  for(const sack of storage.sacks||[])add(sack.id,sack.count);
  const processRoot=member.forge?.forge_processes||member.mining_core?.forge_processes||{};
  const processes=Object.values(processRoot).flatMap(group=>Object.entries(group||{})).map(([slot,process])=>{
    const id=String(process?.id||'UNKNOWN'),recipe=recipeById[id],startedAt=Number(process?.startTime||process?.start_time||0);
    return{slot,id,name:recipe?.name||itemName(id),startedAt,duration:recipe?.duration||0,finishesAt:startedAt&&recipe?.duration?startedAt+recipe.duration*1000:null};
  }).filter(x=>x.startedAt).sort((a,b)=>a.startedAt-b.startedAt);
  const core=member.mining_core||{};
  const icon=id=>`https://sky.shiiyu.moe/api/item/${encodeURIComponent(id)}`;
  return{counts,recipes:forgeRecipes.map(recipe=>({...recipe,icon:icon(recipe.id),ingredients:Object.entries(recipe.ingredients).map(([id,count])=>({id,name:itemName(id),count,icon:icon(id)}))})),processes,hotm:Number(core.nodes?.special_0||core.tier||0),sacksAvailable:Object.prototype.hasOwnProperty.call(member.inventory||{},'sacks_counts')||Object.prototype.hasOwnProperty.call(member,'sacks_counts')};
}
function shapeProfile(profile, uuid, username, count, collectionResources, garden, bazaar, election) {
  const member = memberOf(profile, uuid) || {};
  const skillNames = ['combat','farming','mining','foraging','fishing','enchanting','alchemy','taming'];
  const skills = {};
  for (const skill of skillNames) {
    const upper = skill.toUpperCase();
    const xp = Number(first(member, [`player_data.experience.SKILL_${upper}`, `experience_skill_${skill}`, `skill_experience.${skill}`]));
    const cap = skill === 'farming' ? 60 : (skill === 'taming' ? 60 : 60);
    skills[skill] = Math.min(cap, levelFromXp(xp, skillXp, cap));
  }
  const availableSkills = Object.values(skills).filter(Number.isFinite);
  const slayers = first(member, ['slayer.slayer_bosses','slayer_bosses'], {});
  const slayerXp = Object.values(slayers || {}).reduce((sum, boss) => sum + Number(boss?.xp || 0), 0);
  const cataXp = Number(first(member, ['dungeons.dungeon_types.catacombs.experience','dungeons.dungeon_types.CATACOMBS.experience']));
  const levelXp = Number(first(member, ['leveling.experience','player_data.leveling.experience']));
  const equipment=readEquipment(member),loadouts=readLoadouts(member),storage=readStorage(member);
  return {
    id: profile.profile_id,
    cuteName: profile.cute_name || 'Unnamed', selected: Boolean(profile.selected), username, uuid,
    profileCount: count,
    purse: Number(first(member, ['currencies.coin_purse','coin_purse'])),
    bank: Number(first(profile, ['banking.balance'])),
    skyblockLevel: levelXp / 100,
    skillAverage: availableSkills.length ? availableSkills.reduce((a,b)=>a+b,0) / availableSkills.length : 0,
    catacombs: levelFromXp(cataXp, dungeonXp), slayerXp, skills, equipment, loadouts, storage, collections: collectionProgress(member,collectionResources), activity: recentActivity(member),
    slayers:slayerStats(member),dungeonDetails:dungeonStats(member),pets:petStats(member),mining:miningStats(member),garden:gardenStats(member,garden),bestiary:bestiaryStats(member),networth:networthStats(profile,member,storage,loadouts,bazaar),accessories:accessoryStats(member,storage),mayor:election,ironpath:ironpathStats(member,storage,loadouts,equipment)
  };
}

async function getSkin(username){const player=await resolvePlayer(username);const sessionRes=await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${player.id}`);if(!sessionRes.ok)throw Object.assign(new Error('Skin profile unavailable.'),{status:502});const session=await sessionRes.json();const texture=session.properties?.find(x=>x.name==='textures');const skinUrl=texture&&JSON.parse(Buffer.from(texture.value,'base64').toString('utf8')).textures?.SKIN?.url;if(!skinUrl||new URL(skinUrl).hostname!=='textures.minecraft.net')throw Object.assign(new Error('This player has no custom skin.'),{status:404});const image=await fetch(skinUrl);if(!image.ok)throw Object.assign(new Error('Skin image unavailable.'),{status:502});return Buffer.from(await image.arrayBuffer())}
async function getAvatar(username){const player=await resolvePlayer(username);const image=await fetch(`https://mc-heads.net/avatar/${player.id}/72`);if(!image.ok)throw Object.assign(new Error('Player head unavailable.'),{status:502});return Buffer.from(await image.arrayBuffer())}

async function getProfile(username, requestedId, force=false) {
  if (!hypixelApiKey) throw Object.assign(new Error('Missing HYPIXEL_API_KEY. Add it to the .env file and restart the server.'), { status: 503 });
  const key = username.toLowerCase();
  let raw = cache.get(key);
  if (force || !raw || Date.now() - raw.time > CACHE_MS) {
    const player = await resolvePlayer(username);
    const {response:hypixel,data} = await fetchJsonWithRetry(`https://api.hypixel.net/v2/skyblock/profiles?uuid=${player.id}`, { headers: { 'API-Key': hypixelApiKey } });
    if (!hypixel.ok || !data.success) throw Object.assign(new Error(data.cause || `Hypixel returned ${hypixel.status}.`), { status: hypixel.status });
    raw = { time: Date.now(), player, profiles: data.profiles || [], rateLimit:{limit:hypixel.headers.get('ratelimit-limit'),remaining:hypixel.headers.get('ratelimit-remaining'),reset:hypixel.headers.get('ratelimit-reset')} }; cache.set(key, raw);
  }
  if (!raw.profiles.length) throw Object.assign(new Error('This player has no SkyBlock profiles.'), { status: 404 });
  const chosen = raw.profiles.find(p => p.profile_id === requestedId) || raw.profiles.find(p => p.selected) || raw.profiles[0];
  const [resources,garden,bazaar,election]=await Promise.all([getCollectionResources(),getGarden(chosen.profile_id),getBazaarResources(),getElectionResources()]);
  return { profile: shapeProfile(chosen, raw.player.id, raw.player.name, raw.profiles.length, resources,garden,bazaar,election), profiles: raw.profiles.map(p => ({ id:p.profile_id, cuteName:p.cute_name || 'Unnamed', selected:Boolean(p.selected) })),meta:{fetchedAt:raw.time,expiresAt:raw.time+CACHE_MS,rateLimit:raw.rateLimit||{}} };
}

const types = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml' };
function createServer(){return http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if(url.pathname.startsWith('/api/goals/')){const player=decodeURIComponent(url.pathname.slice(11)).toLowerCase();if(!/^[a-z0-9_]{1,16}$/.test(player))throw Object.assign(new Error('Invalid player.'),{status:400});const all=readGoals();if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({goals:all[player]||[]}))}if(req.method==='PUT'){const body=await readJsonBody(req),goals=Array.isArray(body.goals)?body.goals.slice(0,100).map(x=>({id:Number(x.id)||Date.now(),text:String(x.text||'').slice(0,80),done:Boolean(x.done)})).filter(x=>x.text):[];all[player]=goals;writeGoals(all);res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({goals}))}throw Object.assign(new Error('Method not allowed.'),{status:405})}
    if(url.pathname.startsWith('/api/notebook/')){const player=decodeURIComponent(url.pathname.slice(14)).toLowerCase();if(!/^[a-z0-9_]{1,16}$/.test(player))throw Object.assign(new Error('Invalid player.'),{status:400});const all=readNotebook();if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({notes:all[player]||[]}))}if(req.method==='PUT'){const body=await readJsonBody(req),notes=Array.isArray(body.notes)?body.notes.slice(0,100).map(x=>({id:Number(x.id)||Date.now(),title:String(x.title||'Untitled').slice(0,80),body:String(x.body||'').slice(0,20000),updated:Number(x.updated)||Date.now()})):[];all[player]=notes;writeNotebook(all);res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({notes}))}throw Object.assign(new Error('Method not allowed.'),{status:405})}
    if(url.pathname.startsWith('/api/ironpath/')){const player=decodeURIComponent(url.pathname.slice(14)).toLowerCase(),profile=String(url.searchParams.get('profile')||'default').replace(/[^a-zA-Z0-9-]/g,'').slice(0,64);if(!/^[a-z0-9_]{1,16}$/.test(player))throw Object.assign(new Error('Invalid player.'),{status:400});const all=readIronpath(),key=`${player}:${profile}`;if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({goals:all[key]||[]}))}if(req.method==='PUT'){const body=await readJsonBody(req),goals=Array.isArray(body.goals)?body.goals.slice(0,20).map(x=>({id:Number(x.id)||Date.now(),recipeId:String(x.recipeId||''),quantity:Math.max(1,Math.min(64,Number(x.quantity)||1))})).filter(x=>recipeById[x.recipeId]):[];all[key]=goals;writeIronpath(all);res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({goals}))}throw Object.assign(new Error('Method not allowed.'),{status:405})}
    if(url.pathname.startsWith('/api/skin/')){const username=decodeURIComponent(url.pathname.slice(10));if(!/^[A-Za-z0-9_]{1,16}$/.test(username))throw Object.assign(new Error('Invalid username.'),{status:400});const skin=await getSkin(username);res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public, max-age=3600'});return res.end(skin)}
    if(url.pathname.startsWith('/api/avatar/')){const username=decodeURIComponent(url.pathname.slice(12));if(!/^[A-Za-z0-9_]{1,16}$/.test(username))throw Object.assign(new Error('Invalid username.'),{status:400});const avatar=await getAvatar(username);res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public, max-age=3600'});return res.end(avatar)}
    if (url.pathname.startsWith('/api/profile/')) {
      const username = decodeURIComponent(url.pathname.slice('/api/profile/'.length));
      if (!/^[A-Za-z0-9_]{1,16}$/.test(username)) throw Object.assign(new Error('Enter a valid Minecraft username.'), { status:400 });
      const body = await getProfile(username, url.searchParams.get('profile'),url.searchParams.get('refresh')==='1');
      res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'private, max-age=60'}); return res.end(JSON.stringify(body));
    }
    const appRoutes=new Set(['/inventory','/ender-chest','/backpacks','/bags','/sacks','/wardrobe','/equipment','/loadouts','/slayer','/dungeons','/pets','/mining','/garden','/bestiary','/networth','/notebook','/accessories','/mayor','/ironpath']);
    const pathname = url.pathname === '/' || appRoutes.has(url.pathname) ? '/index.html' : url.pathname;
    const file = path.resolve(publicRoot, `.${pathname}`);
    if (!file.startsWith(publicRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res);
  } catch (error) {
    res.writeHead(error.status || 500, {'Content-Type':'application/json'}); res.end(JSON.stringify({ error:error.message || 'Unexpected server error.' }));
  }
});}

module.exports={createServer};
