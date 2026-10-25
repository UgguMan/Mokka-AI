import {createContext,useContext,useEffect,useState} from 'react';
import {Navigate,useLocation} from 'react-router-dom';
import {api} from './api';
const AuthContext=createContext(null);
export function AuthProvider({children}){
  const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;if(sessionStorage.getItem('mokka-token'))api.get('/auth/me').then(r=>{if(active)setUser(r.data.user);}).catch(()=>{sessionStorage.removeItem('mokka-token');}).finally(()=>{if(active)setLoading(false);});else setLoading(false);const expired=()=>setUser(null);window.addEventListener('mokka-session-expired',expired);return()=>{active=false;window.removeEventListener('mokka-session-expired',expired);};},[]);
  const login=data=>{sessionStorage.setItem('mokka-token',data.token);setUser(data.user);};
  const logout=()=>{sessionStorage.removeItem('mokka-token');setUser(null);};
  return <AuthContext.Provider value={{user,loading,login,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
export function Protected({children}){const {user,loading}=useAuth(),location=useLocation();if(loading)return <div className="loading" role="status">Opening your workspace…</div>;return user?children:<Navigate to="/login" state={{from:location.pathname}} replace/>;}
