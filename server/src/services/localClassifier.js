import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {classLabels} from './taxonomy.js';
import {AppError} from '../utils/errors.js';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const python=process.env.PYTHON_PATH || fileURLToPath(new URL(process.platform==='win32'?'../../../.venv/Scripts/python.exe':'../../../.venv/bin/python',import.meta.url));
const modelFile=new URL('../../../ml/artifacts/model.json',import.meta.url);
export const localModelReady=()=>existsSync(modelFile) && existsSync(python);
export const localPredictionSchema=z.object({classLabel:z.enum([...classLabels,'uncertain']),classifierAssessedCertainty:z.enum(['low','medium','high']),classifier:z.object({name:z.string(),version:z.string(),trainedOn:z.string().min(1).max(300)}),abstentionReason:z.string()});
let running=0;
export async function predictLocally({buffer}){
  if(!localModelReady())throw new AppError(503,'The PlantDoc classifier needs to be trained first. Run npm run train:model.','MODEL_NOT_TRAINED');
  if(running>=2)throw new AppError(429,'The local classifier is busy. Please try again shortly.','LOCAL_BUSY',10);
  running++;
  try{return await new Promise((resolve,reject)=>{
    const child=spawn(python,['ml/predict.py'],{cwd:root,stdio:['pipe','pipe','ignore'],windowsHide:true});
    let output='',done=false;
    const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(result);};
    const timer=setTimeout(()=>{child.kill();finish(new AppError(504,'The local classifier took too long. Please try again.','LOCAL_TIMEOUT'));},45000);
    child.on('error',()=>finish(new AppError(503,'Could not start the local classifier. Check Python dependencies.','LOCAL_UNAVAILABLE')));
    child.stdout.on('data',chunk=>{output+=chunk.toString();if(output.length>32768){child.kill();finish(new AppError(502,'The local model returned an invalid response.','LOCAL_INVALID_OUTPUT'));}});
    child.stdin.on('error',()=>{});
    child.on('close',code=>{if(done)return;try{if(code!==0)throw new Error();finish(null,localPredictionSchema.parse(JSON.parse(output)));}catch{finish(new AppError(503,'The local model could not analyze this image. Check training artifacts and dependencies.','LOCAL_FAILED'));}});
    child.stdin.end(JSON.stringify({image:buffer.toString('base64')}));
  });}finally{running--;}
}
