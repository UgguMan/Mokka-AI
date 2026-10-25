import mongoose from 'mongoose';
import {env} from './env.js';
let connection;
export async function connectDB(){
  if(mongoose.connection.readyState===1) return mongoose.connection;
  connection ||= mongoose.connect(env.mongoUri,{serverSelectionTimeoutMS:10000,maxPoolSize:10,minPoolSize:0}).catch(error=>{connection=null;throw error;});
  return connection;
}
