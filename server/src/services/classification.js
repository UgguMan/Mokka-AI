import {predictLocally} from './localClassifier.js';
import {explain,GENERAL_ADVICE} from './gemini.js';
import {byLabel} from './taxonomy.js';
import {assessUnknown,validateFallback} from './geminiFallback.js';
export function createPipeline({predict=predictLocally,explainPrediction=explain,assessUnknownPrediction=assessUnknown}={}){
  return async function classify(input){
    const prediction=await predict(input);
    const match=byLabel.get(prediction.classLabel);
    const result={plantName:match?.plant || 'Not determined',diseaseName:match?.disease || 'Uncertain',
      classLabel:prediction.classLabel,scientificName:'',status:match?(match.isHealthy?'healthy':'disease_detected'):'uncertain',
      classifierAssessedCertainty:prediction.classifierAssessedCertainty,classifier:prediction.classifier,
      predictionSource:'plantdoc_local',visualSymptoms:[],recommendations:GENERAL_ADVICE,
      reasoningSummary:match?`The trained classifier matched this image to ${match.classLabel}. This is a tentative visual classification and needs expert verification.`:'The trained classifier could not make a sufficiently supported match. This does not prove the disease is absent from its datasets.'};
    if(!match){
      result.fallbackStatus='unavailable';
      try{
        result.geminiAssessment=validateFallback(await assessUnknownPrediction(input));
        result.fallbackStatus='gemini';
        result.explanationStatus='gemini_fallback';
        result.explanationNotice='The trained model abstained. Gemini’s separate assessment is tentative and has not been validated by the dataset classifier.';
      }catch(error){
        result.explanationStatus='unavailable';
        result.explanationNotice='Local result: uncertain. '+(error.status?error.message:'Gemini assessment is unavailable.');
        if(error.retryAfter)result.explanationRetryAfter=error.retryAfter;
      }
      return result;
    }
    try{
      const narrative=await explainPrediction({...input,prediction:{classLabel:result.classLabel,plantName:result.plantName,diseaseName:result.diseaseName,status:result.status}});
      // Only explicitly allowed narrative fields are copied. Identity always remains local.
      result.visualSymptoms=narrative.visualSymptoms;
      result.reasoningSummary=narrative.reasoningSummary;
      result.treatmentSummary=narrative.treatmentSummary;
      result.careSummary=narrative.careSummary;
      result.explanationStatus='gemini';
    }catch(error){result.explanationStatus='unavailable';result.explanationNotice='Local classification complete. '+(error.status?error.message:'Gemini explanation is unavailable.');if(error.retryAfter)result.explanationRetryAfter=error.retryAfter;}
    return result;
  };
}
export const classify=createPipeline();
