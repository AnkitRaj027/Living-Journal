import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import type { JournalAct, LampIntensity } from '../types/journal';
import { soundEngine } from '../audio/soundEngine';

interface DeskCanvasProps {
  act: JournalAct;
  lampIntensity: LampIntensity;
  plantStage: 1 | 2 | 3;
  isWriting: boolean;
  journalTitle: string;
  onOpenJournal: () => void;
  onToggleLamp: () => void;
}

const SECRET_THOUGHTS = [
  "\"Words are the footprints of a wandering mind.\"",
  "\"Silence is the canvas upon which memory paints.\"",
  "\"What you write down, time cannot steal.\"",
  "\"Every evening carries a quiet forgiveness.\"",
  "\"A page turned is a day remembered.\""
];

const createCoverWithTitleTexture = (title: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Rich Walnut / Mahogany leather background
  ctx.fillStyle = '#382014';
  ctx.fillRect(0, 0, 1024, 1024);

  // Gold foil debossed title
  const titleText = (title || 'MY JOURNAL').trim().toUpperCase();
  ctx.fillStyle = '#D5B766';
  const fontSize = titleText.length > 20 ? 36 : titleText.length > 14 ? 44 : 54;
  ctx.font = `bold ${fontSize}px Cinzel, serif`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = titleText.length > 16 ? '4px' : '8px';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.fillText(titleText, 512, 480);

  // Flourish accent line
  ctx.strokeStyle = 'rgba(213, 183, 102, 0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(330, 520);
  ctx.lineTo(694, 520);
  ctx.stroke();

  // Perimeter debossed stitching border
  ctx.strokeStyle = 'rgba(181, 139, 60, 0.45)';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  ctx.strokeRect(40, 40, 944, 944);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};


