import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { disposeGroup } from './avatar.js';

export function createViewer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.2;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI * 0.53;
  controls.autoRotateSpeed = 1.6;

  const key = new THREE.DirectionalLight('#fff4e6', 2.2);
  key.position.set(2.5, 4, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.5, bottom: -0.5, near: 0.5, far: 12 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 5;
  const rim = new THREE.DirectionalLight('#cfe0ff', 1.1);
  rim.position.set(-3, 2.5, -3);
  scene.add(key, rim, new THREE.HemisphereLight('#ffffff', '#c9c4bd', 0.5));

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.03, 64),
    new THREE.MeshStandardMaterial({ color: '#e7e3dd', roughness: 0.8 }),
  );
  platform.position.y = -0.015;
  platform.receiveShadow = true;
  scene.add(platform);

  let avatar = null;
  let H = 1.75;

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px';
    renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    // op smalle (mobiele) schermen verder terug zodat het hele lichaam past
    camera.fov = camera.aspect < 0.8 ? 38 : 30;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  function frame(height = H, azimuthDeg = 0) {
    H = height;
    const target = new THREE.Vector3(0, H * 0.5, 0);
    const dist = H * (camera.aspect < 0.8 ? 3.1 : 2.45);
    const az = (azimuthDeg * Math.PI) / 180;
    controls.target.copy(target);
    camera.position.set(Math.sin(az) * dist, H * 0.58, Math.cos(az) * dist);
    controls.update();
  }

  function setAvatar(group) {
    if (avatar) { scene.remove(avatar); disposeGroup(avatar); }
    avatar = group;
    scene.add(group);
    const h = group.userData.model.H;
    if (Math.abs(h - H) > 0.001) { H = h; controls.target.set(0, H * 0.5, 0); }
  }

  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  return {
    setAvatar, frame,
    setAutoRotate: (v) => { controls.autoRotate = v; },
    get autoRotate() { return controls.autoRotate; },
    screenshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
  };
}
