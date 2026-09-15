import {useEffect,useRef,useState} from 'react';
import {frameUrl,type Manifest} from './animation';
// Keep only a bounded window decoded; HTTP cache makes revisiting frames cheap.
export function useBurgerFrames(manifest:Manifest|null,enabled:boolean) {
 const cache=useRef(new Map<number,HTMLImageElement>()),requested=useRef(0);
 const [loaded,setLoaded]=useState(0),[failed,setFailed]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!manifest||!enabled)return;
  const sequence=manifest,mobile=matchMedia('(max-width: 700px)').matches;
  const limit=mobile?24:40,radius=mobile?9:16;
  const inflight=new Set<number>(),bad=new Set<number>();let stopped=false,timer=0;
  function candidates(){const center=requested.current;return Array.from({length:sequence.count},(_,i)=>i).filter(i=>Math.abs(i-center)<=radius&&!cache.current.has(i)&&!inflight.has(i)&&!bad.has(i)).sort((a,b)=>Math.abs(a-center)-Math.abs(b-center));}
  function trim(){const keys=[...cache.current.keys()].sort((a,b)=>Math.abs(b-requested.current)-Math.abs(a-requested.current));while(cache.current.size>limit)cache.current.delete(keys.shift()!);}
  async function load(index:number){
   inflight.add(index);let success=false;
   for(let attempt=0;attempt<2&&!stopped;attempt++){
    const img=new Image();img.decoding='async';img.src=frameUrl(sequence,index,mobile);
    try{await img.decode();if(!stopped){cache.current.set(index,img);success=true;}break;}catch{/* Retry temporary fetch/decode failures once. */}
   }
   inflight.delete(index);if(stopped)return;if(!success){bad.add(index);setFailed(true);}
   trim();setLoaded(cache.current.size);setRevision(v=>v+1);pump();
  }
  function pump(){if(stopped)return;const queue=candidates();while(inflight.size<3&&queue.length)void load(queue.shift()!);}
  function schedule(){clearTimeout(timer);timer=window.setTimeout(pump,40);}
  window.addEventListener('scroll',schedule,{passive:true});pump();
  return()=>{stopped=true;clearTimeout(timer);window.removeEventListener('scroll',schedule);};
 },[manifest,enabled]);
 return {cache,requested,loaded,failed,revision};
}
