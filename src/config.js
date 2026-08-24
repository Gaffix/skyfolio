const fs = require('node:fs');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(projectRoot, 'public');
function loadEnv(file) { if (!fs.existsSync(file)) return; for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const match=line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*)\s*$/); if(match&&!process.env[match[1]]) process.env[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2'); } }
loadEnv(path.join(projectRoot,'.env'));
module.exports={projectRoot,publicRoot,port:Number(process.env.PORT||5173),profileCacheMs:5*60*1000,get hypixelApiKey(){return process.env.HYPIXEL_API_KEY}};
