import jwt from 'jsonwebtoken';
import {env} from '../config/env.js';
import {User} from '../models/User.js';
import {AppError,asyncRoute} from '../utils/errors.js';
export const auth=asyncRoute(async(req,res,next)=>{
  const token=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if(!token)throw new AppError(401,'Please sign in to continue.','UNAUTHORIZED');
  let payload;try{payload=jwt.verify(token,env.jwtSecret,{algorithms:['HS256'],issuer:'mokka-ai',audience:'mokka-web'});}catch{throw new AppError(401,'Your session has expired. Please sign in again.','UNAUTHORIZED');}
  const user=await User.findById(payload.sub);
  if(!user)throw new AppError(401,'Please sign in again.','UNAUTHORIZED');
  req.user=user;next();
});
