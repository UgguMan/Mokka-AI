import {Link,useParams} from 'react-router-dom';
import {Leaf,ArrowLeft,ArrowUpRight,Clock,ScanLine} from 'lucide-react';
import {useResource} from '../useResource';
import {PageHead,Loading,ErrorBox,Badge,Disclaimer,date} from '../components/UI';

export default function Result(){
  const {id}=useParams();
  const {data,error,loading,reload}=useResource(`/history/${id}`);
  const local=data?.predictionSource==='plantdoc_local';
  const care=data?.geminiAssessment || data;
  return <section className="container page">
    <Link className="text-link" to="/history"><ArrowLeft size={16}/> Back to history</Link>
    <PageHead eyebrow="YOUR PLANT HEALTH OBSERVATION" title="A closer look at your leaf." action={<Link className="btn btn-outline" to="/analyze">Analyze another <ArrowUpRight size={17}/></Link>}/>
    {loading?<Loading/>:error?<><ErrorBox message={error}/><button className="text-btn" onClick={reload}>Try again</button></>:data&&<>
      <div className="result-summary card">
        <span className="result-leaf"><Leaf size={43}/></span>
        <div><Badge status={data.status}/><h2>{data.plantName}</h2><p>{data.diseaseName}{data.scientificName&&<em> · {data.scientificName}</em>}</p></div>
        <div className="certainty"><strong>{data.classifierAssessedCertainty || data.modelAssessedCertainty} certainty</strong><small>{local?'Classifier-assessed':'Model-assessed'} certainty,<br/>not a statistical probability</small></div>
      </div>
      <div className="card result-meta">
        <div><small>Classification source</small><strong>{local?(data.classifier?.trainedOn || 'Model trained on PlantDoc'):'Legacy Gemini classification'}</strong></div>
        <div><small>Explanation source</small><strong>{data.explanationStatus==='gemini_fallback'?'Gemini · tentative additional assessment':data.explanationStatus==='gemini'?'Gemini':local?'Local summary · Gemini unavailable':'Gemini (legacy)'}</strong></div>
      </div>
      {data.explanationNotice&&<aside className="disclaimer"><p>{data.explanationNotice}{data.explanationRetryAfter?` Wait at least ${data.explanationRetryAfter} seconds before requesting another analysis.`:''}</p></aside>}
      {data.geminiAssessment&&<article className="card" aria-label="Tentative Gemini assessment">
        <p className="eyebrow">ADDITIONAL GEMINI ASSESSMENT · NOT CONFIRMED</p>
        <h2>{data.geminiAssessment.assessment==='suspected_disease'?`Possible ${data.geminiAssessment.suspectedDisease}`:data.geminiAssessment.assessment==='apparently_healthy'?'Leaf appears healthy':data.geminiAssessment.assessment==='not_a_leaf'?'A recognizable leaf is needed':'More evidence is needed'}</h2>
        {data.geminiAssessment.plantName&&<p>Suggested plant: {data.geminiAssessment.plantName}</p>}
        <p>{data.geminiAssessment.reasoningSummary}</p>
        <ul className="detail-list">{data.geminiAssessment.visualSymptoms.map((symptom,i)=><li key={i}>{symptom}</li>)}</ul>
        <small className="muted">This suggestion may be outside the supported disease classes. Dataset coverage is not verified; ask an agricultural expert before acting.</small>
      </article>}
      {(care?.treatmentSummary || care?.careSummary)&&<article className="card" aria-label="Gemini treatment and care summary">
        <p className="eyebrow">GEMINI SUMMARY · GUIDANCE FOR A TENTATIVE FINDING</p>
        <h3>Treatment / cure</h3><p>{care.treatmentSummary}</p>
        <h3>Ongoing care</h3><p>{care.careSummary}</p>
        <small className="muted">A cure is not guaranteed. Confirm the cause before disease-specific treatment.</small>
      </article>}
      <div className="result-grid">
        <article className="card"><h3><ScanLine size={19}/> {local?'Gemini’s visual observations':'What the model observed'}</h3>{data.visualSymptoms.length?<ul className="detail-list">{data.visualSymptoms.map((s,i)=><li key={i}>{s}</li>)}</ul>:<p className="muted">No Gemini visual explanation is available for this result.</p>}<h3>Understanding the classification</h3><p>{data.reasoningSummary}</p></article>
        <article className="card"><h3><Leaf size={19}/> Thoughtful next steps</h3><ol className="detail-list">{data.recommendations.map((s,i)=><li key={i}>{s}</li>)}</ol><small className="muted">General guidance, not a treatment prescription.</small></article>
      </div>
      <div className="card result-meta"><div><small>Matched PlantDoc class</small><strong>{data.classLabel}</strong></div><div><small><Clock size={13}/> Analyzed on</small><strong>{date(data.createdAt)}</strong></div><div><small>{local?'Dataset classifier':'Model'}</small><strong>{data.classifier?.name || data.model?.name}</strong></div></div>
      {(data.userSymptoms || data.observations || data.duration || data.userPlantName)&&<div className="card"><h3>Your observations</h3><p>{[data.userPlantName,data.userSymptoms,data.duration,data.observations].filter(Boolean).join(' · ')}</p></div>}
      <Disclaimer/>
    </>}
  </section>;
}
