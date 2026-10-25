import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {User} from '../models/User.js';
import {env} from '../config/env.js';
import {isAllowedOrigin} from '../config/origins.js';
import {AppError} from '../utils/errors.js';
import {verifyGoogleCredential} from '../services/googleAuth.js';
const publicUser=user=>({id:user.id,name:user.name,email:user.email});
const session=user=>({user:publicUser(user),token:jwt.sign({},env.jwtSecret,{subject:user.id,expiresIn:'1h',issuer:'mokka-ai',audience:'mokka-web',algorithm:'HS256'})});
export async function register(req,res){const {name,email,password}=req.body;const user=await User.create({name,email,passwordHash:await bcrypt.hash(password,12)});res.status(201).json(session(user));}
export async function login(req,res){const user=await User.findOne({email:req.body.email}).select('+passwordHash');if(!user?.passwordHash || !await bcrypt.compare(req.body.password,user.passwordHash))throw new AppError(401,'Email or password is incorrect.','INVALID_CREDENTIALS');res.json(session(user));}
export const googleLogin=(verify=verifyGoogleCredential)=>async(req,res)=>{
  // Browser login is JSON-only and must originate from the configured app.
  if(!isAllowedOrigin(req.get('origin')) || !req.is('application/json'))throw new AppError(403,'Google sign-in must start from this application.','INVALID_LOGIN_ORIGIN');
  const identity=await verify(req.body);
  let user=await User.findOne({googleSub:identity.sub});
  if(!user){
    if(await User.exists({email:identity.email}))throw new AppError(409,'An account already uses this email. Sign in with your existing password.','ACCOUNT_EXISTS');
    try{user=await User.create({name:identity.name,email:identity.email,googleSub:identity.sub});}
    catch(error){
      if(error.code!==11000)throw error;
      user=await User.findOne({googleSub:identity.sub});
      if(!user)throw new AppError(409,'An account already uses this email. Sign in with your existing password.','ACCOUNT_EXISTS');
    }
  }
  res.json(session(user));
};
export function me(req,res){res.json({user:publicUser(req.user)});}
