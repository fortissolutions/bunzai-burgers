"""Build an original, separately layered burger inspired by the supplied photo."""
import bpy, math, random
from pathlib import Path
from mathutils import noise, Vector
random.seed(24)
OUT=Path(__file__).resolve().parent/'assets'/'bunzai-burger'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def mat(name,color,rough=.45):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 return m
bread=mat('Golden baked brioche',(1,1,1),.4)
meat=mat('Grilled patty',(1,1,1),.65)
green=mat('Fresh ruffled lettuce',(1,1,1),.5)
cheese=mat('Melted golden cheese',(.95,.56,.025),.28)
red=mat('Tomato skin',(.72,.035,.012),.32)
flesh=mat('Tomato flesh',(.95,.115,.04),.4)
gel=mat('Tomato seed chambers',(.44,.055,.016),.24)
seedmat=mat('Sesame cream',(.92,.77,.46),.5)
tomseed=mat('Tomato seeds',(.91,.65,.22),.4)
purple=mat('Red onion edge',(.45,.085,.27),.35)
onion=mat('Onion translucent flesh',(.91,.73,.8),.4)
sauce=mat('Creamy burger sauce',(.86,.48,.21),.35)

def mesh(name,verts,faces,material,colors=None):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(material)
 for p in me.polygons:p.use_smooth=True
 if colors:
  if not material.node_tree.nodes.get('Vertex color'):
   vc=material.node_tree.nodes.new('ShaderNodeVertexColor');vc.name='Vertex color';vc.layer_name='Color';material.node_tree.links.new(vc.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
  attr=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
  for c,v in zip(attr.data,colors):c.color=(*v,1)
 return ob

def lathe(name,profile,z,material,kind):
 verts=[];colors=[];N=112
 for r,h in profile:
  for i in range(N):
   a=i*2*math.pi/N;x=r*math.cos(a);y=r*math.sin(a)
   n=noise.noise_vector(Vector((x*17,y*17,h*30)))[0]
   coarse=noise.noise_vector(Vector((x*4,y*4,h*5)))[0]
   jitter=(.014 if kind=='bun' else .045)*n
   verts.append((x*(1+jitter),y*(1+jitter),z+h+jitter*.4))
   if kind=='bun':
    toast=max(0,min(1,(h+.08)*1.6+coarse*.22))
    c=(.78-.3*toast+n*.04,.42-.25*toast+n*.025,.12-.085*toast)
   else:
    char=max(0,coarse*.7+n*.25)
    c=(.32-char*.5,.13-char*.23,.045-char*.065)
   colors.append(tuple(max(.012,v) for v in c))
 faces=[]
 for j in range(len(profile)-1):
  for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
 return mesh(name,verts,faces,material,colors if kind in ('bun','patty') else None)

lathe('01 Bottom bun',[(0,0),(.8,0),(1.01,.07),(1.08,.18),(1.08,.34),(1.01,.41),(.8,.44),(0,.44)],0,bread,'bun')
topZ=3.95
profile=[(0,-.035),(.9,-.035),(1.1,0),(1.11,.1)]
for k in range(1,20):
 t=k/20*math.pi/2;profile.append((1.11*math.cos(t),.1+.68*math.sin(t)))
profile.append((0,.78))
lathe('08 Sesame crown',profile,topZ,bread,'bun')

def sphere(name,location,scale,material,segments=12,rings=8):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=location)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
for i in range(105):
 r=math.sqrt(random.random())*.99;a=random.random()*math.tau;x=r*math.cos(a);y=r*math.sin(a)
 z=topZ+.1+.68*math.sqrt(1-(r/1.11)**2)
 o=sphere('Sesame seed %03d'%i,(x,y,z+.01),(.015,.037,.012),seedmat)
 normal=Vector((x/1.11**2,y/1.11**2,(z-topZ-.1)/.68**2)).normalized();o.rotation_euler=normal.to_track_quat('Z','Y').to_euler()

# Thin organic sauce disk, visible beneath the lettuce.
def disk(name,z,radius,material):
 v=[(0,0,z)];N=112
 for i in range(N):
  a=i*math.tau/N;r=radius*(1+.07*math.sin(7*a)+.03*math.cos(13*a));v.append((r*math.cos(a),r*math.sin(a),z+.018*math.sin(8*a)))
 ob=mesh(name,v,[(0,i+1,(i+1)%N+1) for i in range(N)],material)
 mod=ob.modifiers.new('Thickness','SOLIDIFY');mod.thickness=.035
 return ob
