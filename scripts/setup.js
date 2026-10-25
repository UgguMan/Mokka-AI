import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const file=new URL('../.env',import.meta.url);
if(existsSync(file)){console.log('.env already exists; no changes made.');}
else{const template=readFileSync(new URL('../.env.example',import.meta.url),'utf8');writeFileSync(file,template.replace('replace-with-a-random-secret-at-least-32-characters',randomBytes(48).toString('hex')));console.log('Created .env with a secure local JWT secret. Paste your Gemini key into GEMINI_API_KEY.');}
