import {useState} from 'react';
import {NavLink,Outlet,Link,useNavigate} from 'react-router-dom';
import {Menu,X,ArrowUpRight,LogOut} from 'lucide-react';
import {Brand} from './UI';
import {useAuth} from '../auth';
export default function Layout(){
  const {user,logout}=useAuth(),[open,setOpen]=useState(false),navigate=useNavigate();
  return <><a className="skip" href="#main">Skip to content</a><header className="site-header"><div className="nav-wrap"><Brand/><button className="mobile-toggle icon-btn" aria-label="Toggle menu" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><nav className={open?'nav open':'nav'} onClick={()=>setOpen(false)} aria-label="Main navigation"><NavLink to="/" end>Home</NavLink><NavLink to="/analyze">Analyze</NavLink><NavLink to="/diseases">Plant library</NavLink><NavLink to="/about">Our approach</NavLink>{user&&<><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/history">History</NavLink></>}</nav><div className="nav-action">{user?<button className="text-btn" onClick={()=>{logout();navigate('/');}} aria-label="Sign out"><LogOut size={17}/><span>Sign out</span></button>:<Link className="btn btn-small" to="/login">Get started <ArrowUpRight size={16}/></Link>}</div></div></header><main id="main"><Outlet/></main><footer><div><Brand/><p>A little clarity for every leaf.</p></div><p>Built for learning. Rooted in curiosity.<br/><Link to="/about">Research project · PlantDoc + Gemini</Link></p><span className="footer-note">Care starts with observation.</span></footer></>;
}
