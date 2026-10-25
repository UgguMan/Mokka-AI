import {z} from 'zod';
import mongoose from 'mongoose';
import {AppError} from '../utils/errors.js';
const clean = max => z.string().max(max).transform(v=>v.replace(/[<>\u0000-\u001f]/g,' ').trim());
export const fieldsSchema=z.object({plantName:clean(100).optional().default(''),symptoms:clean(1000).optional().default(''),duration:clean(100).optional().default(''),observations:clean(1000).optional().default('')}).strict();
export const registerSchema=z.object({name:clean(80).pipe(z.string().min(2)),email:z.string().trim().email().max(254).toLowerCase(),password:z.string().min(8).max(72).refine(v=>Buffer.byteLength(v,'utf8')<=72,'Password must be at most 72 UTF-8 bytes.')}).strict();
export const loginSchema=registerSchema.omit({name:true});
export const googleLoginSchema=z.object({credential:z.string().min(1).max(12000),challenge:z.string().min(1).max(2000)}).strict();
export const validate = schema => (req,res,next)=>{try{req.body=schema.parse(req.body);next();}catch(e){next(e);}};
export function validId(req,res,next){if(!mongoose.isObjectIdOrHexString(req.params.id))return next(new AppError(400,'Invalid record ID.'));next();}
