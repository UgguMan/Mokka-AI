import mongoose from 'mongoose';
import {env,validateEnv} from '../server/src/config/env.js';
import {connectDB} from '../server/src/config/db.js';
import {Disease} from '../server/src/models/Disease.js';
import {taxonomy} from '../server/src/services/taxonomy.js';
import {localModelReady} from '../server/src/services/localClassifier.js';
try{
  validateEnv();
  console.log('Session secret: configured');
  console.log(`Gemini key: ${env.apiKey?'configured (not printed)':'missing — add GEMINI_API_KEY to the root .env'}`);
  console.log(`Model: ${env.model}`);
  console.log(`Taxonomy: ${taxonomy.length} classes`);
  console.log(`PlantDoc-trained classifier: ${localModelReady()?'ready':'not trained — run npm run train:model'}`);
  await connectDB();
  console.log('MongoDB: connected');
  console.log(`Reference library: ${await Disease.countDocuments()} entries`);
}catch(error){console.error('Setup check failed. Check JWT_SECRET and the MongoDB service/URI in .env.');process.exitCode=1;}
finally{await mongoose.disconnect();}
