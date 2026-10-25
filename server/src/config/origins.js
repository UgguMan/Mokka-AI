import {env} from './env.js';

export function isAllowedOrigin(origin){
  if(!origin)return false;
  if(origin===env.clientUrl)return true;
  if(process.env.NODE_ENV==='production')return false;
  try{
    const configured=new URL(env.clientUrl);
    const incoming=new URL(origin);
    const loopback=['localhost','127.0.0.1','[::1]'];
    return incoming.origin===origin && loopback.includes(configured.hostname) &&
      loopback.includes(incoming.hostname) && configured.protocol===incoming.protocol &&
      configured.port===incoming.port;
  }catch{return false;}
}
