import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface SceneNode {
  id: string;
  running: boolean;
}

interface ClusterScene3DProps {
  nodes: SceneNode[];
  selectedId: string | null;
  tabIndex: number;
  reducedMotion: boolean;
}

interface SceneApi {
  setNodes: (nodes: SceneNode[]) => void;
  setSelected: (id: string | null) => void;
  setTab: (index: number) => void;
  dispose: () => void;
}

const CORE_RADIUS = 1.05;
const ORBIT_RADIUS = 2.7;
const TAB_COUNT = 5;

interface NodeEntry {
  id: string;
  running: boolean;
  mesh: THREE.Group;
  material: THREE.LineBasicMaterial;
  dir: THREE.Vector3;
  phase: number;
}

// Evenly spreads n points over a sphere so nodes never clump together.
const fibonacciDirection = (i: number, n: number): THREE.Vector3 => {
  const y = n === 1 ? 0 : 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * Math.PI * (3 - Math.sqrt(5));
  return new THREE.Vector3(Math.cos(theta) * r, y * 0.75, Math.sin(theta) * r).normalize();
};

function createScene(canvas: HTMLCanvasElement, reducedMotion: boolean): SceneApi | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
  } catch {
    return null; // No WebGL: the UI simply stays 2D.
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(0, 0, 10);

  const world = new THREE.Group(); // positioned on screen + pointer parallax
  const cluster = new THREE.Group(); // rotates with the active tab
  world.add(cluster);
  scene.add(world);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const lineMaterial = (opacity: number) =>
    track(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false }));

  // Core: the proxy hub every service hangs off.
  const coreOuter = new THREE.LineSegments(
    track(new THREE.WireframeGeometry(track(new THREE.IcosahedronGeometry(CORE_RADIUS, 1)))),
    lineMaterial(0.28),
  );
  const coreInner = new THREE.LineSegments(
    track(new THREE.WireframeGeometry(track(new THREE.OctahedronGeometry(CORE_RADIUS * 0.48, 0)))),
    lineMaterial(0.75),
  );
  cluster.add(coreOuter, coreInner);

  // Orbit rings
  const ringGeometry = track(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * ORBIT_RADIUS, 0, Math.sin(a) * ORBIT_RADIUS);
      }),
    ),
  );
  const ringA = new THREE.Line(ringGeometry, lineMaterial(0.12));
  ringA.rotation.set(0.35, 0, 0.12);
  const ringB = new THREE.Line(ringGeometry, lineMaterial(0.07));
  ringB.rotation.set(-0.9, 0, 0.5);
  ringB.scale.setScalar(1.22);
  cluster.add(ringA, ringB);

  // Distant dust for depth
  const dustCount = 420;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(4.5 + Math.random() * 7);
    dustPositions.set([v.x, v.y, v.z], i * 3);
  }
  const dustGeometry = track(new THREE.BufferGeometry());
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    track(
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.035,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    ),
  );
  scene.add(dust);

  // Service nodes (rebuilt whenever the container set changes)
  // Each service is a small shipping container: box outline, corrugated long sides, a door seam.
  const [cw, ch, cd] = [0.62, 0.3, 0.3];
  const boxGeometry = track(new THREE.BoxGeometry(cw, ch, cd));
  const outline = track(new THREE.EdgesGeometry(boxGeometry));
  const containerLines = Array.from(outline.getAttribute('position').array as Float32Array);
  for (let i = 1; i < 8; i++) {
    const x = -cw / 2 + (cw * i) / 8;
    for (const z of [-cd / 2, cd / 2]) containerLines.push(x, -ch / 2, z, x, ch / 2, z);
  }
  containerLines.push(cw / 2, -ch / 2, 0, cw / 2, ch / 2, 0);
  const containerGeometry = track(new THREE.BufferGeometry());
  containerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(containerLines, 3));
  // Opaque body so a container hides the lines behind it and reads as a solid object.
  const bodyMaterial = track(
    new THREE.MeshBasicMaterial({ color: 0x060606, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
  );
  const nodeGroup = new THREE.Group();
  cluster.add(nodeGroup);
  let entries: NodeEntry[] = [];
  let selectedId: string | null = null;

  const linkGeometry = track(new THREE.BufferGeometry());
  const links = new THREE.LineSegments(linkGeometry, lineMaterial(0.13));
  links.frustumCulled = false;
  cluster.add(links);

  const pulseGeometry = track(new THREE.BufferGeometry());
  const pulses = new THREE.Points(
    pulseGeometry,
    track(
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.09,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    ),
  );
  pulses.frustumCulled = false;
  cluster.add(pulses);
  let running: NodeEntry[] = [];

  const setNodes = (nodes: SceneNode[]) => {
    for (const entry of entries) entry.material.dispose();
    nodeGroup.clear();

    entries = nodes.map((node, i) => {
      const dir = fibonacciDirection(i, nodes.length);
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: node.running ? 0.9 : 0.22,
        depthWrite: false,
      });
      const mesh = new THREE.Group();
      mesh.add(new THREE.Mesh(boxGeometry, bodyMaterial), new THREE.LineSegments(containerGeometry, material));
      mesh.position.copy(dir).multiplyScalar(ORBIT_RADIUS);
      mesh.rotation.set(0.25, i * 0.9, 0.1);
      nodeGroup.add(mesh);
      return { id: node.id, running: node.running, mesh, material, dir, phase: (i * 0.37) % 1 };
    });
    running = entries.filter((e) => e.running);

    const linkPositions = new Float32Array(entries.length * 6);
    entries.forEach((entry, i) => {
      const a = entry.dir.clone().multiplyScalar(CORE_RADIUS);
      const b = entry.dir.clone().multiplyScalar(ORBIT_RADIUS - 0.4);
      linkPositions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
    });
    linkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
    pulseGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(running.length * 3), 3));
    renderOnceIfStatic();
  };

  // Layout: keep the cluster in the right part of the viewport, centred on narrow screens.
  const resize = () => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const visibleWidth = visibleHeight * camera.aspect;
    const wide = visibleWidth > 11;
    world.position.set(wide ? visibleWidth / 2 - 3.6 : 0, wide ? 0.4 : 0, 0);
    world.scale.setScalar(wide ? 1 : 0.8);
    renderOnceIfStatic();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const pointer = { x: 0, y: 0 };
  const onPointerMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!reducedMotion) window.addEventListener('pointermove', onPointerMove, { passive: true });

  let targetTabAngle = 0;
  let time = 0;
  let last = performance.now();
  let frame = 0;

  const update = (dt: number) => {
    time += dt;
    const ease = 1 - Math.exp(-dt * 3.5);

    cluster.rotation.y += (targetTabAngle + time * 0.05 - cluster.rotation.y) * ease;
    world.rotation.x += (pointer.y * 0.14 + 0.18 - world.rotation.x) * ease;
    world.rotation.y += (pointer.x * 0.2 - world.rotation.y) * ease;

    coreOuter.rotation.y = time * 0.12;
    coreOuter.rotation.x = time * 0.07;
    coreInner.rotation.y = -time * 0.4;
    coreInner.rotation.z = time * 0.25;
    dust.rotation.y = time * 0.01;

    for (const entry of entries) {
      const isSelected = entry.id === selectedId;
      const targetScale = isSelected ? 1.7 : 1;
      entry.mesh.scale.setScalar(entry.mesh.scale.x + (targetScale - entry.mesh.scale.x) * ease);
      if (entry.running) {
        entry.mesh.rotation.y += dt * 0.45;
      }
      const targetOpacity = isSelected ? 1 : entry.running ? 0.9 : 0.22;
      entry.material.opacity += (targetOpacity - entry.material.opacity) * ease;
    }

    // Traffic pulses travel from the core out to every running service.
    const pulseAttr = pulseGeometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (pulseAttr && pulseAttr.count === running.length) {
      running.forEach((entry, i) => {
        const t = (time * 0.45 + entry.phase) % 1;
        const r = CORE_RADIUS + t * (ORBIT_RADIUS - 0.4 - CORE_RADIUS);
        pulseAttr.setXYZ(i, entry.dir.x * r, entry.dir.y * r, entry.dir.z * r);
      });
      pulseAttr.needsUpdate = true;
    }
  };

  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    renderer.render(scene, camera);
  };

  // With reduced motion there is no loop: the scene is a still image redrawn on state changes.
  function renderOnceIfStatic() {
    if (!reducedMotion) return;
    update(10);
    time = 0;
    renderer.render(scene, camera);
  }

  const start = () => {
    if (reducedMotion || frame) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  start();

  return {
    setNodes,
    setSelected: (id) => {
      selectedId = id;
      renderOnceIfStatic();
    },
    setTab: (index) => {
      // Keep the continuous drift, only change the offset so the turn is a short arc.
      targetTabAngle = (index / TAB_COUNT) * Math.PI * 2;
      renderOnceIfStatic();
    },
    dispose: () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      for (const entry of entries) entry.material.dispose();
      for (const item of disposables) item.dispose();
      renderer.dispose();
    },
  };
}

/**
 * Ambient 3D view of the cluster: the proxy core in the middle, one shipping container per service
 * (bright + spinning when running, dim when stopped), traffic pulses on the links.
 * Purely decorative: it never receives pointer events and is hidden from assistive tech.
 */
const ClusterScene3D = ({ nodes, selectedId, tabIndex, reducedMotion }: ClusterScene3DProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<SceneApi | null>(null);

  // Stats polling replaces the container array constantly; only rebuild when ids/status change.
  const signature = nodes.map((n) => `${n.id}:${n.running ? 1 : 0}`).join('|');

  useEffect(() => {
    if (!canvasRef.current) return;
    const api = createScene(canvasRef.current, reducedMotion);
    apiRef.current = api;
    return () => {
      api?.dispose();
      apiRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    apiRef.current?.setNodes(nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, reducedMotion]);

  useEffect(() => {
    apiRef.current?.setSelected(selectedId);
  }, [selectedId, reducedMotion]);

  useEffect(() => {
    apiRef.current?.setTab(tabIndex);
  }, [tabIndex, reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className="block w-full h-full" />;
};

export default ClusterScene3D;
