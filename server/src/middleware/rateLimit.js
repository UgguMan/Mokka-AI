import {rateLimit} from 'express-rate-limit';
const make = (limit,windowMs)=>rateLimit({windowMs,limit,standardHeaders:'draft-8',legacyHeaders:false,handler(req,res){const retryAfter=Math.max(1,Math.ceil((req.rateLimit.resetTime-Date.now())/1000));res.set('Retry-After',String(retryAfter)).status(429).json({error:{code:'RATE_LIMIT',message:'Too many requests. Please wait before trying again.',retryAfter}});}});
export const authLimit=make(15,15*60*1000);
export const analyzeLimit=make(8,60*1000);
