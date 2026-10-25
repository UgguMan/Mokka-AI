import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const read=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
const rows=async name=>(await readFile(new URL(name,root),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const [baseline,combined,oldRows,newRows]=await Promise.all([
  read('evaluation/baseline-full/metrics.json'),read('evaluation/combined-full/metrics.json'),
  rows('evaluation/baseline-full/predictions.jsonl'),rows('evaluation/combined-full/predictions.jsonl')
]);
const before=new Map(oldRows.map(r=>[r.id,r.actual]));
if(new Set(newRows.map(r=>r.id)).size!==before.size || newRows.some(r=>before.get(r.id)!==r.actual))throw new Error('The evaluated image IDs/ground truth differ; direct comparison is invalid.');
const percent=x=>(x*100).toFixed(2)+'%';
const text=`# Combined model comparison\n\nSame ${before.size} unique PlantDoc test images and ground truth for both models. No Gemini calls during evaluation.\n\n| Metric | PlantDoc baseline | Combined datasets |\n|---|---:|---:|\n| Accuracy (abstentions count as incorrect) | ${percent(baseline.accuracy)} | ${percent(combined.accuracy)} |\n| Coverage | ${percent(baseline.coverage)} | ${percent(combined.coverage)} |\n| Macro F1 | ${baseline.macroF1.toFixed(4)} | ${combined.macroF1.toFixed(4)} |\n| Correct predictions | ${baseline.correct} | ${combined.correct} |\n\nAccuracy change: ${((combined.accuracy-baseline.accuracy)*100).toFixed(2)} percentage points. This comparison measures the local classifier only, not Gemini fallback accuracy. Small, noisy benchmark; near-duplicates can remain. Not evidence of real-world diagnostic reliability.\n`;
await writeFile(new URL('evaluation/comparison.md',root),text);
console.log(text);
