import {it,expect} from 'vitest';
import {validateExplanation} from '../src/services/gemini.js';
import {validateFallback} from '../src/services/geminiFallback.js';
import {createPipeline} from '../src/services/classification.js';
import {Analysis} from '../src/models/Analysis.js';
const care={treatmentSummary:'Confirm the cause before disease-specific treatment.',careSummary:'Monitor new growth and avoid prolonged leaf wetness.'};
it('requires bounded treatment and care summaries on both Gemini paths',()=>{
  const explanation={classLabel:'Apple leaf',visualSymptoms:[],reasoningSummary:'Tentative finding.',...care};
  const fallback={assessment:'uncertain',plantName:'',suspectedDisease:'',visualSymptoms:[],reasoningSummary:'More evidence needed.',...care};
  expect(validateExplanation(explanation,'Apple leaf').careSummary).toBe(care.careSummary);
  expect(validateFallback(fallback).careSummary).toBe(care.careSummary);
  expect(()=>validateExplanation({...explanation,treatmentSummary:''},'Apple leaf')).toThrow();
  expect(()=>validateFallback({...fallback,careSummary:'x'.repeat(1201)})).toThrow();
});
it.each([false,true])('preserves Gemini care through the pipeline and database schema: fallback=%s',async fallback=>{
  const result=await createPipeline({predict:async()=>({classLabel:fallback?'uncertain':'Apple leaf',classifierAssessedCertainty:'low'}),explainPrediction:async()=>({visualSymptoms:[],reasoningSummary:'Tentative finding.',...care}),assessUnknownPrediction:async()=>({assessment:'uncertain',plantName:'',suspectedDisease:'',visualSymptoms:[],reasoningSummary:'More evidence needed.',...care})})({});
  const saved=new Analysis({...result,user:'507f1f77bcf86cd799439011'});await saved.validate();
  const record=saved.toObject();expect((fallback?record.geminiAssessment:record).treatmentSummary).toBe(care.treatmentSummary);
  expect((fallback?record.geminiAssessment:record).careSummary).toBe(care.careSummary);
});
