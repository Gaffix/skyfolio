const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const manifest=require('./asset-manifest.json');
const bundles=new Map();
function assetBundle(root,type){
  const files=manifest[type].map(file=>path.join(root,file)),stamp=files.map(file=>fs.statSync(file).mtimeMs).join(':');
  const cached=bundles.get(type);if(cached?.stamp===stamp)return cached;
  const content=Buffer.from(files.map(file=>`/* ${path.basename(file)} */\n${fs.readFileSync(file,'utf8')}`).join(type==='js'?'\n;\n':'\n'));
  const result={stamp,content,gzip:zlib.gzipSync(content),etag:'"'+crypto.createHash('sha256').update(content).digest('hex').slice(0,24)+'"'};bundles.set(type,result);return result;
}
module.exports={assetBundle};
