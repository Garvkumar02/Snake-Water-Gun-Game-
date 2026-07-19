import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let scene, camera, renderer;
let particles, gridHelper;
let animationFrameId;
let currentMode = 'home'; // 'home' or 'arena'

// Camera configuration targets for interpolation
const camHome = { x: 0, y: 15, z: 40, lookAtY: 0 };
const camArena = { x: 0, y: 8, z: 18, lookAtY: 5 };

let currentCamPos = { ...camHome };

export function initThreeJS(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Three.js canvas not found');
        return;
    }

    // 1. Setup Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x101215, 0.015);

    // 2. Setup Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(camHome.x, camHome.y, camHome.z);
    camera.lookAt(0, camHome.lookAtY, 0);

    // 3. Setup Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Create Cyber Grid
    gridHelper = new THREE.GridHelper(100, 40, 0x5a7359, 0x22262a);
    gridHelper.position.y = -5;
    scene.add(gridHelper);

    // 5. Create Particle Environment (Floating Dust / Stars)
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x7f9c84); // Snake Green
    const color2 = new THREE.Color(0x8b9b9a); // Water Blue
    const color3 = new THREE.Color(0xb4735d); // Gun Red

    for (let i = 0; i < particleCount * 3; i += 3) {
        // Random spherical distribution
        const r = 60 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i] = r * Math.sin(phi) * Math.cos(theta);
        positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i+2] = r * Math.cos(phi);

        const colorMode = Math.random();
        let targetColor = color1;
        if(colorMode > 0.66) targetColor = color2;
        else if (colorMode > 0.33) targetColor = color3;

        colors[i] = targetColor.r;
        colors[i+1] = targetColor.g;
        colors[i+2] = targetColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 6. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 7. Handle Resize
    window.addEventListener('resize', onWindowResize);

    // 8. Start Animation Loop
    animate();
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);

    // Rotate particles slowly
    if (particles) {
        particles.rotation.y += 0.0005;
        if (currentMode === 'home') {
            particles.rotation.x += 0.0002;
        }
    }

    // Move camera based on mode
    const targetCam = currentMode === 'home' ? camHome : camArena;
    
    currentCamPos.x += (targetCam.x - currentCamPos.x) * 0.03;
    currentCamPos.y += (targetCam.y - currentCamPos.y) * 0.03;
    currentCamPos.z += (targetCam.z - currentCamPos.z) * 0.03;
    currentCamPos.lookAtY += (targetCam.lookAtY - currentCamPos.lookAtY) * 0.03;

    // In home mode, add a gentle orbital rotation
    if (currentMode === 'home') {
        const time = Date.now() * 0.0002;
        camera.position.x = currentCamPos.x + Math.sin(time) * 15;
        camera.position.z = currentCamPos.z + Math.cos(time) * 15;
        camera.position.y = currentCamPos.y + Math.sin(time * 0.5) * 5;
    } else {
        camera.position.set(currentCamPos.x, currentCamPos.y, currentCamPos.z);
    }
    
    camera.lookAt(0, currentCamPos.lookAtY, 0);
    
    // Grid animation
    if(gridHelper) {
        gridHelper.position.z = (gridHelper.position.z + 0.05) % 2;
    }

    renderer.render(scene, camera);
}

export function transitionToArena() {
    currentMode = 'arena';
}

export function transitionToHome() {
    currentMode = 'home';
}
