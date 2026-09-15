import {useState} from 'react';
/** Mount only when a complete, ordered, real-angle rotation asset is supplied. */
export default function TurntableViewer({frames,alt}:{frames:string[];alt:string}){
  const [index,setIndex]=useState(0);
  if(frames.length<2)return null;
  return <div className="turntable-viewer"><img src={frames[index]} alt={alt}/><label>Rotate the burger<input type="range" min={0} max={frames.length-1} value={index} onChange={e=>setIndex(Number(e.target.value))} aria-valuetext={`${Math.round(index/frames.length*360)} degrees`}/></label></div>;
}
