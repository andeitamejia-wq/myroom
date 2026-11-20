// scene.js - Three.js Isometric Viewport & Free Area Camera Shifter
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class RoomScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f6f3ed');

    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    // Isometric Orthographic Camera: room fills ~85% of free area
    this.frustumSize = 3.25;
    this.camera = new THREE.OrthographicCamera(
      -this.frustumSize * aspect,
      this.frustumSize * aspect,
      this.frustumSize,
      -this.frustumSize,
      0.1,
      100
    );
    
    // Position at isometric angle looking at center of room
    this.camera.position.set(12, 10.5, 12);
    this.camera.lookAt(0, 0.7, 0);

    // WebGL Renderer: fills 100vw x 100dvh, never resized by panels
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // Orbit Controls with touch & pinch support
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.7, 0);
    this.controls.minPolarAngle = Math.PI / 4.5;
    this.controls.maxPolarAngle = Math.PI / 2.25;
    this.controls.minZoom = 0.7;
    this.controls.maxZoom = 2.5;

    // Ground plane for raycasting
    const planeGeo = new THREE.PlaneGeometry(30, 30);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });
    this.groundPlane = new THREE.Mesh(planeGeo, planeMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 0;
    this.scene.add(this.groundPlane);

    // Floor grid
    this.grid = new THREE.GridHelper(4.0, 20, 0xded7ce, 0xeee7df);
    this.grid.position.y = 0.002;
    this.scene.add(this.grid);

    // Lights
    this.setupLights();

    // Camera Free Area Shift Animation & Live Drag Tracking
    this.currentOffsetX = 0;
    this.targetOffsetX = 0;
    this.currentOffsetY = 0;
    this.targetOffsetY = 0;
    this.animStartTime = 0;
    this.startOffsetX = 0;
    this.startOffsetY = 0;
    this.animDuration = 300; // ms for open/close animation
    this.isAnimatingOffset = false;

    // Window Resize handler
    window.addEventListener('resize', () => this.onWindowResize());

    // Render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLights() {
    this.lightsGroup = new THREE.Group();
    this.scene.add(this.lightsGroup);

    this.ambientLight = new THREE.AmbientLight(0xfff0dd, 0.75);
    this.lightsGroup.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffdeb3, 1.25);
    this.keyLight.position.set(6, 12, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.bias = -0.0005;
    this.lightsGroup.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xffead0, 0.55);
    this.fillLight.position.set(-6, 8, -6);
    this.lightsGroup.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xfff6ea, 0.7);
    this.rimLight.position.set(0, 10, -8);
    this.lightsGroup.add(this.rimLight);
  }

  applyLightPreset(presetName, presetsData) {
    if (!presetsData || !presetsData.presets) return;
    const preset = presetsData.presets.find(p => p.id === presetName) || presetsData.presets[0];
    if (!preset) return;

    // Simple format from lights.json: { color_hex, intensity }.
    // Tint every light with the preset color (ambient/fill softened toward white)
    // and scale the base intensities by the preset intensity.
    if (preset.color_hex && !preset.ambient && !preset.key_light) {
      const tint = new THREE.Color(preset.color_hex);
      const white = new THREE.Color(0xffffff);
      const k = typeof preset.intensity === 'number' ? preset.intensity : 1.0;
      this.ambientLight.color.copy(white).lerp(tint, 0.6);
      this.ambientLight.intensity = 0.75 * k;
      this.keyLight.color.copy(tint);
      this.keyLight.intensity = 1.25 * k;
      this.fillLight.color.copy(white).lerp(tint, 0.5);
      this.fillLight.intensity = 0.55 * k;
      this.rimLight.color.copy(white).lerp(tint, 0.3);
      this.rimLight.intensity = 0.7 * k;
      return;
    }

    if (preset.ambient) {
      this.ambientLight.color.set(preset.ambient.color);
      this.ambientLight.intensity = preset.ambient.intensity;
    }
    if (preset.key_light) {
      this.keyLight.color.set(preset.key_light.color);
      this.keyLight.intensity = preset.key_light.intensity;
    }
    if (preset.fill_light) {
      this.fillLight.color.set(preset.fill_light.color);
      this.fillLight.intensity = preset.fill_light.intensity;
    }
    if (preset.rim_light) {
      this.rimLight.color.set(preset.rim_light.color);
      this.rimLight.intensity = preset.rim_light.intensity;
    }
  }

  // Shift camera view to center room in free area:
  // - animate=false: live during drag of resize bar
  // - animate=true: 300 ms smooth transition on open/close
  setPanelFreeAreaOffset(panelSize, isOpen, animate = true) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    let targetX = 0;
    let targetY = 0;

    if (isOpen && panelSize > 0) {
      if (w > 700) {
        // Desktop: Left column with margin
        const totalCoveredWidth = panelSize + 16;
        targetX = -totalCoveredWidth / 2;
        targetY = 0;
      } else {
        // Mobile: Bottom sheet
        targetX = 0;
        targetY = panelSize / 2;
      }
    }

    if (!animate) {
      // Live instant update during dragging
      this.isAnimatingOffset = false;
      this.currentOffsetX = targetX;
      this.currentOffsetY = targetY;
      this.targetOffsetX = targetX;
      this.targetOffsetY = targetY;
      this.applyViewOffset(targetX, targetY);
      return;
    }

    // 300ms animated transition
    this.startOffsetX = this.currentOffsetX;
    this.startOffsetY = this.currentOffsetY;
    this.targetOffsetX = targetX;
    this.targetOffsetY = targetY;
    this.animStartTime = performance.now();
    this.isAnimatingOffset = true;
  }

  applyViewOffset(offsetX, offsetY) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (Math.abs(offsetX) < 1 && Math.abs(offsetY) < 1) {
      this.camera.clearViewOffset();
    } else {
      this.camera.setViewOffset(w, h, offsetX, offsetY, w, h);
    }
  }

  updateAnimatedOffset() {
    if (!this.isAnimatingOffset) return;

    const elapsed = performance.now() - this.animStartTime;
    const t = Math.min(1.0, elapsed / this.animDuration);
    // Smooth easeInOutCubic
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    this.currentOffsetX = this.startOffsetX + (this.targetOffsetX - this.startOffsetX) * ease;
    this.currentOffsetY = this.startOffsetY + (this.targetOffsetY - this.startOffsetY) * ease;

    this.applyViewOffset(this.currentOffsetX, this.currentOffsetY);

    if (t >= 1.0) {
      this.isAnimatingOffset = false;
      this.currentOffsetX = this.targetOffsetX;
      this.currentOffsetY = this.targetOffsetY;
    }
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    this.camera.left = -this.frustumSize * aspect;
    this.camera.right = this.frustumSize * aspect;
    this.camera.top = this.frustumSize;
    this.camera.bottom = -this.frustumSize;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.applyViewOffset(this.currentOffsetX, this.currentOffsetY);
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.updateAnimatedOffset();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
