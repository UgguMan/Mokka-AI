import {ArrowUpRight,Leaf,AlertCircle,LoaderCircle} from 'lucide-react';
import {Link} from 'react-router-dom';
export const date=value=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
export function Brand(){return <Link to="/" className="brand" aria-label="Mokka AI home"><span className="brand-icon"><Leaf size={22}/></span>Mokka<span className="brand-ai">AI</span></Link>;}
export function PageHead({eyebrow,title,description,action}){return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description&&<p className="muted">{description}</p>}</div>{action}</div>;}
export function ErrorBox({message}){return message?<div role="alert" className="error"><AlertCircle size={19}/><span>{message}</span></div>:null;}
export function Loading(){return <div className="loading" role="status"><LoaderCircle className="spin"/> Growing a little clarity…</div>;}
export function Empty({title,children}){return <div className="empty"><Leaf size={34}/><h3>{title}</h3><p>{children}</p></div>;}
export function Badge({status}){return <span className={`badge ${status}`}>{({healthy:'Healthy',disease_detected:'Signs of disease',uncertain:'Uncertain',unsupported_plant:'Outside taxonomy'})[status] || status}</span>;}
export function Disclaimer(){return <aside className="disclaimer"><Leaf size={20}/><p><strong>A starting point, not a diagnosis.</strong> Image-based AI can be wrong. Verify findings with a local agricultural expert before deciding on treatment.</p></aside>;}
export function RecordList({items}){return <div className="record-list">{items.map(item=><Link className="record" to={`/result/${item._id}`} key={item._id}><span className="record-icon"><Leaf size={20}/></span><span className="record-main"><strong>{item.plantName}</strong><small>{item.diseaseName} · {date(item.createdAt)}</small></span><Badge status={item.status}/><ArrowUpRight size={19}/></Link>)}</div>;}
