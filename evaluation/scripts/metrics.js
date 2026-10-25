export function computeMetrics(predictions,labels){
  const columns=[...labels,'uncertain/unsupported'];
  const matrix=Object.fromEntries(labels.map(label=>[label,Object.fromEntries(columns.map(c=>[c,0]))]));
  let correct=0,classified=0;
  for(const p of predictions){if(!labels.includes(p.actual))throw new Error(`Unknown ground truth: ${p.actual}`);const predicted=labels.includes(p.predicted)?p.predicted:'uncertain/unsupported';matrix[p.actual][predicted]++;if(predicted===p.actual)correct++;if(predicted!=='uncertain/unsupported')classified++;}
  const perClass=labels.map(label=>{const tp=matrix[label][label],support=Object.values(matrix[label]).reduce((a,b)=>a+b,0),predicted=labels.reduce((sum,actual)=>sum+matrix[actual][label],0);const precision=predicted?tp/predicted:0,recall=support?tp/support:0;return {classLabel:label,support,precision,recall,f1:precision+recall?2*precision*recall/(precision+recall):0};});
  const evaluated=perClass.filter(c=>c.support>0);
  return {total:predictions.length,correct,accuracy:predictions.length?correct/predictions.length:0,coverage:predictions.length?classified/predictions.length:0,macroF1:evaluated.length?evaluated.reduce((s,c)=>s+c.f1,0)/evaluated.length:0,macroF1Definition:'Unweighted mean over classes with test support; zero-support classes excluded.',classesWithSupport:evaluated.length,zeroSupportClasses:perClass.filter(c=>!c.support).map(c=>c.classLabel),perClass,columns,confusionMatrix:matrix};
}