disk('02 Sauce',.75,.96,sauce)

# Ruffled individual leaves with raised centers and wavy, scalloped edges.
for leaf in range(8):
 a=leaf*math.tau/8;verts=[];colors=[];faces=[];R=16;N=44
 for j in range(R+1):
  t=j/R
  for i in range(N):
   ang=i*math.tau/N;r=t*(1+.12*math.sin(9*ang))
   x=.55*r*math.cos(ang)+.52;y=.43*r*math.sin(ang)
   z=1.18+.1*(1-t)+.095*t*t*math.sin(10*ang+leaf)+.035*math.sin(4*ang)*t
   verts.append((x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a),z))
   n=noise.noise_vector(Vector((x*13,y*13,leaf)))[0];colors.append((.15+.07*t+n*.03,.38+.18*t+n*.06,.025+.025*t))
 for j in range(R):
  for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
 ob=mesh('03 Lettuce leaf %02d'%leaf,verts,faces,green,colors);mod=ob.modifiers.new('Leaf thickness','SOLIDIFY');mod.thickness=.012

pat=[(0,-.16),(.8,-.16),(1,-.12),(1.055,-.02),(1.04,.1),(.95,.17),(.7,.19),(0,.19)]
lathe('04 Grilled patty',pat,1.86,meat,'patty')
# Small irregular charred surface flecks.
char=mat('Grill sear',(.055,.022,.009),.8)
for i in range(75):
 r=math.sqrt(random.random())*.95;a=random.random()*math.tau
 sphere('Patty sear %02d'%i,(r*math.cos(a),r*math.sin(a),2.055),(.035+random.random()*.07,.02,.009),char,8,4)

# Soft square cheese slice with drooping corners and a slightly domed center.
v=[];f=[];N=32
for j in range(N+1):
 y=(j/N*2-1)*.93
 for i in range(N+1):
  x=(i/N*2-1)*.93;edge=max(abs(x),abs(y))/.93
  z=2.53+.055*(1-edge**2)-.22*(abs(x*y)/.93**2)**2+.018*math.sin(x*5+y*4)
  a=.2;v.append((x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a),z))
for j in range(N):
 for i in range(N):k=j*(N+1)+i;f.append((k,k+1,k+N+2,k+N+1))
ob=mesh('05 Draped cheese',v,f,cheese);ob.modifiers.new('Cheese thickness','SOLIDIFY').thickness=.035

def ring(name,center,radius,width,height,material):
 verts=[];faces=[];N=96
 for r,z in [(radius,0),(radius,height),(radius-width,height),(radius-width,0)]:
  for i in range(N):
   a=i*math.tau/N;verts.append((center[0]+r*math.cos(a),center[1]+r*math.sin(a),center[2]+z))
 for row in range(4):
  for i in range(N):faces.append((row*N+i,row*N+(i+1)%N,((row+1)%4)*N+(i+1)%N,((row+1)%4)*N+i))
 return mesh(name,verts,faces,material)
for i,(x,y,r) in enumerate([(-.3,-.15,.52),(.3,.17,.51)]):
 ring('06 Onion purple edge %d'%i,(x,y,2.98+i*.07),r,.095,.075,purple)
 ring('06 Onion flesh %d'%i,(x,y,3.057+i*.07),r-.012,.075,.006,onion)

lathe('07 Tomato slice',[(0,0),(.8,0),(.86,.025),(.86,.14),(.8,.17),(0,.17)],3.48,red,'tomato')
# Tomato cut face and five seed chambers.
disk('Tomato juicy cut face',3.654,.80,flesh)
for k in range(5):
 a=k*math.tau/5
 o=sphere('Tomato gel chamber %d'%k,(.43*math.cos(a),.43*math.sin(a),3.68),(.24,.14,.008),gel,20,8);o.rotation_euler.z=a
 for t in range(5):
  aa=a+(t-2)*.13;rr=.32+random.random()*.2
  sphere('Tomato seed',(rr*math.cos(aa),rr*math.sin(aa),3.692),(.027,.014,.006),tomseed,8,4)

# Export vertex color variation as glTF COLOR_0, with simple portable PBR materials.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bunzai-layered-burger.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'bunzai-layered-burger.glb'),export_format='GLB',export_apply=True,export_materials='EXPORT',export_all_vertex_colors=True)
print('CREATED',OUT/'bunzai-layered-burger.glb')
