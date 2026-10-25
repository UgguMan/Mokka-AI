import {useEffect,useRef,useState} from 'react';
import {api,errorMessage} from '../api';

let loader;
function loadGoogle(){
  if(window.google?.accounts?.id)return Promise.resolve();
  if(!loader)loader=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onload=()=>resolve();
    script.onerror=()=>{script.remove();loader=null;reject(new Error('Google sign-in could not load. Check your connection and try again.'));};
    document.head.appendChild(script);
  });
  return loader;
}

export default function GoogleLogin({onSuccess,onError,disabled=false}){
  const container=useRef(null),callbacks=useRef({onSuccess,onError,disabled});
  callbacks.current={onSuccess,onError,disabled};
  const [status,setStatus]=useState('loading'),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true,submitting=false;
    setStatus('loading');
    async function start(){
      try{
        const {data}=await api.get('/auth/google/config');
        if(!active)return;
        if(!data.enabled){setStatus('unavailable');return;}
        await loadGoogle();
        if(!active)return;
        window.google.accounts.id.initialize({client_id:data.clientId,nonce:data.nonce,auto_select:false,callback:async response=>{
          if(!active || submitting || callbacks.current.disabled)return;
          submitting=true;setStatus('signing');callbacks.current.onError('');
          try{
            const result=await api.post('/auth/google',{credential:response.credential,challenge:data.challenge});
            if(active)callbacks.current.onSuccess(result.data);
          }catch(error){if(active){callbacks.current.onError(errorMessage(error));setStatus('error');}}
          finally{submitting=false;}
        }});
        container.current.replaceChildren();
        window.google.accounts.id.renderButton(container.current,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',width:Math.min(350,container.current.clientWidth || 280)});
        setStatus('ready');
      }catch(error){if(active){setStatus('error');callbacks.current.onError(error.response?errorMessage(error):'Google sign-in could not load. Please try again.');}}
    }
    start();
    return()=>{active=false;};
  },[attempt]);
  return <div className="google-login" aria-busy={status==='loading'||status==='signing'}>
    <div ref={container} className={disabled||status!=='ready'?'google-button google-hidden':'google-button'}/>
    {status==='loading'&&<p className="small muted" role="status">Loading Google sign-in…</p>}
    {status==='signing'&&<p className="small muted" role="status">Signing you in…</p>}
    {status==='unavailable'&&<><button type="button" className="btn btn-outline full" disabled>Continue with Google</button><p className="small muted">Google sign-in is not available yet.</p></>}
    {status==='error'&&<button type="button" className="btn btn-outline full" onClick={()=>setAttempt(n=>n+1)}>Retry Google sign-in</button>}
    <div className="auth-divider">or use your email</div>
  </div>;
}
