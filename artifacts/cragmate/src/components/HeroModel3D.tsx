import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";

export interface HoldData {
  mesh: THREE.Mesh;
  featureIdx: number | null;
  routeColor: number;
}

export interface HeroModel3DProps {
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  isDragging: boolean;
  onHoldClick?: (featureIdx: number) => void;
  activeFeatureIdx?: number;
  /** When true, hold tap was a drag — ignore feature selection (same as CSS overlay buttons). */
  skipClickAfterDragRef?: MutableRefObject<boolean>;
}

type SceneRefData = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  wallGroup: THREE.Group;
  holds: HoldData[];
  raycaster: THREE.Raycaster;
  activeFeatureIdx: number;
};

export function HeroModel3D({
  rotateX,
  rotateY,
  onPointerDown,
  isDragging,
  onHoldClick,
  activeFeatureIdx = 0,
  skipClickAfterDragRef,
}: HeroModel3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneRefData | null>(null);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.activeFeatureIdx = activeFeatureIdx;
    updateHoldEmission(sceneRef.current.holds, activeFeatureIdx);
  }, [activeFeatureIdx]);

  function updateHoldEmission(holds: HoldData[], activeIdx: number) {
    holds.forEach((h) => {
      const mat = h.mesh.material as THREE.MeshStandardMaterial;
      if (h.featureIdx === null) {
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 0;
      } else if (h.featureIdx === activeIdx) {
        mat.emissive.setHex(h.routeColor);
        mat.emissiveIntensity = 0.55;
      } else {
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (skipClickAfterDragRef?.current) {
        skipClickAfterDragRef.current = false;
        return;
      }
      if (!sceneRef.current || !mountRef.current) return;
      const { camera, holds, raycaster } = sceneRef.current;
      const rect = mountRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      const holdMeshes = holds.map((h) => h.mesh);
      const hits = raycaster.intersectObjects(holdMeshes, false);
      if (hits.length > 0) {
        const hit = holds.find((h) => h.mesh === hits[0]!.object);
        if (hit && hit.featureIdx !== null) {
          onHoldClick?.(hit.featureIdx);
        }
      }
    },
    [onHoldClick, skipClickAfterDragRef],
  );

  // Scene mounts once; activeFeatureIdx updates via the effect above (not deps here — avoids WebGL rebuild each tap).
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(W, Math.max(H, 1));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, W / Math.max(H, 1), 0.1, 80);
    camera.position.set(0, 0.6, 7.2);
    camera.lookAt(0, 0.4, 0);

    const raycaster = new THREE.Raycaster();

    scene.add(new THREE.AmbientLight(0xfff5e0, 0.4));

    const overhead = new THREE.DirectionalLight(0xfff0cc, 2.2);
    overhead.position.set(0, 10, 3);
    overhead.castShadow = true;
    overhead.shadow.mapSize.set(2048, 2048);
    overhead.shadow.camera.near = 0.5;
    overhead.shadow.camera.far = 30;
    overhead.shadow.camera.left = -6;
    overhead.shadow.camera.right = 6;
    overhead.shadow.camera.top = 8;
    overhead.shadow.camera.bottom = -6;
    overhead.shadow.bias = -0.001;
    scene.add(overhead);

    const sideFill = new THREE.DirectionalLight(0xc5d8ff, 0.9);
    sideFill.position.set(-7, 4, 2);
    scene.add(sideFill);

    const rimLight = new THREE.DirectionalLight(0xffd580, 0.6);
    rimLight.position.set(6, 2, -2);
    scene.add(rimLight);

    const floorBounce = new THREE.PointLight(0xffe4a0, 0.5, 18);
    floorBounce.position.set(0, -5, 5);
    scene.add(floorBounce);

    const wallGroup = new THREE.Group();
    scene.add(wallGroup);

    const rng = (seed: number) => {
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
      return x - Math.floor(x);
    };

    const plywoodCanvas = document.createElement("canvas");
    plywoodCanvas.width = 512;
    plywoodCanvas.height = 512;
    const ctx = plywoodCanvas.getContext("2d")!;
    ctx.fillStyle = "#d6c9a8";
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 80; i++) {
      const y = (i / 80) * 512 + rng(i * 3.1) * 8;
      const alpha = 0.04 + rng(i * 7.3) * 0.12;
      const dark = rng(i * 11.7) > 0.5;
      ctx.strokeStyle = dark ? `rgba(80,55,20,${alpha})` : `rgba(200,175,110,${alpha * 0.6})`;
      ctx.lineWidth = 0.8 + rng(i * 5.2) * 2.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(128, y + rng(i * 2.1) * 6 - 3, 384, y + rng(i * 9.3) * 6 - 3, 512, y + rng(i * 4.7) * 4 - 2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(60,40,10,0.35)";
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 8; row++) {
        const cx = (col / 7) * 480 + 16 + rng(col * 13 + row) * 8 - 4;
        const cy = (row / 7) * 480 + 16 + rng(row * 17 + col) * 8 - 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(40,25,5,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const angle = (s / 6) * Math.PI * 2;
          const bx = cx + Math.cos(angle) * 5.5;
          const by = cy + Math.sin(angle) * 5.5;
          if (s === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx, by);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    for (let i = 0; i < 12; i++) {
      const cx = rng(i * 23.1) * 500 + 6;
      const cy = rng(i * 31.7) * 500 + 6;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18 + rng(i * 7) * 22);
      grad.addColorStop(0, `rgba(255,252,248,${0.18 + rng(i * 3) * 0.22})`);
      grad.addColorStop(1, "rgba(255,252,248,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22 + rng(i * 5) * 18, 14 + rng(i * 9) * 12, rng(i * 11) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const wallTexture = new THREE.CanvasTexture(plywoodCanvas);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(1.4, 1.4);

    const normalCanvas = document.createElement("canvas");
    normalCanvas.width = 256;
    normalCanvas.height = 256;
    const nctx = normalCanvas.getContext("2d")!;
    nctx.fillStyle = "rgb(128,128,255)";
    nctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      const y = (i / 60) * 256;
      const bump = rng(i * 3.1) * 0.06 - 0.03;
      const r = Math.round(128 + bump * 255);
      const g = Math.round(128 + rng(i * 7) * 0.04 * 255);
      nctx.strokeStyle = `rgb(${r},${g},255)`;
      nctx.lineWidth = 1 + rng(i * 5) * 2;
      nctx.beginPath();
      nctx.moveTo(0, y);
      nctx.lineTo(256, y);
      nctx.stroke();
    }
    const wallNormal = new THREE.CanvasTexture(normalCanvas);
    wallNormal.wrapS = THREE.RepeatWrapping;
    wallNormal.wrapT = THREE.RepeatWrapping;
    wallNormal.repeat.set(1.4, 1.4);

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      normalMap: wallNormal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.82,
      metalness: 0.0,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x1a1208,
      roughness: 0.6,
      metalness: 0.15,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      roughness: 0.45,
      metalness: 0.8,
    });

    type WallPanel = {
      w: number;
      h: number;
      x: number;
      y: number;
      z: number;
      rotX: number;
    };

    const panels: WallPanel[] = [
      { w: 5.6, h: 0.9, x: 0, y: -3.55, z: 0.05, rotX: 0.06 },
      { w: 5.6, h: 3.2, x: 0, y: -1.4, z: 0, rotX: 0 },
      { w: 5.6, h: 1.8, x: 0, y: 1.35, z: -0.55, rotX: -Math.PI / 6 },
      { w: 5.6, h: 2.2, x: 0, y: 2.65, z: -1.55, rotX: -Math.PI / 4 },
      { w: 5.6, h: 1.6, x: 0, y: 3.5, z: -2.8, rotX: -Math.PI * 0.42 },
    ];

    panels.forEach((p) => {
      const geo = new THREE.PlaneGeometry(p.w, p.h, 6, 4);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setZ(i, pos.getZ(i) + (rng(i * 5.1 + 99) - 0.5) * 0.012);
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, wallMat.clone());
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.map) {
        mat.map = wallTexture.clone();
        mat.map.repeat.set(p.w * 0.28, p.h * 0.28);
        mat.map.needsUpdate = true;
      }
      if (mat.normalMap) {
        mat.normalMap = wallNormal.clone();
        mat.normalMap.repeat.set(p.w * 0.28, p.h * 0.28);
        mat.normalMap.needsUpdate = true;
      }
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.x = p.rotX;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallGroup.add(mesh);

      [-1, 1].forEach((side) => {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.04, 0.055, 0.055), trimMat);
        trim.position.set(p.x, p.y + side * (p.h / 2 + 0.025), p.z + 0.005);
        trim.rotation.x = p.rotX;
        wallGroup.add(trim);
      });

      [-1, 1].forEach((side) => {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.055, p.h, 0.055), trimMat);
        trim.position.set(side * (p.w / 2 + 0.025), p.y, p.z + 0.005);
        trim.rotation.x = p.rotX;
        wallGroup.add(trim);
      });
    });

    [-2.85, 2.85].forEach((x) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.09, 8.4, 0.09), steelMat);
      col.position.set(x, 0, -0.5);
      col.castShadow = true;
      wallGroup.add(col);

      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.8, 0.06), steelMat);
      brace.position.set(x * 0.88, 1.2, -1.4);
      brace.rotation.x = 0.55;
      brace.castShadow = true;
      wallGroup.add(brace);
    });

    [-3.2, 0.2, 2.8].forEach((y) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.78, 0.07, 0.07), steelMat);
      beam.position.set(0, y, -0.5);
      wallGroup.add(beam);
    });

    const padGroup = new THREE.Group();

    const padCanvas = document.createElement("canvas");
    padCanvas.width = 256;
    padCanvas.height = 128;
    const pctx = padCanvas.getContext("2d")!;
    pctx.fillStyle = "#111111";
    pctx.fillRect(0, 0, 256, 128);
    [64, 128, 192].forEach((x) => {
      pctx.strokeStyle = "#1a1a1a";
      pctx.lineWidth = 3;
      pctx.beginPath();
      pctx.moveTo(x, 0);
      pctx.lineTo(x, 128);
      pctx.stroke();
    });
    pctx.fillStyle = "#cc2200";
    pctx.fillRect(0, 0, 256, 14);
    pctx.fillRect(0, 114, 256, 14);
    const padTex = new THREE.CanvasTexture(padCanvas);

    const mainPad = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.28, 2.2),
      new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.95 }),
    );
    mainPad.position.set(0, -4.16, 1.1);
    mainPad.receiveShadow = true;
    padGroup.add(mainPad);

    (
      [
        [-2.8, 1.1],
        [-2.8, 0],
        [2.8, 1.1],
        [2.8, 0],
      ] as const
    ).forEach(([, cz]) => {
      const corner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 5.6, 10, 1),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }),
      );
      corner.rotation.z = Math.PI / 2;
      corner.position.set(0, -4.16, cz);
      padGroup.add(corner);
    });

    wallGroup.add(padGroup);

    const floorCanvas = document.createElement("canvas");
    floorCanvas.width = 256;
    floorCanvas.height = 256;
    const fctx = floorCanvas.getContext("2d")!;
    fctx.fillStyle = "#1c1c1c";
    fctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        fctx.strokeStyle = "#282828";
        fctx.lineWidth = 2;
        fctx.strokeRect(i * 32 + 1, j * 32 + 1, 30, 30);
      }
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 12),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -4.32, 1.5);
    floor.receiveShadow = true;
    wallGroup.add(floor);

    const ROUTE_COLORS = [0x00d4aa, 0xff4d3a, 0x3ab8ff, 0xffe03a, 0xff8c3a];

    const FEATURE_HOLD_POSITIONS: Array<{
      panelIdx: number;
      u: number;
      v: number;
      kind: "jug" | "sloper" | "crimp";
      scale: number;
    }> = [
      { panelIdx: 1, u: 0.34, v: 0.38, kind: "jug", scale: 1.3 },
      { panelIdx: 2, u: 0.52, v: 0.55, kind: "sloper", scale: 1.2 },
      { panelIdx: 3, u: 0.64, v: 0.45, kind: "jug", scale: 1.1 },
    ];

    const DECO_HOLD_DEFS: Array<{
      panelIdx: number;
      u: number;
      v: number;
      kind: "jug" | "crimp" | "sloper" | "pinch" | "pocket";
      scale: number;
      routeColorIdx: number;
    }> = [
      { panelIdx: 1, u: 0.18, v: 0.68, kind: "crimp", scale: 0.85, routeColorIdx: 1 },
      { panelIdx: 1, u: 0.72, v: 0.55, kind: "pocket", scale: 0.9, routeColorIdx: 1 },
      { panelIdx: 1, u: 0.82, v: 0.28, kind: "pinch", scale: 0.8, routeColorIdx: 1 },
      { panelIdx: 1, u: 0.26, v: 0.22, kind: "sloper", scale: 0.95, routeColorIdx: 2 },
      { panelIdx: 1, u: 0.62, v: 0.82, kind: "crimp", scale: 0.75, routeColorIdx: 2 },
      { panelIdx: 2, u: 0.22, v: 0.35, kind: "jug", scale: 0.9, routeColorIdx: 3 },
      { panelIdx: 2, u: 0.76, v: 0.68, kind: "pocket", scale: 0.85, routeColorIdx: 3 },
      { panelIdx: 2, u: 0.38, v: 0.72, kind: "crimp", scale: 0.8, routeColorIdx: 4 },
      { panelIdx: 3, u: 0.28, v: 0.58, kind: "crimp", scale: 0.85, routeColorIdx: 1 },
      { panelIdx: 3, u: 0.44, v: 0.25, kind: "pocket", scale: 0.9, routeColorIdx: 2 },
      { panelIdx: 3, u: 0.78, v: 0.62, kind: "sloper", scale: 0.8, routeColorIdx: 3 },
      { panelIdx: 3, u: 0.18, v: 0.82, kind: "jug", scale: 0.95, routeColorIdx: 4 },
      { panelIdx: 4, u: 0.32, v: 0.42, kind: "jug", scale: 1.05, routeColorIdx: 1 },
      { panelIdx: 4, u: 0.58, v: 0.65, kind: "crimp", scale: 0.9, routeColorIdx: 2 },
      { panelIdx: 4, u: 0.72, v: 0.35, kind: "pocket", scale: 0.85, routeColorIdx: 3 },
      { panelIdx: 0, u: 0.42, v: 0.55, kind: "jug", scale: 0.8, routeColorIdx: 0 },
      { panelIdx: 0, u: 0.68, v: 0.45, kind: "crimp", scale: 0.7, routeColorIdx: 1 },
    ];

    const holds: HoldData[] = [];

    function holdWorldPos(panelIdx: number, u: number, v: number): THREE.Vector3 {
      const p = panels[panelIdx]!;
      const lx = (u - 0.5) * p.w;
      const ly = (v - 0.5) * p.h;
      const lz = 0.05;
      const vec = new THREE.Vector3(p.x + lx, p.y + ly, p.z + lz);
      if (p.rotX !== 0) {
        const origin = new THREE.Vector3(p.x, p.y, p.z);
        vec.sub(origin);
        vec.applyEuler(new THREE.Euler(p.rotX, 0, 0));
        vec.add(origin);
      }
      return vec;
    }

    function makeSingleHold(
      kind: "jug" | "crimp" | "sloper" | "pinch" | "pocket",
      color: number,
      scale: number,
      panelRotX: number,
      isTappable: boolean,
    ): THREE.Group {
      const group = new THREE.Group();

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: kind === "sloper" ? 0.35 : 0.52,
        metalness: 0.05,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
      });

      switch (kind) {
        case "jug": {
          const body = new THREE.Mesh(
            new THREE.TorusGeometry(0.11 * scale, 0.048 * scale, 8, 14, Math.PI),
            mat,
          );
          body.rotation.z = Math.PI / 2;
          const plate = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13 * scale, 0.13 * scale, 0.06 * scale, 12),
            mat,
          );
          plate.rotation.x = Math.PI / 2;
          group.add(body, plate);
          break;
        }
        case "crimp": {
          const ledgeGeo = new THREE.BoxGeometry(0.28 * scale, 0.065 * scale, 0.14 * scale);
          const ledge = new THREE.Mesh(ledgeGeo, mat);
          ledge.position.z = 0.01;
          ledge.rotation.x = 0.18;
          group.add(ledge);
          break;
        }
        case "sloper": {
          const domeGeo = new THREE.SphereGeometry(0.15 * scale, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55);
          const dome = new THREE.Mesh(domeGeo, mat);
          dome.rotation.x = Math.PI;
          group.add(dome);
          break;
        }
        case "pinch": {
          const pinchGeo = new THREE.CapsuleGeometry(0.04 * scale, 0.18 * scale, 5, 8);
          const pinch = new THREE.Mesh(pinchGeo, mat);
          group.add(pinch);
          break;
        }
        case "pocket":
        default: {
          const discGeo = new THREE.CylinderGeometry(0.1 * scale, 0.12 * scale, 0.09 * scale, 12);
          const disc = new THREE.Mesh(discGeo, mat);
          disc.rotation.x = Math.PI / 2;
          const scoopGeo = new THREE.SphereGeometry(0.075 * scale, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
          const scoopMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color).multiplyScalar(0.4),
            roughness: 0.7,
          });
          const scoop = new THREE.Mesh(scoopGeo, scoopMat);
          scoop.rotation.x = Math.PI;
          scoop.position.z = 0.045 * scale;
          group.add(disc, scoop);
          break;
        }
      }

      const boltMat = new THREE.MeshStandardMaterial({
        color: 0x888880,
        roughness: 0.3,
        metalness: 0.9,
      });
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018 * scale, 0.018 * scale, 0.055 * scale, 6),
        boltMat,
      );
      bolt.rotation.x = Math.PI / 2;
      bolt.position.z = -0.01;

      const washer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034 * scale, 0.034 * scale, 0.012 * scale, 6),
        boltMat,
      );
      washer.rotation.x = Math.PI / 2;
      washer.position.z = 0.032 * scale;

      group.add(bolt, washer);

      const chalkGeo = new THREE.RingGeometry(0.13 * scale, 0.22 * scale, 20);
      const chalkMat = new THREE.MeshBasicMaterial({
        color: 0xfaf7f2,
        transparent: true,
        opacity: 0.25 + rng(color) * 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const chalk = new THREE.Mesh(chalkGeo, chalkMat);
      chalk.position.z = 0.002;
      group.add(chalk);

      if (isTappable) {
        const glowGeo = new THREE.RingGeometry(0.18 * scale, 0.24 * scale, 24);
        const glowMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.z = 0.001;
        group.add(glow);
      }

      group.rotation.x = -panelRotX;

      return group;
    }

    const initialActive = activeFeatureIdx;

    FEATURE_HOLD_POSITIONS.forEach((def, idx) => {
      const p = panels[def.panelIdx]!;
      const color = ROUTE_COLORS[0]!;
      const holdGroup = makeSingleHold(def.kind, color, def.scale, p.rotX, true);
      const wpos = holdWorldPos(def.panelIdx, def.u, def.v);
      holdGroup.position.copy(wpos);

      const hitSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 * def.scale, 10, 8),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.52,
          metalness: 0.05,
          emissive: new THREE.Color(idx === initialActive ? color : 0x000000),
          emissiveIntensity: idx === initialActive ? 0.55 : 0,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      hitSphere.position.copy(wpos);
      hitSphere.renderOrder = 999;
      wallGroup.add(hitSphere);

      wallGroup.add(holdGroup);
      holds.push({ mesh: hitSphere, featureIdx: idx, routeColor: color });
    });

    DECO_HOLD_DEFS.forEach((def, i) => {
      const p = panels[def.panelIdx]!;
      const color = ROUTE_COLORS[def.routeColorIdx % ROUTE_COLORS.length]!;
      const holdGroup = makeSingleHold(def.kind, color, def.scale, p.rotX, false);
      const wpos = holdWorldPos(def.panelIdx, def.u, def.v);
      holdGroup.position.copy(wpos);
      holdGroup.rotation.z = rng(i * 7.3 + 1.2) * Math.PI * 2;
      wallGroup.add(holdGroup);
    });

    const bucketGroup = new THREE.Group();
    const bucketBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.26, 14),
      new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.85 }),
    );
    const bucketChalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14),
      new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 1 }),
    );
    bucketChalk.position.y = 0.11;
    bucketGroup.add(bucketBody, bucketChalk);
    bucketGroup.position.set(2.4, -4.04, 1.6);
    bucketGroup.rotation.y = 0.3;
    wallGroup.add(bucketGroup);

    const brushGroup = new THREE.Group();
    const brushHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b3a1f, roughness: 0.7 }),
    );
    const brushHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 0.07),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.95 }),
    );
    brushHead.position.y = -0.27;
    brushGroup.add(brushHandle, brushHead);
    brushGroup.position.set(-2.2, -1.4, 0.1);
    brushGroup.rotation.z = 0.15;
    wallGroup.add(brushGroup);

    sceneRef.current = {
      renderer,
      scene,
      camera,
      wallGroup,
      holds,
      raycaster,
      activeFeatureIdx: initialActive,
    };

    updateHoldEmission(holds, initialActive);

    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      wallGroup.rotation.x = (rotateX.get() * Math.PI) / 180;
      wallGroup.rotation.y = (rotateY.get() * Math.PI) / 180;

      holds.forEach((h) => {
        if (h.featureIdx === sceneRef.current?.activeFeatureIdx && h.featureIdx !== null) {
          const mat = h.mesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.45 + Math.sin(t * 2.2) * 0.15;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, Math.max(h, 1));
    });
    ro.observe(mount);

    mount.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mount.removeEventListener("click", handleClick);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      sceneRef.current = null;
      wallTexture.dispose();
      wallNormal.dispose();
      padTex.dispose();
      floorTex.dispose();
    };
  }, [rotateX, rotateY, handleClick]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
    />
  );
}
