"""Repeatable source-native frame extraction and neutral-studio background masking.
Usage: python scripts/prepare-burger-animation.py --input "path/to/burger herol.mp4"
Dependencies: pillow numpy opencv-python-headless imageio-ffmpeg.
The matte is specifically calibrated to this source, not arbitrary backgrounds.
"""
import argparse,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.animation-tools'))
import cv2,numpy as np
from PIL import Image,ImageDraw
import imageio_ffmpeg

def matte(rgb):
    # Neutral backdrop/table have very little chroma. Keep coloured food regions,
    # fill their internal holes (seeds/highlights), and discard detached crumbs.
    delta=rgb.max(2).astype(float)-rgb.min(2)
    seed=(delta>24).astype('uint8')*255
    h,w=seed.shape
    seed[:, :int(w*.18)]=0;seed[:,int(w*.85):]=0
    # The bun is broad and strongly coloured; its table reflection is narrow
    # and desaturated. Cut below the last broad, saturated food row.
    strong=(delta>60)&(seed>0)
    row_width=strong.sum(axis=1)
    widest=max(row_width)
    broad=np.where(row_width>widest*.56)[0]
    if len(broad):seed[int(broad[-1])+3:]=0
    seed=cv2.morphologyEx(seed,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    contours,_=cv2.findContours(seed,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    mask=np.zeros_like(seed)
    for contour in contours:
        area=cv2.contourArea(contour);x,y,cw,ch=cv2.boundingRect(contour)
        if area>180 and x+cw>w*.28 and x<w*.72:
            cv2.drawContours(mask,[contour],-1,255,-1)
    if len(broad):
        lower=np.indices(mask.shape)[0]>int(broad[-1])-18
        mask[lower & (delta<45)]=0
    mask=cv2.GaussianBlur(mask,(3,3),.55)
    return mask

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);args=ap.parse_args()
    source=pathlib.Path(args.input)
    if not source.is_file():raise SystemExit('Input video does not exist')
    output=root/'public/animations/burger';output.mkdir(parents=True,exist_ok=True)
    for folder in ('frames','mobile'): (output/folder).mkdir(exist_ok=True)
    report=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-i',str(source)],capture_output=True,text=True).stderr
    (root/'qa/video-metadata.txt').write_text(report,encoding='utf8')
    cap=cv2.VideoCapture(str(source));fps=cap.get(cv2.CAP_PROP_FPS);count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if not fps or not count:raise SystemExit('Unreadable source')
    frames=[];boxes=[]
    while True:
        ok,bgr=cap.read()
        if not ok:break
        rgb=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB);alpha=matte(rgb)
        ys,xs=np.where(alpha>127)
        if len(xs)==0:raise SystemExit('Mask failed: empty foreground')
        boxes.append((int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)))
        frames.append(np.dstack([rgb,alpha]))
    cap.release()
    # The source's opening shot clips both buns. Its clean closing passage is
    # 56..120: exploded to assembled. Build ONE assembled/open/assembled sequence
    # from those native frames; browser reverse scrolling uses this same sequence.
    native_indices=list(range(len(frames)-1,55,-1))+list(range(57,len(frames)))
    frames=[frames[i] for i in native_indices];boxes=[boxes[i] for i in native_indices]
    # Normalize the changing camera zoom by ingredient width. Smooth the scale
    # across neighboring frames to avoid segmentation-driven size flicker.
    widths=np.array([b[2]-b[0] for b in boxes],float)
    smooth=np.convolve(np.pad(widths,(4,4),mode='edge'),np.ones(9)/9,mode='valid')
    scaledHeights=np.array([(b[3]-b[1])/w for b,w in zip(boxes,smooth)])
    size=(760,920);foodWidth=min(580,820/scaledHeights.max())
    selected={0,24,48,64,80,104,128};sheet=Image.new('RGB',(350*4,410*2),'#050b2e');d=ImageDraw.Draw(sheet);slot=0
    maxIndex=int(np.argmax(scaledHeights))
    for i,(rgba,box,width) in enumerate(zip(frames,boxes,smooth)):
        x0,y0,x1,y1=box;im=Image.fromarray(rgba).crop(box)
        scale=foodWidth/width;im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
        stage=Image.new('RGBA',size);stage.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
        stage.save(output/'frames'/f'frame_{i+1:05d}.webp',quality=88,method=5)
        stage.resize((456,552),Image.Resampling.LANCZOS).save(output/'mobile'/f'frame_{i+1:05d}.webp',quality=83,method=5)
        if i in selected:
            thumb=stage.copy();thumb.thumbnail((330,380));xx=(slot%4)*350;yy=(slot//4)*410;sheet.paste(thumb,(xx,yy),thumb);d.text((xx+8,yy+385),f'Frame {i}',fill='white');slot+=1
    # Last assembled frame is completely visible, unlike the source's first shot.
    last=Image.open(output/'frames'/f'frame_{len(frames):05d}.webp');last.save(output/'poster.webp',quality=92)
    Image.open(output/'frames'/f'frame_{maxIndex+1:05d}.webp').save(output/'exploded.webp',quality=92)
    sheet.save(root/'qa/matte-contact-sheet.jpg',quality=95)
    manifest={'count':len(frames),'width':size[0],'height':size[1],'fps':fps,'source':source.name,'sourceFrameCount':count,'sourceFrameIndices':native_indices,'poster':'animations/burger/poster.webp','frames':'animations/burger/frames','mobileFrames':'animations/burger/mobile','rotationAvailable':False,'stages':{'explode':24,'hold':maxIndex,'reassemble':90}}
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2))
    total=sum(p.stat().st_size for p in output.rglob('*.webp'))
    print(json.dumps({'frames':len(frames),'fps':fps,'maxExploded':maxIndex,'sizeMB':round(total/1e6,2)},indent=2))
if __name__=='__main__':main()