export const DeskCanvas: React.FC<DeskCanvasProps> = ({
  act,
  lampIntensity,
  plantStage,
  isWriting,
  journalTitle,
  onOpenJournal,
  onToggleLamp,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const coverTitleMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  
  // Track latest act in a ref to avoid stale closure in pointer events
  const actRef = useRef<JournalAct>(act);
  actRef.current = act;

  // Floating secret thought state
  const [whisperThought, setWhisperThought] = useState<string | null>(null);

  // Dynamic 3D Objects
  const journalGroupRef = useRef<THREE.Group | null>(null);
  const coverHingeRef = useRef<THREE.Group | null>(null);
  const claspMeshRef = useRef<THREE.Mesh | null>(null);
  const penRef = useRef<THREE.Group | null>(null);
  const plantGroupRef = useRef<THREE.Group | null>(null);
  const lampLightRef = useRef<THREE.PointLight | null>(null);
  const lampSpotRef = useRef<THREE.SpotLight | null>(null);
  const candleLightRef = useRef<THREE.PointLight | null>(null);
  const dustParticlesRef = useRef<THREE.Points | null>(null);
  const steamParticlesRef = useRef<THREE.Points | null>(null);
  const pendulumRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0e0704);
    scene.fog = new THREE.FogExp2(0x0e0704, 0.055);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 7.5, 8.8);
    camera.lookAt(0, 0.4, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Interactive OrbitControls for Room Exploration
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = Math.PI / 4.5;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minAzimuthAngle = -Math.PI / 2.2;
    controls.maxAzimuthAngle = Math.PI / 2.2;
    controls.minDistance = 4.2;
    controls.maxDistance = 13.5;
    controls.target.set(0, 0.4, 0);
    controlsRef.current = controls;

    // 3. Procedural Dark Walnut Desk
    const createWoodTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#2B1A10';
      ctx.fillRect(0, 0, 1024, 1024);

      for (let i = 0; i < 260; i++) {
        const y = Math.random() * 1024;
        const h = Math.random() * 8 + 2;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 32, 20, 0.45)' : 'rgba(23, 13, 8, 0.55)';
        ctx.fillRect(0, y, 1024, h);
      }

      for (let i = 0; i < 20000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const len = Math.random() * 32 + 10;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(117, 73, 43, 0.16)' : 'rgba(15, 8, 4, 0.22)';
        ctx.fillRect(x, y, len, 1.5);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const woodTexture = createWoodTexture();
    woodTexture.wrapS = THREE.RepeatWrapping;
    woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(2, 2);

    const deskGeo = new THREE.PlaneGeometry(28, 18);
    const deskMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.65,
      metalness: 0.1,
    });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.rotation.x = -Math.PI / 2;
    desk.receiveShadow = true;
    scene.add(desk);

    // Heritage Brass Material
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xb58b3c,
      roughness: 0.32,
      metalness: 0.85,
    });

    // Parquet Floor beneath desk
    const floorGeo = new THREE.PlaneGeometry(44, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x140a06,
      roughness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -3.2, 0);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 4. Study Room Walls & Wainscoting
    const wallGeo = new THREE.PlaneGeometry(40, 22);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x22150e,
      roughness: 0.9,
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 6.5, -9);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const wainscotGeo = new THREE.PlaneGeometry(40, 5.5);
    const wainscotMat = new THREE.MeshStandardMaterial({
      color: 0x1a0f08,
      roughness: 0.7,
      metalness: 0.15
    });
    const wainscot = new THREE.Mesh(wainscotGeo, wainscotMat);
    wainscot.position.set(0, 2.75, -8.95);
    scene.add(wainscot);

    // 5. Grand Study Bookshelf with 35+ Antique Leather Books
    const bookshelf = new THREE.Group();
    bookshelf.position.set(-6.5, 0, -7.5);

    const shelfWoodMat = new THREE.MeshStandardMaterial({ color: 0x1e1109, roughness: 0.7 });
    const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(7, 9.5, 0.4), shelfWoodMat);
    shelfBack.position.set(0, 4.75, -0.4);
    bookshelf.add(shelfBack);

    [1.5, 4.5, 7.5].forEach(y => {
      const shelfPlank = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 1.4), shelfWoodMat);
      shelfPlank.position.set(0, y, 0.4);
      shelfPlank.castShadow = true;
      shelfPlank.receiveShadow = true;
      bookshelf.add(shelfPlank);
    });

    const bookColors = [0x5A1818, 0x1B382B, 0x1E2B45, 0x4A3525, 0x75492B, 0x6D2424, 0x2B1A10];
    [1.6, 4.6, 7.6].forEach(shelfY => {
      let curX = -2.8;
      for (let i = 0; i < 11; i++) {
        const bWidth = 0.18 + Math.random() * 0.18;
        const bHeight = 1.6 + Math.random() * 0.6;
        const bDepth = 0.85 + Math.random() * 0.2;
        const bColor = bookColors[Math.floor(Math.random() * bookColors.length)];

        const bookMesh = new THREE.Mesh(
          new THREE.BoxGeometry(bWidth, bHeight, bDepth),
          new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.6 })
        );
        bookMesh.position.set(curX + bWidth / 2, shelfY + bHeight / 2, 0.4);
        bookMesh.castShadow = true;
        bookshelf.add(bookMesh);
        curX += bWidth + 0.04;
      }
    });
    scene.add(bookshelf);

    // 6. Arched Window on Left with Rain & Night Skyline
    const windowGroup = new THREE.Group();
    windowGroup.position.set(-11.5, 5.5, -2);
    windowGroup.rotation.y = Math.PI / 3;

    const winFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 7.5, 5.5),
      new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.6 })
    );
    windowGroup.add(winFrame);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 7.2),
      new THREE.MeshBasicMaterial({ color: 0x09141c })
    );
    glass.rotation.y = Math.PI / 2;
    glass.position.x = -0.1;
    windowGroup.add(glass);
    scene.add(windowGroup);

    // 7. WALL HANGINGS: Antique Clock, Celestial Chart & Framed Art
    // A) Framed Vintage Botanical Painting on Back Wall
    const frameGeo = new THREE.BoxGeometry(4.2, 3.2, 0.15);
    const frame = new THREE.Mesh(frameGeo, brassMat);
    frame.position.set(3.5, 7.2, -8.85);

    const canvasGeo = new THREE.PlaneGeometry(3.8, 2.8);
    const canvasMat = new THREE.MeshStandardMaterial({ color: 0x241d17, roughness: 0.8 });
    const artCanvas = new THREE.Mesh(canvasGeo, canvasMat);
    artCanvas.position.z = 0.08;
    frame.add(artCanvas);
    scene.add(frame);

    // Twin Brass Candle Sconces flanking the framed painting
    [1.0, 6.0].forEach(sx => {
      const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.4, 16), brassMat);
      sconce.position.set(sx, 7.2, -8.85);
      scene.add(sconce);

      const sconceLight = new THREE.PointLight(0xffa54a, 0.55, 4.5, 2);
      sconceLight.position.set(sx, 7.5, -8.6);
      scene.add(sconceLight);
    });

    // B) Antique Grandfather / Wall Clock with Swinging Pendulum
    const clockGroup = new THREE.Group();
    clockGroup.position.set(-1.2, 7.6, -8.85);

    const clockBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.18, 8),
      new THREE.MeshStandardMaterial({ color: 0x22130b, roughness: 0.6 })
    );
    clockBody.rotation.x = Math.PI / 2;
    clockGroup.add(clockBody);

    const clockFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 32),
      new THREE.MeshStandardMaterial({ color: 0xf5eedb, roughness: 0.5 })
    );
    clockFace.position.z = 0.1;
    clockGroup.add(clockFace);

    // Pendulum rod and bob
    const pendulum = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.4, 0.02),
      brassMat
    );
    pendulum.position.set(0, -0.9, 0.05);
    clockGroup.add(pendulum);
    pendulumRef.current = pendulum;

    scene.add(clockGroup);

    // C) Celestial Chart / World Map Scroll Hanging on Right Wall
    const mapGroup = new THREE.Group();
    mapGroup.position.set(11.5, 6.2, -2);
    mapGroup.rotation.y = -Math.PI / 2.6;

    const mapScroll = new THREE.Mesh(
      new THREE.PlaneGeometry(5.0, 3.6),
      new THREE.MeshStandardMaterial({ color: 0xdec8a5, roughness: 0.85 })
    );
    mapGroup.add(mapScroll);

    // Cedar hanging rods top and bottom
    [-1.85, 1.85].forEach(ry => {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 5.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x2a160c, roughness: 0.7 })
      );
      rod.rotation.z = Math.PI / 2;
      rod.position.y = ry;
      mapGroup.add(rod);
    });
    scene.add(mapGroup);

    // 8. Stack of Study Books with Brass Magnifying Glass
    const bookStack = new THREE.Group();
    bookStack.position.set(4.8, 0, 1.2);
    bookStack.rotation.y = -Math.PI / 8;

    const stackColors = [0x5A3520, 0x2A1F17, 0x6D2424];
    stackColors.forEach((col, idx) => {
      const sBook = new THREE.Mesh(
        new THREE.BoxGeometry(2.1 - idx * 0.1, 0.22, 2.9 - idx * 0.1),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.65 })
      );
      sBook.position.y = idx * 0.24 + 0.11;
      sBook.castShadow = true;
      bookStack.add(sBook);
    });
    scene.add(bookStack);

    // Brass Armillary Celestial Sphere on book stack
    const sphereRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.025, 12, 32), brassMat);
    sphereRing1.position.set(4.8, 0.95, 1.2);
    scene.add(sphereRing1);

    const sphereRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.025, 12, 32), brassMat);
    sphereRing2.position.set(4.8, 0.95, 1.2);
    sphereRing2.rotation.x = Math.PI / 2;
    scene.add(sphereRing2);

    // 9. Brass Candlestick with Flickering Flame
    const candleGroup = new THREE.Group();
    candleGroup.position.set(-4.5, 0, -2.5);

    const candleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.1, 24), brassMat);
    candleBase.castShadow = true;
    candleGroup.add(candleBase);

    const candleStick = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 16), brassMat);
    candleStick.position.y = 0.6;
    candleStick.castShadow = true;
    candleGroup.add(candleStick);

    const waxCandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.9, 16),
      new THREE.MeshStandardMaterial({ color: 0xede4d1, roughness: 0.4 })
    );
    waxCandle.position.y = 1.35;
    waxCandle.castShadow = true;
    candleGroup.add(waxCandle);

    const candleLight = new THREE.PointLight(0xffa347, 0.9, 6, 1.8);
    candleLight.position.set(0, 1.95, 0);
    candleGroup.add(candleLight);
    candleLightRef.current = candleLight;

    scene.add(candleGroup);

    // 10. Artisanal Ceramic Teacup with Saucer & Steaming Particles
    const teacupGroup = new THREE.Group();
    teacupGroup.position.set(3.2, 0, 3.4);

    const saucer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.4, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0xd8c8b4, roughness: 0.5 })
    );
    saucer.castShadow = true;
    teacupGroup.add(saucer);

    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.3, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: 0x4a3224, roughness: 0.4 })
    );
    cup.position.y = 0.28;
    cup.castShadow = true;
    teacupGroup.add(cup);

    const tea = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.02, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a1005, roughness: 0.15 })
    );
    tea.position.y = 0.48;
    teacupGroup.add(tea);

    const steamCount = 35;
    const steamGeo = new THREE.BufferGeometry();
    const steamPos = new Float32Array(steamCount * 3);
    for (let i = 0; i < steamCount * 3; i += 3) {
      steamPos[i] = (Math.random() - 0.5) * 0.25;
      steamPos[i + 1] = 0.5 + Math.random() * 1.5;
      steamPos[i + 2] = (Math.random() - 0.5) * 0.25;
    }
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xefe3c8,
      size: 0.08,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });
    const steam = new THREE.Points(steamGeo, steamMat);
    teacupGroup.add(steam);
    steamParticlesRef.current = steam;

    scene.add(teacupGroup);

    // 11. Dynamic Room Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x28170d, 0.85);
    scene.add(ambientLight);

    // Lamp Point Light
    const lampLight = new THREE.PointLight(0xffb866, 2.5, 14, 1.2);
    lampLight.position.set(-3.2, 3.5, 0.5);
    lampLight.castShadow = true;
    lampLight.shadow.mapSize.width = 1024;
    lampLight.shadow.mapSize.height = 1024;
    lampLight.shadow.bias = -0.001;
    scene.add(lampLight);
    lampLightRef.current = lampLight;

    // Directional Spot Light casting onto desk
    const lampSpot = new THREE.SpotLight(0xffd199, 4.2, 18, Math.PI / 3.5, 0.55, 1.2);
    lampSpot.position.set(-3.2, 4.0, 0.5);
    lampSpot.target.position.set(0, 0, 0);
    lampSpot.castShadow = true;
    scene.add(lampSpot);
    scene.add(lampSpot.target);
    lampSpotRef.current = lampSpot;

    // DEDICATED PEN & INKWELL ACCENT SPOTLIGHT (Makes the pen brilliantly visible!)
    const penSpot = new THREE.SpotLight(0xffedd4, 3.6, 10, Math.PI / 5, 0.6, 1.2);
    penSpot.position.set(2.4, 3.5, 1.4);
    penSpot.target.position.set(2.4, 0.1, 1.4);
    penSpot.castShadow = true;
    scene.add(penSpot);
    scene.add(penSpot.target);

    // Vintage Brass Desk Lamp Mesh
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-3.2, 0, 0.5);

    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.12, 32), brassMat);
    lampBase.castShadow = true;
    lampGroup.add(lampBase);

    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 16), brassMat);
    lampArm.position.set(0, 1.6, 0);
    lampArm.castShadow = true;
    lampGroup.add(lampArm);

    const shadeGeo = new THREE.CylinderGeometry(0.4, 0.8, 0.65, 24, 1, false, 0, Math.PI);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x1f442b,
      roughness: 0.25,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    const lampShade = new THREE.Mesh(shadeGeo, shadeMat);
    lampShade.rotation.z = Math.PI / 2;
    lampShade.rotation.x = Math.PI / 2;
    lampShade.position.set(0.2, 3.3, 0);
    lampShade.castShadow = true;
    lampGroup.add(lampShade);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffe6b3 }));
    bulb.position.set(0.2, 3.25, 0);
    lampGroup.add(bulb);

    scene.add(lampGroup);

    // 12. Living Plant (Terracotta pot & procedural leaves)
    const plantGroup = new THREE.Group();
    plantGroup.position.set(3.4, 0, -1.2);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.4, 0.9, 24),
      new THREE.MeshStandardMaterial({ color: 0x964b2b, roughness: 0.8, metalness: 0.05 })
    );
    pot.position.y = 0.45;
    pot.castShadow = true;
    plantGroup.add(pot);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.53, 0.53, 0.05, 24),
      new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.95 })
    );
    soil.position.y = 0.88;
    plantGroup.add(soil);

    const foliageGroup = new THREE.Group();
    plantGroup.add(foliageGroup);
    plantGroupRef.current = foliageGroup;

    scene.add(plantGroup);

    // 13. VINTAGE FOUNTAIN PEN — Highly Visible Tortoiseshell Resin & 18K Gold Nib
    const penGroup = new THREE.Group();
    penGroup.position.set(2.4, 0.1, 1.4);
    penGroup.rotation.y = -Math.PI / 6;

    // Lustrous Amber Tortoiseshell Resin Barrel
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x8a2e18, // Rich gleaming amber-burgundy resin
      roughness: 0.16,
      metalness: 0.4,
    });
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, 1.6, 16),
      barrelMat
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.castShadow = true;
    penGroup.add(barrel);

    // Bright 24K Gold Triple Accent Rings
    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xf7d879,
      roughness: 0.18,
      metalness: 0.95,
    });
    const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.08, 16), goldRingMat);
    ring1.rotation.z = Math.PI / 2;
    ring1.position.x = 0.2;
    ring1.castShadow = true;
    penGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), goldRingMat);
    ring2.rotation.z = Math.PI / 2;
    ring2.position.x = 0.32;
    penGroup.add(ring2);

    // Pocket Clip
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.04), goldRingMat);
    clip.position.set(0.45, 0.07, 0);
    penGroup.add(clip);

    // Gleaming 18K Gold Nib
    const nib = new THREE.Mesh(
      new THREE.ConeGeometry(0.042, 0.24, 16),
      goldRingMat
    );
    nib.rotation.z = -Math.PI / 2;
    nib.position.x = -0.92;
    nib.castShadow = true;
    penGroup.add(nib);

    scene.add(penGroup);
    penRef.current = penGroup;

    // Inkwell beside pen
    const inkwell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.34, 0.42, 16),
      new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.2, metalness: 0.5 })
    );
    inkwell.position.set(3.3, 0.21, 1.1);
    inkwell.castShadow = true;
    scene.add(inkwell);

    // 14. CLOSED 3D JOURNAL (WITH NO REVERSED TEXT!)
    const journalGroup = new THREE.Group();
    journalGroup.position.set(0, 0.22, 0);

    const frontCoverTexture = createCoverWithTitleTexture(journalTitle);
    const coverTitleMat = new THREE.MeshStandardMaterial({
      map: frontCoverTexture,
      roughness: 0.68,
      metalness: 0.25,
    });
    coverTitleMatRef.current = coverTitleMat;

    const leatherMat = new THREE.MeshStandardMaterial({
      roughness: 0.72,
      metalness: 0.15,
      color: 0x382014
    });

    // Inside Lining Material for the Front Cover (Authentic dark suede / marbled endpaper - NO REVERSED TEXT!)
    const endpaperMat = new THREE.MeshStandardMaterial({
      color: 0x4a3222,
      roughness: 0.85,
    });

    // Page Block (Cream paper edges)
    const pageBlock = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.32, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xefe3c8, roughness: 0.8 })
    );
    pageBlock.castShadow = true;
    pageBlock.receiveShadow = true;
    journalGroup.add(pageBlock);

    // Front Cover Hinged at Left Spine Edge (-1.2, 0.18, 0)
    const coverHinge = new THREE.Group();
    coverHinge.position.set(-1.2, 0.18, 0);

    // 6 Material Array to PREVENT mirrored text when swung open:
    // [0:+X, 1:-X, 2:+Y (Outside Top), 3:-Y (Inside Lining), 4:+Z, 5:-Z]
    const coverMaterials = [
      leatherMat,      // +X
      leatherMat,      // -X
      coverTitleMat,   // +Y (Front outside cover with gold "MY JOURNAL")
      endpaperMat,     // -Y (Inside lining when opened - blank suede, NEVER reversed!)
      leatherMat,      // +Z
      leatherMat       // -Z
    ];

    const coverMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.05, 3.44),
      coverMaterials
    );
    coverMesh.position.set(1.2, 0, 0);
    coverMesh.castShadow = true;
    coverHinge.add(coverMesh);
    journalGroup.add(coverHinge);
    coverHingeRef.current = coverHinge;

    // Back Cover
    const backCover = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.05, 3.44),
      leatherMat
    );
    backCover.position.set(0, -0.18, 0);
    backCover.castShadow = true;
    journalGroup.add(backCover);

    // Brass Clasp
    const claspMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.45),
      brassMat
    );
    claspMesh.position.set(1.24, 0.02, 0);
    claspMesh.castShadow = true;
    journalGroup.add(claspMesh);
    claspMeshRef.current = claspMesh;

    scene.add(journalGroup);
    journalGroupRef.current = journalGroup;

    // 15. Atmospheric Floating Dust Particles in Lamp Beam
    const dustCount = 140;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 5 - 1.5;
      dustPositions[i + 1] = Math.random() * 4.5 + 0.2;
      dustPositions[i + 2] = (Math.random() - 0.5) * 4;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffd8a8,
      size: 0.045,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);
    dustParticlesRef.current = dust;

    // 16. Interactive Raycasting for Taps & Clicks (Touch + Mouse Friendly)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (event: PointerEvent) => {
      pointerDownPos = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      // If user dragged to rotate the desk scene, ignore tap
      const dist = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
      if (dist > 10) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check click on lamp
      const lampIntersects = raycaster.intersectObjects(lampGroup.children, true);
      if (lampIntersects.length > 0) {
        soundEngine.playLampClick();
        onToggleLamp();
        return;
      }

      // Check click on fountain pen (Secret Easter Egg!)
      const penIntersects = raycaster.intersectObjects(penGroup.children, true);
      if (penIntersects.length > 0) {
        soundEngine.playSecretWhisper();
        const randomThought = SECRET_THOUGHTS[Math.floor(Math.random() * SECRET_THOUGHTS.length)];
        setWhisperThought(randomThought);
        setTimeout(() => setWhisperThought(null), 4200);
        return;
      }

      // Check click on closed journal in Act I
      if (actRef.current === 'arrival') {
        const journalIntersects = raycaster.intersectObjects(journalGroup.children, true);
        if (journalIntersects.length > 0) {
          soundEngine.playClaspClick();
          onOpenJournal();
        }
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (actRef.current !== 'arrival') {
        renderer.domElement.style.cursor = 'default';
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects([
        ...journalGroup.children,
        ...lampGroup.children,
        ...penGroup.children
      ], true);

      renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
    };

    const domEl = renderer.domElement;
    domEl.style.cursor = 'grab';
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointermove', handlePointerMove);

    // 17. Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 18. Animation Loop
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = performance.now() * 0.001;

      // Update OrbitControls smoothly
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Gently swinging wall clock pendulum
      if (pendulumRef.current) {
        pendulumRef.current.rotation.z = Math.sin(elapsedTime * 2.8) * 0.14;
      }

      // Flickering Candle Flame Light
      if (candleLightRef.current) {
        candleLightRef.current.intensity = 0.85 + Math.sin(elapsedTime * 9) * 0.12 + Math.sin(elapsedTime * 17) * 0.06;
      }

      // Rising Steam Particles from Teacup
      if (steamParticlesRef.current) {
        const sPos = steamParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < sPos.length; i += 3) {
          sPos[i] += 0.006;
          sPos[i - 1] += Math.sin(elapsedTime * 2 + i) * 0.0015;
          if (sPos[i] > 2.0) {
            sPos[i] = 0.5;
            sPos[i - 1] = (Math.random() - 0.5) * 0.2;
          }
        }
        steamParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Atmospheric Dust Brownian Drift
      if (dustParticlesRef.current) {
        const positions = dustParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += Math.sin(elapsedTime * 0.4 + i) * 0.003;
          if (positions[i] > 4.8) positions[i] = 0.2;
          if (positions[i] < 0.2) positions[i] = 4.8;
        }
        dustParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Act I Subtle Breathing of closed book
      if (actRef.current === 'arrival' && journalGroupRef.current) {
        journalGroupRef.current.position.y = 0.22 + Math.sin(elapsedTime * 1.5) * 0.012;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Dynamic Lighting when Lamp Intensity changes
  useEffect(() => {
    if (!lampLightRef.current || !lampSpotRef.current) return;
    let targetPoint = 2.5;
    let targetSpot = 4.2;

    if (lampIntensity === 'dim') {
      targetPoint = 1.0;
      targetSpot = 1.8;
    } else if (lampIntensity === 'bright') {
      targetPoint = 3.6;
      targetSpot = 5.8;
    }

    gsap.to(lampLightRef.current, { intensity: targetPoint, duration: 0.6, ease: 'power2.out' });
    gsap.to(lampSpotRef.current, { intensity: targetSpot, duration: 0.6, ease: 'power2.out' });
  }, [lampIntensity]);

  // Update Cover Title Texture when user customizes title
  useEffect(() => {
    if (!coverTitleMatRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#382014';
    ctx.fillRect(0, 0, 1024, 1024);

    const titleText = (journalTitle || 'MY JOURNAL').toUpperCase();
    ctx.fillStyle = '#D5B766';
    const fontSize = titleText.length > 16 ? 40 : titleText.length > 11 ? 48 : 54;
    ctx.font = `bold ${fontSize}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = titleText.length > 15 ? '6px' : '10px';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.fillText(titleText, 512, 480);

    ctx.strokeStyle = 'rgba(213, 183, 102, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(360, 520);
    ctx.lineTo(664, 520);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(181, 139, 60, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(40, 40, 944, 944);

    const newTex = new THREE.CanvasTexture(canvas);
    coverTitleMatRef.current.map = newTex;
    coverTitleMatRef.current.needsUpdate = true;
  }, [journalTitle]);

  // Update Living Plant foliage based on streak stage
  useEffect(() => {
    if (!plantGroupRef.current) return;
    const group = plantGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c4e,
      roughness: 0.4,
      side: THREE.DoubleSide
    });

    if (plantStage === 1) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x6ba36f }));
      stem.position.y = 1.02;
      group.add(stem);

      const leafGeo = new THREE.SphereGeometry(0.08, 8, 8);
      leafGeo.scale(1, 0.3, 2);
      const leaf1 = new THREE.Mesh(leafGeo, leafMat);
      leaf1.position.set(0.06, 1.18, 0);
      leaf1.rotation.z = Math.PI / 4;
      group.add(leaf1);
    } else if (plantStage === 2) {
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const leafGeo = new THREE.SphereGeometry(0.12, 8, 8);
        leafGeo.scale(1, 0.3, 2.5);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(Math.cos(angle) * 0.16, 1.15, Math.sin(angle) * 0.16);
        leaf.rotation.y = angle;
        leaf.rotation.z = 0.5;
        group.add(leaf);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const leafGeo = new THREE.SphereGeometry(0.15, 8, 8);
        leafGeo.scale(1, 0.3, 2.8);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(Math.cos(angle) * 0.22, 1.15 + (i % 2) * 0.12, Math.sin(angle) * 0.22);
        leaf.rotation.y = angle;
        leaf.rotation.z = 0.45;
        group.add(leaf);
      }
      const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf3d994 }));
      blossom.position.set(0, 1.35, 0);
      group.add(blossom);
    }
  }, [plantStage]);

  // Subtle Pen Twitch animation when user writes
  useEffect(() => {
    if (!isWriting || !penRef.current) return;
    gsap.to(penRef.current.rotation, {
      y: -Math.PI / 6 + (Math.random() * 0.05 - 0.025),
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut'
    });
  }, [isWriting]);

  // Update Cover Embossed Title Texture when journalTitle changes in real time
  useEffect(() => {
    if (!coverTitleMatRef.current) return;
    const oldTexture = coverTitleMatRef.current.map;
    const newTexture = createCoverWithTitleTexture(journalTitle);
    coverTitleMatRef.current.map = newTexture;
    coverTitleMatRef.current.needsUpdate = true;
    if (oldTexture) oldTexture.dispose();
  }, [journalTitle]);

  // Act Transitions Camera & OrbitControls Choreography
  useEffect(() => {
    if (!cameraRef.current || !journalGroupRef.current) return;
    const camera = cameraRef.current;
    const journalGroup = journalGroupRef.current;
    const coverHinge = coverHingeRef.current;
    const claspMesh = claspMeshRef.current;
    const controls = controlsRef.current;

    if (act === 'arrival') {
      journalGroup.visible = true;
      if (coverHinge) coverHinge.rotation.z = 0;
      if (claspMesh) claspMesh.position.x = 1.24;
      
      // Re-enable smooth OrbitControls for desk & room exploration
      if (controls) {
        controls.enabled = true;
      }
    } else if (act === 'opening') {
      if (controls) {
        controls.enabled = false;
      }

      journalGroup.visible = true;
      if (claspMesh) {
        gsap.to(claspMesh.position, {
          x: 1.55,
          duration: 0.35,
          ease: 'power2.out',
        });
      }
      if (coverHinge) {
        gsap.to(coverHinge.rotation, {
          z: Math.PI * 0.98,
          duration: 1.1,
          ease: 'power2.inOut',
        });
      }
      gsap.to(camera.position, {
        x: 0,
        y: 6.2,
        z: 4.8,
        duration: 1.2,
        ease: 'power2.inOut',
        onComplete: () => {
          journalGroup.visible = false;
        }
      });
    } else if (act === 'open') {
      if (controls) {
        controls.enabled = false;
      }
      journalGroup.visible = false;
      camera.position.set(0, 6.2, 4.8);
      camera.lookAt(0, 0, 0);
    } else if (act === 'closing') {
      if (controls) {
        controls.enabled = false;
      }
      journalGroup.visible = true;
      if (coverHinge) coverHinge.rotation.z = Math.PI * 0.98;
      
      if (coverHinge) {
        gsap.to(coverHinge.rotation, {
          z: 0,
          duration: 0.85,
          ease: 'power2.in',
          onComplete: () => {
            soundEngine.playBookThud();
          }
        });
      }
      if (claspMesh) {
        gsap.to(claspMesh.position, {
          x: 1.24,
          duration: 0.28,
          delay: 0.85,
          ease: 'power2.out',
        });
      }
      gsap.to(camera.position, {
        x: 0,
        y: 7.5,
        z: 8.8,
        duration: 1.2,
        ease: 'power2.inOut',
        onComplete: () => {
          if (controls) controls.enabled = true;
        }
      });
    }
  }, [act]);

  return (
    <div ref={containerRef} className="webgl-container">
      {/* Secret Floating Thought from the Fountain Pen */}
      {whisperThought && (
        <div className="whisper-thought-card">
          <span className="whisper-thought-icon">✒️</span>
          <p>{whisperThought}</p>
        </div>
      )}

      {/* Subtle Room Interaction Hint in Act I */}
      {act === 'arrival' && (
        <div className="room-orbit-hint">
          <span>Drag to explore your study • Scroll to zoom • Click clasp to write</span>
        </div>
      )}
    </div>
  );
};
