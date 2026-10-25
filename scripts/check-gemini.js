// One live request using a public PlantDoc image; no database writes or secrets in output.
import {readFile,readdir} from 'node:fs/promises';
import {env} from '../server/src/config/env.js';
import {createExplainer} from '../server/src/services/gemini.js';
import {createFallback} from '../server/src/services/geminiFallback.js';
import {predictLocally} from '../server/src/services/localClassifier.js';
import sharp from 'sharp';
import {GoogleGenAI} from '@google/genai';

if(!env.apiKey){console.error('Gemini check: GEMINI_API_KEY is missing.');process.exitCode=1;}
else {
  try {
    const folder=new URL('../dataset/PlantDoc/test/Apple leaf/',import.meta.url);
    const filename=(await readdir(folder)).sort().find(name=>/\.(jpe?g|png|webp)$/i.test(name));
    if(!filename)throw new Error('NO_SAMPLE');
    const buffer=await sharp(await readFile(new URL(encodeURIComponent(filename),folder))).resize({width:768,height:768,fit:'inside',withoutEnlargement:true}).jpeg().toBuffer();
    const prediction=await predictLocally({buffer});
    const client=new GoogleGenAI({apiKey:env.apiKey,httpOptions:{timeout:env.timeout}});
    const generate=async request=>{try{return await client.models.generateContent(request);}catch(error){
      // Only diagnostic codes; provider error messages can contain sensitive URLs.
      const message=String(error.message || '').replaceAll(env.apiKey,'[REDACTED]').replace(/https?:\/\/\S+/g,'[URL]').replace(/AIza[\w-]+/g,'[REDACTED]').slice(0,400);
      console.error(JSON.stringify({providerErrorType:error.name,status:error.status,code:error.code,causeCode:error.cause?.code,diagnostic:message}));
      throw error;
    }};
    if(process.argv.includes('--fallback')){
      const assessment=await createFallback({generate,maxRetries:0})({buffer,mimeType:'image/jpeg',fields:{}});
      console.log(JSON.stringify({ok:true,mode:'fallback',model:env.model,assessment:assessment.assessment,hasExplanation:Boolean(assessment.reasoningSummary)}));
    }else{
      const explanation=await createExplainer({generate,maxRetries:0})({buffer,mimeType:'image/jpeg',fields:{},prediction});
      console.log(JSON.stringify({ok:true,model:env.model,localClass:prediction.classLabel,lockedLabelPreserved:explanation.classLabel===prediction.classLabel,hasExplanation:Boolean(explanation.reasoningSummary)}));
    }
  }catch(error){console.error(JSON.stringify({ok:false,code:error.code || 'CHECK_FAILED',message:error.status?error.message:'Could not complete the check. Inspect local dependencies and network access.'}));process.exitCode=1;}
}
