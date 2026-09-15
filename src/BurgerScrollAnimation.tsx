import {useEffect,useRef,useState} from 'react';
import {frameAtProgress,type Manifest} from './animation';
import {useBurgerFrames} from './useBurgerFrames';
export default function BurgerScrollAnimation({base}:{base:string}) {
  const section=useRef<HTMLElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const [manifest,setManifest]=useState<Manifest|null>(null),[error,setError]=useState(false);
  const [enabled,setEnabled]=useState(false),[reduced,setReduced]=useState(false);
  const {cache,requested,loaded,failed,revision}=useBurgerFrames(manifest,enabled&&!reduced);
  useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(mq.matches);update();mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update);},[]);
  useEffect(()=>{let active=true;fetch(`${base}animations/burger/manifest.json`).then(r=>{if(!r.ok)throw Error();return r.json();}).then((m:Manifest)=>{if(active)setManifest({...m,frames:base+m.frames,mobileFrames:base+m.mobileFrames,poster:base+m.poster});}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[base]);
  useEffect(()=>{const observer=new IntersectionObserver(([e])=>setEnabled(e.isIntersecting),{rootMargin:'900px'});if(section.current)observer.observe(section.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{
    if(!manifest||reduced||!section.current||!canvas.current)return;
    const el=section.current,c=canvas.current,ctx=c.getContext('2d');if(!ctx){setError(true);return;}
    let raf=0,last=-1,lastWidth=0,lastHeight=0;
    function draw() {
      raf=0;const bounds=el.getBoundingClientRect(),viewport=el.querySelector('.burger-sticky')!.getBoundingClientRect();
      if(bounds.bottom<0||bounds.top>innerHeight)return;
      const p=Math.max(0,Math.min(1,-bounds.top/(el.offsetHeight-viewport.height)));
      const target=frameAtProgress(p,manifest!);requested.current=target;
      const keys=[...cache.current.keys()];if(!keys.length)return;
      const nearest=cache.current.has(target)?target:keys.reduce((a,b)=>Math.abs(b-target)<Math.abs(a-target)?b:a);
      const image=cache.current.get(nearest)!;
      const width=c.clientWidth,height=c.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
      if(last===nearest&&lastWidth===width&&lastHeight===height)return;
      last=nearest;lastWidth=width;lastHeight=height;
      c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);
      ctx!.setTransform(dpr,0,0,dpr,0,0);ctx!.clearRect(0,0,width,height);ctx!.imageSmoothingEnabled=true;ctx!.imageSmoothingQuality='high';
      const scale=Math.min(width/image.width,height/image.height);
      ctx!.drawImage(image,(width-image.width*scale)/2,(height-image.height*scale)/2,image.width*scale,image.height*scale);
      el.dataset.frame=String(nearest);el.dataset.target=String(target);el.style.setProperty('--progress',String(p));
      el.dataset.stage=p<.3?'assembled':p<.48?'separating':p<.64?'exploded':'reassembling';
    }
    const schedule=()=>{if(!raf)raf=requestAnimationFrame(draw);};
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
    const resize=new ResizeObserver(schedule);resize.observe(c);schedule();
    return()=>{cancelAnimationFrame(raf);resize.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
  },[manifest,reduced,revision,cache,requested]);
  return <section ref={section} id="product-animation" className={`burger-scroll ${reduced||error?'static-animation':''}`} aria-labelledby="animation-heading" data-stage="assembled">
    <div className="burger-sticky">
      <div className="section-topline"><span>01 / THE BUILD</span><span>NOTHING HERE BY ACCIDENT</span></div>
      <div className="animation-copy"><p className="eyebrow">FROM THE BUN UP</p><h2 id="animation-heading">Every layer.<br/><em>All flavour.</em></h2><p>A golden bun. A proper sear.<br/>{' '}The good stuff in between.</p></div>
      <div className="animation-visual">
        {(!loaded||reduced||error)&&<img className="animation-poster" src={manifest?.poster||`${base}animations/burger/poster.webp`} alt="Bunzai burger with a sesame bun, cheese, patty, tomato and lettuce"/>}
        {!reduced&&!error&&<canvas ref={canvas} aria-label="Burger separates into ingredients as you scroll, then reassembles" role="img"/>}
      </div>
      <div className="ingredient-notes" aria-hidden="true"><span>GOLDEN SESAME BUN</span><span>MELTED CHEESE</span><span>THE PERFECT SEAR</span><span>FRESH CRUNCH</span></div>
      <div className="animation-bottom"><span>{reduced?'EVERY LAYER MATTERS':error?'THE BUNZAI BUILD':'SCROLL TO BUILD YOUR APPETITE ↓'}</span><span aria-hidden="true" className="stage-label"><b className="stage-a">THE ORIGINAL</b><b className="stage-b">OPEN IT UP</b><b className="stage-c">EVERY LAYER MATTERS</b><b className="stage-d">BETTER TOGETHER</b></span></div>
      {!reduced&&enabled&&loaded===0&&!error&&<p className="loading-note" role="status">Preparing the good stuff…</p>}
      {failed&&loaded===0&&<p className="loading-note" role="status">Enjoy the view. The animation will be back shortly.</p>}
      <div className="scroll-meter" aria-hidden="true"><span/></div>
    </div>
  </section>;
}
