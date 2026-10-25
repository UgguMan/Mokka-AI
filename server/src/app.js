import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import {env} from './config/env.js';
import {isAllowedOrigin} from './config/origins.js';
import {connectDB} from './config/db.js';
import {routes} from './routes/index.js';
import {AppError,asyncRoute} from './utils/errors.js';
import {errorHandler} from './middleware/errorHandler.js';
import {localModelReady} from './services/localClassifier.js';
import {googleConfig} from './services/googleAuth.js';
export function createApp(options={}){
  const app=express();app.disable('x-powered-by');app.use(helmet());
  app.use(cors({origin(origin,cb){const allowed=!origin || isAllowedOrigin(origin);cb(allowed?null:new AppError(403,'This origin is not allowed.'),allowed);}}));
  app.use(express.json({limit:'16kb'}));
  app.get('/api/auth/google/config',googleConfig);
  app.get('/api/health',(req,res)=>res.json({name:'Mokka AI',database:mongoose.connection.readyState===1?'connected':'disconnected',aiConfigured:Boolean(env.apiKey),localModelReady:localModelReady()}));
  app.use('/api',asyncRoute(async(req,res,next)=>{await connectDB();next();}),routes(options));
  app.use((req,res,next)=>next(new AppError(404,'Endpoint not found.')));app.use(errorHandler);return app;
}
export default createApp();
