import * as THREE from './assets/three/three.module.js';
import { GLTFLoader } from './assets/three/GLTFLoader.js';
import { RoomEnvironment } from './assets/three/RoomEnvironment.js';

const host = document.querySelector('#burger-model');
const status = host.querySelector('[role="status"]');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x050b2e, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const environment = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  scene.environment = generator.fromScene(environment, 0.04).texture;
  scene.environmentIntensity = 0.35;
  environment.dispose();
  generator.dispose();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x57618a, 0.9));
  const key = new THREE.DirectionalLight(0xffedd5, 2.5);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffedcb, 1.2);
  rim.position.set(-3, 2, -2);
  scene.add(rim);
  let modelSize;
  function render() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (modelSize) {
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const distance = Math.max(modelSize.y, modelSize.x / camera.aspect) / (2 * Math.tan(verticalFov / 2)) * 1.05 + modelSize.z / 2;
      camera.position.set(0, distance * 0.18, distance);
      camera.lookAt(0, 0, 0);
    }
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(render);
  observer.observe(host);
  new GLTFLoader().load('./assets/bunzai-burger/bunzai-layered-burger.glb', async (gltf) => {
    try {
    const model = gltf.scene;
    // Use the replacement GLB’s embedded materials and texture without overrides.
    // Omit the source scene�s studio enclosure and backdrop.
    ['Cube', 'Plane001', 'Plane.001'].forEach(name => model.getObjectByName(name)?.removeFromParent());
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const pivot = new THREE.Group();
    model.position.sub(center);
    pivot.add(model);
    pivot.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
    scene.add(pivot);
    pivot.updateMatrixWorld(true);
    modelSize = new THREE.Box3().setFromObject(pivot).getSize(new THREE.Vector3());
    render();
    status.hidden = true;
    host.dataset.loaded = 'true';
    host.dataset.textures = 'ready';
    } catch (error) {
      status.textContent = 'The burger textures could not load. Please refresh to try again.';
      console.error('Burger texture loading failed:', error);
    }
  }, (event) => {
    status.textContent = event.total ? `Loading burgerâ€¦ ${Math.round(event.loaded / event.total * 100)}%` : 'Loading burgerâ€¦';
  }, (error) => {
    status.textContent = 'The burger could not load. Please refresh to try again.';
    console.error('Burger model failed to load:', error);
  });
} catch (error) {
  status.textContent = 'The 3D preview needs a browser with WebGL enabled.';
  console.error('Burger renderer failed:', error);
}
