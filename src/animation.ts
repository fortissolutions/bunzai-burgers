export type Manifest = { count:number; width:number; height:number; fps:number; poster:string; frames:string; mobileFrames:string; stages:{explode:number;hold:number;reassemble:number}; source:string; rotationAvailable:boolean };
export const frameUrl = (manifest:Manifest,index:number,mobile=false) => `${mobile?manifest.mobileFrames:manifest.frames}/frame_${String(index+1).padStart(5,'0')}.webp`;
// Give the maximum separation room to breathe without creating duplicate assets.
export function frameAtProgress(progress:number,manifest:Manifest) {
  const p=Math.max(0,Math.min(1,progress));
  const stops=[[0,0],[.48,manifest.stages.hold],[.64,manifest.stages.hold],[1,manifest.count-1]];
  for(let i=1;i<stops.length;i++) if(p<=stops[i][0]) {
    const [a,f]=stops[i-1], [b,g]=stops[i];
    return Math.round(f+(g-f)*(p-a)/(b-a));
  }
  return manifest.count-1;
}
