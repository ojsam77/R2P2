import './index.css';
import * as THREE from './node_modules/three';

import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'; // Import DRACOLoader

let container, stats;
let camera, scene, renderer;
let controls, water, sun, model;
let mixer;
const clock = new THREE.Clock();
let maxAnimationTime = 0.1; // Track maximum animation time
let group = new THREE.Group(); // Initialize group here

let userIsControllingCamera = false;
let cameraAnimationStopped = false;
let modelLoaded = false; // Flag to check if the model is loaded
let animationStarted = false; // Flag to indicate if the animation has started

const initialCameraPosition = new THREE.Vector3(-14, 23, 17.3);
const targetCameraPosition = new THREE.Vector3(-6.67, 7.99, 20);
const cameraAnimationDuration = 5; // Reduced duration of the camera animation in seconds

const finalGroupPositionY = 0; // Final position after the animation
let groupAnimationComplete = false; // Add this line

let cameraAnimationStartTime = null; // Track camera animation start time
let startTime = performance.now(); // Track the start time using performance.now()
let lastTime = performance.now(); // Track the last animation frame time
let hiddenTime = 0; // Track the time when the document was hidden

init();

function init() {
  container = document.getElementById('lotus-wrapper');

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.copy(initialCameraPosition); // Set initial camera position

  sun = new THREE.Vector3();

  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('./src/assets/threejs_water-texture.webp', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );

  water.rotation.x = - Math.PI / 2;

  scene.add(water);

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const sceneEnv = new THREE.Scene();

  let renderTarget;

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();

    if (renderTarget !== undefined) renderTarget.dispose();

    sceneEnv.add(sky);
    renderTarget = pmremGenerator.fromScene(sceneEnv);
    scene.add(sky);

    scene.environment = renderTarget.texture;
  }

  updateSun();

  // Add the group to the scene
  scene.add(group);

  // Create yellow material
  const yellowMaterial = new THREE.MeshStandardMaterial({ color: 0xF5CD3E });

  // Load GLTF model with DRACOLoader
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('./src/assets/draco/'); // Set the correct path to the Draco decoder
  loader.setDRACOLoader(dracoLoader);

  loader.load('./src/assets/threejs_lotus-model.glb', function (gltf) {
    model = gltf.scene;
    group.add(model);
    group.position.set(0, 0, 0); // Start the group lower (adjust y value as needed)
    model.scale.set(1, 1, 1); // Adjust the scale to make the model bigger

    // Find and scale the base object
    const base = model.getObjectByName('base');
    if (base) {
      base.scale.set(0.15, 0.15, 0.15); // Adjust the scale values as needed
      base.traverse((child) => {
        if (child.isMesh) {
          child.material = yellowMaterial; // Assign the yellow material to the base
        }
      });
    }

    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.clampWhenFinished = true; // Stop at the end
      action.loop = THREE.LoopOnce; // Play only once
      action.play();
      maxAnimationTime = Math.max(maxAnimationTime, clip.duration); // Set the maximum animation time
    });

    modelLoaded = true; // Set flag to true when the model is loaded
    animationStarted = true; // Start animation now
    startTime = performance.now(); // Reset the start time
    cameraAnimationStartTime = clock.getElapsedTime(); // Record the start time of the camera animation
    loadPistils(); // Load pistils after the main model is loaded
  }, undefined, function (error) {
    console.error('An error happened', error);
  });

  function loadPistils() {
    const yellowMaterial = new THREE.MeshStandardMaterial({ color: 0xF5CD3E });

    loader.load('./src/assets/threejs_pistil-model.glb', function (gltf) {
      const pistilModel = gltf.scene;
      const pistil = pistilModel.getObjectByName('pistil');

      if (pistil) {
        const radius = 0.5; // Larger circle radius
        const deadZoneRadius = 0; // Radius of the dead zone in the middle
        const minScale = 0.3;
        const maxScale = 0.9;
        const numPistils = 300; // Adjustable number of pistils
        const scaleVariation = 0.1; // Slight scale variation
        const rotationVariation = 0.1; // Slight rotation variation in radians

        for (let i = 0; i < numPistils; i++) {
          const instance = pistil.clone();
          const angle = Math.random() * Math.PI * 2; // Random angle
          const distance = Math.sqrt(Math.random()) * radius; // Random distance from the center, square root to ensure uniform distribution

          if (distance < deadZoneRadius) {
            continue; // Skip placing pistils within the dead zone
          }

          const x = distance * Math.cos(angle);
          const z = distance * Math.sin(angle);

          // Adjust scale calculation to consider the distance from the edge of the dead zone
          const effectiveDistance = distance - deadZoneRadius;
          const effectiveRadius = radius - deadZoneRadius;
          const baseScale = minScale + (effectiveDistance / effectiveRadius) * (maxScale - minScale);
          const scale = baseScale + (Math.random() - 0.5) * scaleVariation; // Add slight scale variation
          instance.scale.set(scale, scale, scale);

          // Adjust the height so pistils closer to the center are higher up
          const y = 2 + (1 - effectiveDistance / effectiveRadius) * 0.5; // Adjust the height based on the distance
          instance.position.set(x, y, z);

          // Calculate angle, add 180 degrees, and set rotation around the z-axis with slight variation
          const rotationAngle = Math.atan2(x, z) + Math.PI + (Math.random() - 0.5) * rotationVariation;
          instance.rotation.set(0, rotationAngle, 0);

          // Assign the yellow material to the pistil instance
          instance.traverse((child) => {
            if (child.isMesh) {
              child.material = yellowMaterial;
            }
          });

          model.add(instance); // Add pistils to the main model
        }
      }
    }, undefined, function (error) {
      console.error('An error happened', error);
    });
  }

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.42;
  controls.minPolarAngle = 0.5; // Limit how far down the camera can go (adjust as needed)
  controls.target.set(0, 3, 0);
  controls.minDistance = 15;
  controls.maxDistance = 30;

  // Enable damping and set damping factor
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Set the rotate speed to make orbiting slower
  controls.rotateSpeed = 0.5; // Adjust this value as needed (lower value makes it slower)

  controls.update();

  controls.addEventListener('start', function () {
    userIsControllingCamera = true;
    cameraAnimationStopped = true; // Stop the camera animation permanently
  });

  stats = new Stats();
  container.appendChild(stats.dom);

  // Add event listener for window resize
  window.addEventListener('resize', onWindowResize, false);
  
  // Add event listeners for visibility change
  document.addEventListener('visibilitychange', onVisibilityChange);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onVisibilityChange() {
  if (document.hidden) {
    hiddenTime = performance.now();
  } else {
    const now = performance.now();
    const hiddenDuration = now - hiddenTime;
    startTime += hiddenDuration; // Adjust startTime to account for the time the document was hidden
    if (mixer) {
      mixer.time += hiddenDuration / 1000; // Adjust the mixer time to account for the hidden duration
    }
  }
}

