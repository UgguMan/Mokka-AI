import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({path:fileURLToPath(new URL('../../../.env',import.meta.url)),quiet:true});
export const env = {
  port:Number(process.env.PORT || 5000), clientUrl:process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri:process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mokka_ai',
  jwtSecret:process.env.JWT_SECRET || '', apiKey:process.env.GEMINI_API_KEY || '',
  googleClientId:process.env.GOOGLE_CLIENT_ID || '',
  model:process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  timeout:Math.min(40000, Math.max(1000,Number(process.env.GEMINI_TIMEOUT_MS)||25000))
};
export function validateEnv(){
  if(env.jwtSecret.length<32 || env.jwtSecret.startsWith('replace-')) throw new Error('Set JWT_SECRET to a random secret of at least 32 characters in .env.');
}
