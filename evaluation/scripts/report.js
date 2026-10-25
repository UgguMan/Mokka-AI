import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {taxonomy} from '../../server/src/services/taxonomy.js';
import {computeMetrics} from './metrics.js';
import {readJsonl} from './cache.js';
const argIndex=process.argv.indexOf('--results-dir');
const directory=argIndex<0?new URL('../results/',import.meta.url):pathToFileURL(path.resolve(process.argv[argIndex+1])+path.sep);
export async function writeReport(){
  await mkdir(directory,{recursive:true});
  const records=await readJsonl(new URL('predictions.jsonl',directory));
  if(!records.length){console.log('No evaluation predictions yet. No metrics were fabricated.');return;}
  const unique=new Map(records.map(r=>[r.id,r]));
  const metrics=computeMetrics([...unique.values()],taxonomy.map(t=>t.classLabel));
  const failures=await readJsonl(new URL('failures.jsonl',directory));
  const attempts=await readJsonl(new URL('attempts.jsonl',directory));
  const metadata={...metrics,generatedAt:new Date().toISOString(),models:[...new Set(records.map(r=>r.model))],failedOrSkipped:failures.length,attemptedUniqueImages:new Set(attempts.map(r=>r.id)).size};
  await writeFile(new URL('metrics.json',directory),JSON.stringify(metadata,null,2));
  const csv=value=>'"'+String(value).replaceAll('"','""')+'"';
  await writeFile(new URL('confusion_matrix.csv',directory),[['Actual / Predicted',...metrics.columns],...taxonomy.map(t=>[t.classLabel,...metrics.columns.map(c=>metrics.confusionMatrix[t.classLabel][c])])].map(row=>row.map(csv).join(',')).join('\n'));
  const pct=n=>(100*n).toFixed(2)+'%';
  await writeFile(new URL('report.md',directory),`# Mokka AI evaluation\n\nGenerated: ${metadata.generatedAt}\n\nSuccessful unique predictions: ${metrics.total}\n\nAccuracy: ${pct(metrics.accuracy)}\n\nCoverage (non-abstained / successful predictions): ${pct(metrics.coverage)}\n\nMacro F1: ${metrics.macroF1.toFixed(4)}\n\n${metrics.macroF1Definition}\n\nFailed/skipped log entries: ${failures.length}. Failed or skipped images are excluded from classification metrics; review failures.jsonl for selection bias.\n\nClasses without test support in this run: ${metrics.zeroSupportClasses.join(', ')}\n\nModels: ${metadata.models.join(', ')}\n\n| Class | Support | Precision | Recall | F1 |\n|---|---:|---:|---:|---:|\n${metrics.perClass.map(c=>`| ${c.classLabel} | ${c.support} | ${c.precision.toFixed(4)} | ${c.recall.toFixed(4)} | ${c.f1.toFixed(4)} |`).join('\n')}\n\nThe classification head uses frozen ImageNet-pretrained MobileNetV3 features. See the named model and its model.json trainingDatasets metadata for the training sources. Validation chose the abstention thresholds; test images were not used for fitting. Exact-byte test overlap with training/validation was excluded. Near-duplicate images and pretraining overlap may still bias performance. Gemini was not called during evaluation. Class certainty is not a calibrated probability.\n`);
  console.log(`Wrote metrics, confusion matrix and report for ${metrics.total} predictions.`);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)await writeReport();
