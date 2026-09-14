"""Refine only the lower bun, using the supplied photo as a visual reference."""
import bpy, math, numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parent/'assets'/'bunzai-burger'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'bunzai-layered-burger.blend'))
ob=bpy.data.objects['01 Bottom bun']
old=ob.data
N=144
profile=[(0,.02),(.78,.02),(.96,.05),(1.025,.11),(1.065,.21),(1.075,.32),(1.045,.395)]
profile += [(1.045*(1-i/32),.395+.009*math.sin(i/32*math.pi)) for i in range(1,33)]
verts=[];faces=[]
for j,(r,z) in enumerate(profile):
 for i in range(N):
  a=i*math.tau/N
  ripple=.003*math.sin(a*17)+.002*math.cos(a*31)
  verts.append((r*math.cos(a)*(1+ripple),r*math.sin(a)*(1+ripple),z+ripple*.5))
for j in range(len(profile)-1):
 for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
me=bpy.data.meshes.new('Soft lower bun mesh');me.from_pydata(verts,[],faces);me.update();ob.data=me
uv=me.uv_layers.new(name='BunUV')
for p in me.polygons:
 p.use_smooth=True
 for li in p.loop_indices:
  vi=me.loops[li].vertex_index;co=me.vertices[vi].co
  if p.index//N >=6:uv.data[li].uv=((co.x+1.1)/2.2,(co.y+1.1)/2.2)
  else:
   angle=(vi%N)/N
   if p.index%N==N-1 and vi%N==0:angle=1
   uv.data[li].uv=(angle,co.z/.4)

W=1024;rng=np.random.default_rng(91);y,x=np.mgrid[0:W,0:W]/W
def save(name,rgb):
 im=bpy.data.images.new(name,width=W,height=W,alpha=False);rgba=np.ones((W,W,4),dtype=np.float32);rgba[:,:,:3]=np.clip(rgb,0,1)
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(ROOT/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
def material(name,cut):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=.86 if cut else .65
 fine=rng.random((W,W));height=fine*.12
 broad=.012*np.sin(x*35)*np.cos(y*31)+.01*np.sin(x*110+y*76)
 base=np.array([.91,.76,.47] if cut else [.72,.43,.17])
 rgb=np.ones((W,W,3))*base+ broad[:,:,None]+(fine[:,:,None]-.5)*.035
 if cut:
  # Irregular small air pockets, concentrated across the exposed bread crumb.
  for k in range(5500):
   cx,cy=rng.integers(4,W-4,2);rx=int(rng.integers(1,5));ry=int(rng.integers(1,4))
   for dy in range(-ry,ry+1):
    for dx in range(-rx,rx+1):
     d=(dx/rx)**2+(dy/ry)**2
     if d<1:
      rgb[cy+dy,cx+dx]-=(1-d)*np.array([.13,.15,.14]);height[cy+dy,cx+dx]-=(1-d)*.7
 else:
  gradient=(y*.14-.04)[:,:,None];rgb+=gradient
  crease=np.exp(-((y-.45-.015*np.sin(x*70))/.025)**2);rgb-=crease[:,:,None]*.035
 tex=n.new('ShaderNodeTexImage');tex.image=save(name+'_color',rgb);l.new(tex.outputs['Color'],bs.inputs['Base Color'])
 dy,dx=np.gradient(height);normal=np.stack([-dx*.7,-dy*.7,np.ones_like(dx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1)[:,:,None]
 t=n.new('ShaderNodeTexImage');t.image=save(name+'_normal',normal*.5+.5);t.image.colorspace_settings.name='Non-Color'
 nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65;l.new(t.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal'])
 return m
me.materials.append(material('Lower bun golden side',False));me.materials.append(material('Lower bun pale porous crumb',True))
for p in me.polygons:p.material_index=1 if p.index//N>=6 else 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'bunzai-layered-burger.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'bunzai-layered-burger.glb'),export_format='GLB',export_apply=True,export_materials='EXPORT',export_all_vertex_colors=True)
print('Updated lower bun only')
