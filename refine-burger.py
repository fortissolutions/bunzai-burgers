"""Add portable baked surface maps and smoother leaf geometry to the first model."""
import bpy, math, numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'assets'/'bunzai-burger'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'bunzai-layered-burger.blend'))
rng=np.random.default_rng(64)
W=1024
y,x=np.mgrid[0:W,0:W].astype(float)/W
def field():
 a=np.zeros((W,W))
 for freq,amp in [(2,1),(5,.5),(13,.25),(31,.12),(83,.06)]:
  for i in range(3):
   a+=amp*np.sin(x*math.tau*(freq+i)+rng.random()*6)*np.cos(y*math.tau*(freq*.7+i)+rng.random()*6)
 return a/3
def image(name,rgb):
 im=bpy.data.images.new(name,width=W,height=W,alpha=False)
 rgba=np.ones((W,W,4),dtype=np.float32);rgba[:,:,:3]=np.clip(rgb,0,1)
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
for prefix,meaty in [('01 Bottom bun',False),('08 Sesame crown',False),('04 Grilled patty',True)]:
 ob=bpy.data.objects[prefix];me=ob.data
 uv=me.uv_layers.new(name='SurfaceUV')
 # Cylindrical coordinates with top/bottom planar mapping avoid stretched caps.
 coords=np.array([v.co[:] for v in me.vertices]);zmin=coords[:,2].min();zmax=coords[:,2].max()
 for poly in me.polygons:
  for li in poly.loop_indices:
   co=me.vertices[me.loops[li].vertex_index].co
   uv.data[li].uv=((co.x+1.2)/2.4,(co.y+1.2)/2.4)
 f=field();fine=rng.random((W,W));grain=np.clip((fine-.8)*5,0,1)
 if meaty:
  roast=np.clip(f*.8+.5,0,1)
  rgb=np.stack([.33+f*.22,.14+f*.12,.055+f*.05],axis=-1)
  sear=np.maximum(0,np.sin(x*95+y*35+f*4)-.72)*.3
  rgb-=sear[:,:,None];rgb-=grain[:,:,None]*.035
  height=f*.05+grain*.025;rough=.72
 else:
  rgb=np.stack([.73+f*.16,.40+f*.17,.12+f*.075],axis=-1)
  rgb+=grain[:,:,None]*.08;height=f*.008+grain*.009;rough=.43
 material=ob.data.materials[0].copy();material.name=prefix+' textured';ob.data.materials[0]=material
 nodes=material.node_tree.nodes;links=material.node_tree.links;bs=nodes.get('Principled BSDF')
 for link in list(bs.inputs['Base Color'].links):links.remove(link)
 tex=nodes.new('ShaderNodeTexImage');tex.image=image(prefix.replace(' ','_')+'_color',rgb);links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 dy,dx=np.gradient(height);normal=np.stack([-dx*70,-dy*70,np.ones_like(dx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1)[:,:,None]
 norm=nodes.new('ShaderNodeTexImage');norm.image=image(prefix.replace(' ','_')+'_normal',normal*.5+.5);norm.image.colorspace_settings.name='Non-Color'
 nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.45;links.new(norm.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal']);bs.inputs['Roughness'].default_value=rough
 # Don't multiply the baked color by the first version's vertex colors.
 for attr in list(me.color_attributes):me.color_attributes.remove(attr)

# Soften the angular leaves and correct upward-facing normals.
for ob in list(bpy.data.objects):
 if ob.name.startswith('03 Lettuce'):
  bpy.context.view_layer.objects.active=ob;ob.select_set(True)
  for other in bpy.context.selected_objects:
   if other!=ob:other.select_set(False)
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.flip_normals();bpy.ops.object.mode_set(mode='OBJECT')
  sub=ob.modifiers.new('Soft organic folds','SUBSURF');sub.levels=2;sub.render_levels=2
  bpy.ops.object.modifier_move_up(modifier=sub.name)
  # Darker, less neon greens.
  for attr in ob.data.color_attributes:
   for val in attr.data:
    c=val.color;val.color=(c[0]*.65,c[1]*.7,c[2]*.7,c[3])
 if ob.name.startswith('Patty sear'):
  # Integrate char marks into the patty rather than separate raised black dots.
  ob.hide_render=True;bpy.data.objects.remove(ob,do_unlink=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bunzai-layered-burger.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'bunzai-layered-burger.glb'),export_format='GLB',export_apply=True,export_materials='EXPORT',export_all_vertex_colors=True)
print('Refined model exported')
