import {readFile} from 'node:fs/promises';
export async function readJsonl(path){try{const text=await readFile(path,'utf8');return text.split('\n').filter(Boolean).map((line,i)=>{try{return JSON.parse(line);}catch{throw new Error(`Invalid cache line ${i+1} in ${path}. Repair the interrupted line before resuming; nothing was sent.`);}});}catch(e){if(e.code==='ENOENT')return [];throw e;}}
