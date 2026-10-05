import {useEffect,useState} from 'react';
export function useServerNow(){
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{let active=true,offset=0;const sync=()=>fetch('/api/health').then(r=>r.json()).then(d=>{if(d.now){offset=Date.parse(d.now)-Date.now();if(active)setNow(new Date(Date.now()+offset));}}).catch(()=>{});void sync();const timer=setInterval(()=>{setNow(new Date(Date.now()+offset));void sync();},60000);const focus=()=>void sync();window.addEventListener('focus',focus);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);};},[]);
  return now;
}