// Easing function
function easeOutCubic(t) {
  return (--t) * t * t + 1;
}

function animate() {
  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  const elapsedTime = (now - startTime) / 1000; // Calculate elapsed time using performance.now()

  // Camera animation
  if (!cameraAnimationStopped && cameraAnimationStartTime !== null) {
    const animationElapsedTime = elapsedTime - cameraAnimationStartTime;
    if (animationElapsedTime < cameraAnimationDuration) {
      const progress = animationElapsedTime / cameraAnimationDuration;
      const easedProgress = easeOutCubic(progress);
      const interpolatedPosition = new THREE.Vector3().lerpVectors(initialCameraPosition, targetCameraPosition, easedProgress);
      camera.position.copy(interpolatedPosition); // Smoothly move the camera to the target position
    }
  }

  controls.update(); // Update controls even during the animation

  // Group animation
  if (animationStarted && !groupAnimationComplete) {
    if (mixer) {
      mixer.update(delta);
    }
    if (elapsedTime < maxAnimationTime) {
      const progress = elapsedTime / maxAnimationTime;
      const easedProgress = easeOutCubic(progress); // Use the easing function here
      group.position.y = -4 + easedProgress * 4; // Animate from lower position (-10) to higher position (0)
      group.rotation.y = -1 + easedProgress * 1; // Animate from lower position (-10) to higher position (0)
    } else {
      groupAnimationComplete = true; // Mark animation as complete
    }
  }

  render();
  stats.update();
}

function render() {
  const time = performance.now() * 0.001;

  if (group && group.children.length > 0) {
    group.children[0].position.y = Math.sin(time) * 0.05; // Bobbing up and down
  }

  water.material.uniforms['time'].value += 1.0 / 300.0;

  renderer.render(scene, camera);
}
