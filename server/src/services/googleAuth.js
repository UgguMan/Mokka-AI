import {randomBytes} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {OAuth2Client} from 'google-auth-library';
import {env} from '../config/env.js';
import {AppError} from '../utils/errors.js';

const client=new OAuth2Client();
export function googleConfig(req,res){
  res.set('Cache-Control','no-store');
  if(!env.googleClientId)return res.json({enabled:false});
  const nonce=randomBytes(24).toString('hex');
  const challenge=jwt.sign({nonce},env.jwtSecret,{expiresIn:'5m',issuer:'mokka-ai',audience:'google-login',algorithm:'HS256'});
  res.json({enabled:true,clientId:env.googleClientId,nonce,challenge});
}
export async function verifyGoogleCredential({credential,challenge}){
  if(!env.googleClientId)throw new AppError(503,'Google sign-in is not available yet. Please use email and password.','GOOGLE_NOT_CONFIGURED');
  try{
    const expected=jwt.verify(challenge,env.jwtSecret,{issuer:'mokka-ai',audience:'google-login',algorithms:['HS256']});
    const ticket=await client.verifyIdToken({idToken:credential,audience:env.googleClientId});
    const payload=ticket.getPayload();
    if(!payload || payload.nonce!==expected.nonce || !payload.sub || payload.email_verified!==true || !payload.email)throw new Error('Invalid identity');
    return {sub:payload.sub,email:payload.email.toLowerCase(),name:String(payload.name || payload.email.split('@')[0]).replace(/[<>\u0000-\u001f]/g,' ').trim().slice(0,80) || 'Gardener'};
  }catch{
    throw new AppError(401,'Google sign-in could not be verified. Refresh the page and try again.','INVALID_GOOGLE_CREDENTIAL');
  }
}
