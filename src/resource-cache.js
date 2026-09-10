// Share concurrent requests and retain the last successful value during outages.
class ResourceCache {
  constructor({now=Date.now,max=1000,retryMs=30000}={}){this.entries=new Map();this.now=now;this.max=max;this.retryMs=retryMs;}
  peek(key){return this.entries.get(key);}
  status(key){const e=this.peek(key);return {state:!e?.time?'unavailable':e.error?'stale':e.cached?'cached':'live',fetchedAt:e?.time||null,error:e?.error||null};}
  async get(key,ttl,loader){
    let e=this.peek(key);
    if(e?.pending)return e.pending;
    if(e&&this.now()<e.retryAt){if(e.time)return e.value;throw new Error(e.error);}
    if(e?.time&&this.now()-e.time<ttl){e.cached=true;return e.value;}
    if(!e){e={};this.entries.set(key,e);}
    e.pending=(async()=>{try{const value=await Promise.resolve().then(loader);Object.assign(e,{value,time:this.now(),error:null,retryAt:0,cached:false});return value;}catch(error){e.error=error.message||'Source unavailable';e.retryAt=this.now()+this.retryMs;if(e.time)return e.value;throw error;}finally{delete e.pending;for(const [id,item] of this.entries){if(this.entries.size<=this.max)break;if(!item.pending)this.entries.delete(id);}}})();
    return e.pending;
  }
}
module.exports={ResourceCache};
