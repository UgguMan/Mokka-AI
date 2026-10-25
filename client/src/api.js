import axios from 'axios';
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL || '/api',timeout:120000});
api.interceptors.request.use(config=>{const token=sessionStorage.getItem('mokka-token');if(token)config.headers.Authorization=`Bearer ${token}`;return config;});
api.interceptors.response.use(r=>r,error=>{if(error.response?.status===401 && !error.config.url.startsWith('/auth/')){sessionStorage.removeItem('mokka-token');window.dispatchEvent(new Event('mokka-session-expired'));}return Promise.reject(error);});
export const errorMessage=error=>{const detail=error.response?.data?.error;return (detail?.message || (error.code==='ECONNABORTED'?'This request took too long. Please try again.':'Could not connect. Check that the Mokka AI server is running.'))+(detail?.retryAfter?` Try again in at least ${detail.retryAfter} seconds.`:'');};
