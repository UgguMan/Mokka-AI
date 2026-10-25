import mongoose from 'mongoose';
import {env} from '../server/src/config/env.js';
import {connectDB} from '../server/src/config/db.js';

try{
  const match=env.mongoUri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?]+)/);
  const hosts=match?.[1].split(',').map(host=>host.split(':')[0]) || [];
  if(!hosts.length || !hosts.every(host=>host.endsWith('.mongodb.net'))){
    console.error('Atlas is not configured. Set MONGODB_URI privately in .env to the Atlas Drivers connection string.');
    process.exitCode=1;
  }else{
    await connectDB();
    await mongoose.connection.db.admin().command({ping:1});
    console.log('MongoDB Atlas: connected; ping passed. Credentials were not printed.');
  }
}catch{
  console.error('Atlas connection failed. Check the database user/password, IP access list, cluster status, and connection string.');
  process.exitCode=1;
}finally{await mongoose.disconnect();}
