import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/GLTFLoader.js';

// Rutas de los modelos. Se espera que el usuario coloque los archivos en estas rutas
// al desplegar el juego en Netlify u otro servicio.
const MODEL_PATHS = {
  mercedes: 'models/f1/mercedes.glb',
  astonmartin: 'models/f1/astonmartin.glb',
  rb: 'models/f1/RB.glb',
  williams: 'models/f1/williams.glb',
  alpine: 'models/f1/alpine.glb',
  mclaren: 'models/f1/mclaren.glb',
  haas: 'models/f1/haas.glb',
  redbull: 'models/f1/redbull.glb',
  sauber: 'models/f1/sauber.glb',
  ferrari: 'models/f1/ferrari.glb'
};

const PLAYER_MODEL = 'models/player.glb'; // Modelo del coche del jugador

let renderer, scene, camera, xrRefSpace;
let playerCar;
const aiCars = [];

let trackPoints = [];
let trackLine;
let recording = false;
let currentLap = 0;

const startBtn = document.getElementById('startAR');
const lapCounter = document.getElementById('lapCounter');
const carSelect = document.getElementById('carSelect');

startBtn.addEventListener('click', initAR);

async function initAR() {
  if (!navigator.xr) {
    alert('WebXR no es compatible con este navegador.');
    return;
  }

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test']
  });

  renderer.xr.setSession(session);
  xrRefSpace = await session.requestReferenceSpace('local');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  await loadPlayerCar();
  await loadAICars();

  session.addEventListener('end', () => {
    renderer.setAnimationLoop(null);
  });

  renderer.setAnimationLoop(render);  
}

async function loadPlayerCar() {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(PLAYER_MODEL, gltf => {
      playerCar = gltf.scene;
      playerCar.scale.setScalar(0.4); // tamaño aproximado
      scene.add(playerCar);
      resolve();
    }, undefined, reject);
  });
}

async function loadAICars() {
  const loader = new GLTFLoader();
  const promises = Object.values(MODEL_PATHS).map(path => {
    return new Promise((resolve, reject) => {
      loader.load(path, gltf => {
        const car = gltf.scene.clone();
        car.scale.setScalar(0.4);
        aiCars.push(car);
        scene.add(car);
        resolve();
      }, undefined, reject);
    });
  });
  return Promise.all(promises);
}

function render(timestamp, frame) {
  const session = renderer.xr.getSession();
  if (!session) return;

  const viewerPose = frame.getViewerPose(xrRefSpace);

  if (viewerPose) {
    const pos = viewerPose.transform.position;
    // colocar coche del jugador debajo del usuario
    if (playerCar) {
      playerCar.position.set(pos.x, pos.y - 1.5, pos.z); // -1.5 aprox altura usuario
      playerCar.rotation.y = viewerPose.transform.orientation.y;
    }

    // grabar circuito
    if (recording) {
      trackPoints.push(new THREE.Vector3(pos.x, pos.y - 1.5, pos.z));
      updateTrackLine();
    }
  }

  renderer.render(scene, camera);
}

function updateTrackLine() {
  if (trackLine) scene.remove(trackLine);
  const geometry = new THREE.BufferGeometry().setFromPoints(trackPoints);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  trackLine = new THREE.Line(geometry, material);
  scene.add(trackLine);
}

// Funciones de control del circuito
export function startRecording() { trackPoints = []; recording = true; }
export function stopRecording() { recording = false; }

// TODO: Implementar seguimiento de IA, vuelta de formación, detección de pits,
// banderas, penalizaciones y demás reglas de F1.

function updateLapCounter() {
  lapCounter.textContent = `Vuelta: ${currentLap}`;
}

