import React,{Component} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,Link} from 'react-router-dom';
import {AuthProvider,Protected} from './auth';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Analyze from './pages/Analyze';
import Result from './pages/Result';
import History from './pages/History';
import Dashboard from './pages/Dashboard';
import Diseases from './pages/Diseases';
import About from './pages/About';
import './styles.css';
class ErrorBoundary extends Component{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="container page"><h1>Let’s try that again.</h1><p>This page encountered an unexpected problem.</p><button className="btn" onClick={()=>window.location.reload()}>Reload page</button></div>:this.props.children;}}
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><BrowserRouter><AuthProvider><Routes><Route element={<Layout/>}><Route index element={<Landing/>}/><Route path="login" element={<Auth/>}/><Route path="register" element={<Auth register/>}/><Route path="analyze" element={<Protected><Analyze/></Protected>}/><Route path="result/:id" element={<Protected><Result/></Protected>}/><Route path="history" element={<Protected><History/></Protected>}/><Route path="dashboard" element={<Protected><Dashboard/></Protected>}/><Route path="diseases" element={<Diseases/>}/><Route path="about" element={<About/>}/><Route path="*" element={<div className="container page"><h1>This path hasn’t grown yet.</h1><Link to="/">Return home</Link></div>}/></Route></Routes></AuthProvider></BrowserRouter></ErrorBoundary></React.StrictMode>);
