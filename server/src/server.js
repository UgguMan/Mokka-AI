import app from './app.js';
import {env,validateEnv} from './config/env.js';
import {connectDB} from './config/db.js';
validateEnv();
try{await connectDB();console.log('MongoDB connected.');}catch{console.warn('MongoDB is unavailable. Start local MongoDB; API requests will reconnect automatically.');}
app.listen(env.port,process.env.HOST || '127.0.0.1',()=>console.log(`Mokka AI API: http://localhost:${env.port}`));
