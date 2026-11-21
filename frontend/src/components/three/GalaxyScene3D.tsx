import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** One app in the universe view. */
export interface GalaxyPlanet {
  id: string;
  label: string;
  running: boolean;
  hasGit: boolean;
}

/** One branch orbiting the focused app. */
export interface GalaxyBranch {
  name: string;
  deployed: boolean;
  isDefault: boolean;
}

interface GalaxyScene3DProps {
  planets: GalaxyPlanet[];
  /** Focused app: its branch galaxy is shown. null = universe view. */
  focusId: string | null;
  focusLabel: string;
  branches: GalaxyBranch[];
  selectedBranch: string | null;
  reducedMotion: boolean;
  onPickPlanet: (id: string) => void;
  onPickBranch: (name: string) => void;
  /** Called once if WebGL is not available, so the view can fall back to its lists. */
  onUnsupported?: () => void;
}

interface Handlers {
  onPickPlanet: (id: string) => void;
  onPickBranch: (name: string) => void;
}

interface SceneApi {
  setPlanets: (planets: GalaxyPlanet[]) => void;
  setFocus: (id: string | null, label: string, branches: GalaxyBranch[]) => void;
  setSelectedBranch: (name: string | null) => void;
  setHandlers: (h: Handlers) => void;
  dispose: () => void;
}

/** At most this many branches are drawn; the side list always has all of them. */
export const MAX_3D_BRANCHES = 24;

const UP = new THREE.Vector3(0, 1, 0);

// A fading material remembers its full opacity so a whole level can fade in or out.
type FadeMaterial = (THREE.LineBasicMaterial | THREE.MeshBasicMaterial | THREE.PointsMaterial) & {
  userData: { base: number };
};

interface Pickable {
  kind: 'planet' | 'branch';
  key: string;
  group: THREE.Group; // scaled for hover/selection
  label: HTMLDivElement;
  baseScale: number;
  spin: number;
}

function circlePoints(radius: number, segments = 96): THREE.Vector3[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  });
}

function createScene(canvas: HTMLCanvasElement, labelLayer: HTMLDivElement, reducedMotion: boolean): SceneApi | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
  camera.position.set(0, 0, 9);
  // Camera distance: fixed for the universe, fitted to the outermost orbit in a galaxy.
  let universeZ = 9;
  let galaxyZ = 7;

  const stage = new THREE.Group(); // tilt + pointer parallax
  const universe = new THREE.Group();
  const galaxy = new THREE.Group();
  stage.add(universe, galaxy);
  scene.add(stage);

  // Shared geometries (disposed once at the end).
  const shared: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T): T => {
    shared.push(x);
    return x;
  };
  const sphereWire = keep(new THREE.WireframeGeometry(keep(new THREE.IcosahedronGeometry(1, 1))));
  const sphereSolid = keep(new THREE.IcosahedronGeometry(0.97, 1));
  const coreWire = keep(new THREE.WireframeGeometry(keep(new THREE.OctahedronGeometry(1, 0))));
  const hitGeometry = keep(new THREE.SphereGeometry(1.6, 8, 6));
  const unitRing = keep(new THREE.BufferGeometry().setFromPoints(circlePoints(1, 64)));
  const hitMaterial = keep(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));

  // Per-level materials, rebuilt with the level.
  let universeMats: FadeMaterial[] = [];
  let galaxyMats: FadeMaterial[] = [];
  const lineMat = (list: FadeMaterial[], opacity: number): THREE.LineBasicMaterial => {
    const m = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false }) as FadeMaterial &
      THREE.LineBasicMaterial;
    m.userData.base = opacity;
    list.push(m);
    return m;
  };
  // Opaque-looking body so a planet hides the lines behind it; it fades with its level.
  const bodyMat = (list: FadeMaterial[]): THREE.MeshBasicMaterial => {
    const m = new THREE.MeshBasicMaterial({
      color: 0x050505,
      transparent: true,
      opacity: 1,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }) as FadeMaterial & THREE.MeshBasicMaterial;
    m.userData.base = 1;
    list.push(m);
    return m;
  };

  // Background dust (static).
  const dustPositions = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(9 + Math.random() * 14);
    dustPositions.set([v.x, v.y, v.z], i * 3);
  }
  const dustGeometry = keep(new THREE.BufferGeometry());
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    keep(new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.35, depthWrite: false })),
  );
  scene.add(dust);

  let handlers: Handlers = { onPickPlanet: () => {}, onPickBranch: () => {} };
  let pickables: Pickable[] = [];
  let hovered: string | null = null;
  let selectedBranch: string | null = null;
  let focusId: string | null = null;
  let planetPositions = new Map<string, THREE.Vector3>();

  const makeLabel = (text: string, kind: 'planet' | 'branch' | 'star'): HTMLDivElement => {
    const el = document.createElement('div');
    el.textContent = text; // textContent: names are never interpreted as HTML
    el.className =
      kind === 'star'
        ? 'absolute left-0 top-0 whitespace-nowrap rounded-md border border-white/30 bg-black/70 px-2 py-0.5 font-mono text-[13px] font-semibold text-white pointer-events-none'
        : 'absolute left-0 top-0 whitespace-nowrap rounded-md border border-[#262626] bg-black/60 px-1.5 py-0.5 font-mono text-[12px] text-zinc-200 pointer-events-none transition-colors';
    el.style.willChange = 'transform, opacity';
    if (kind === 'star') el.style.zIndex = '10'; // the app name stays readable over passing branches
    labelLayer.appendChild(el);
    return el;
  };

  const clearLevel = (group: THREE.Group, mats: FadeMaterial[], kind: Pickable['kind'] | null) => {
    group.clear();
    for (const m of mats) m.dispose();
    if (kind) {
      pickables = pickables.filter((p) => {
        if (p.kind !== kind) return true;
        p.label.remove();
        return false;
      });
    }
  };

  // Builds one wireframe "planet": opaque body, wire shell, optional orbit ring marker.
  const makePlanet = (
    list: FadeMaterial[],
    body: THREE.MeshBasicMaterial,
    radius: number,
    opacity: number,
    ring: boolean,
  ) => {
    const group = new THREE.Group();
    const bodyMesh = new THREE.Mesh(sphereSolid, body);
    const wire = new THREE.LineSegments(sphereWire, lineMat(list, opacity));
    group.add(bodyMesh, wire);
    if (ring) {
      const r = new THREE.Line(unitRing, lineMat(list, opacity * 0.8));
      r.scale.setScalar(1.6);
      r.rotation.set(0.5, 0, 0.25);
      group.add(r);
    }
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    group.add(hit);
    group.scale.setScalar(radius);
    return { group, hit };
  };

  const setPlanets = (planets: GalaxyPlanet[]) => {
    clearLevel(universe, universeMats, 'planet');
    universeMats = [];
    planetPositions = new Map();
    const body = bodyMat(universeMats);

    // Core: Akson itself.
    const core = new THREE.LineSegments(coreWire, lineMat(universeMats, 0.8));
    core.scale.setScalar(0.7);
    core.name = 'core';
    universe.add(core);
    for (const [r, o] of [
      [2.6, 0.1],
      [3.6, 0.07],
      [4.6, 0.05],
    ] as const) {
      const orbit = new THREE.Line(unitRing, lineMat(universeMats, o));
      orbit.scale.setScalar(r);
      universe.add(orbit);
    }

    planets.forEach((p, i) => {
      const n = planets.length;
      const angle = (i / Math.max(n, 1)) * Math.PI * 2 + 0.4;
      const radius = 2.6 + (i % 3);
      const pos = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(i * 1.7) * 0.25, Math.sin(angle) * radius);
      const size = p.hasGit ? 0.42 : 0.32;
      const { group } = makePlanet(universeMats, body, size, p.running ? 0.9 : 0.3, p.hasGit);
      group.position.copy(pos);
      group.userData = { kind: 'planet', key: p.id };
      universe.add(group);
      planetPositions.set(p.id, pos);
      pickables.push({
        kind: 'planet',
        key: p.id,
        group,
        label: makeLabel(p.label, 'planet'),
        baseScale: size,
        spin: p.running ? 0.35 : 0.05,
      });
    });
    renderOnceIfStatic();
  };

  let galaxyStarLabel: HTMLDivElement | null = null;

  const setFocus = (id: string | null, label: string, branches: GalaxyBranch[]) => {
    focusId = id;
    clearLevel(galaxy, galaxyMats, 'branch');
    galaxyMats = [];
    galaxyStarLabel?.remove();
    galaxyStarLabel = null;
    if (!id) {
      renderOnceIfStatic();
      return;
    }

    const body = bodyMat(galaxyMats);
    // Centre star: the app itself.
    const star = makePlanet(galaxyMats, body, 0.85, 0.85, false);
    star.group.remove(star.hit);
    const inner = new THREE.LineSegments(coreWire, lineMat(galaxyMats, 0.9));
    inner.scale.setScalar(0.45 / 0.85);
    star.group.add(inner);
    star.group.name = 'star';
    galaxy.add(star.group);
    galaxyStarLabel = makeLabel(label, 'star');

    const shown = branches.slice(0, MAX_3D_BRANCHES);
    const outer = 1.9 + Math.max(0, shown.length - 1) * (shown.length > 12 ? 0.22 : 0.42);
    galaxyZ = Math.min(16, Math.max(6, outer * 2.1 + 1.5));
    shown.forEach((b, i) => {
      const orbitRadius = 1.9 + i * (shown.length > 12 ? 0.22 : 0.42);
      const orbit = new THREE.Line(unitRing, lineMat(galaxyMats, b.deployed ? 0.22 : 0.07));
      orbit.scale.setScalar(orbitRadius);
      galaxy.add(orbit);

      const size = b.isDefault ? 0.3 : b.deployed ? 0.26 : 0.17;
      const { group } = makePlanet(galaxyMats, body, size, b.deployed || b.isDefault ? 0.95 : 0.6, b.deployed);
      // Position is set every frame from the orbit angle.
      group.userData = {
        kind: 'branch',
        key: b.name,
        orbitRadius,
        phase: i * 2.399963,
        speed: 0.22 / Math.sqrt(orbitRadius),
      };
      galaxy.add(group);
      pickables.push({
        kind: 'branch',
        key: b.name,
        group,
        label: makeLabel(b.name, 'branch'),
        baseScale: size,
        spin: 0.5,
      });
    });
    renderOnceIfStatic();
  };

  // --- Layout & input ---
  const resize = () => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    universeZ = camera.aspect < 0.9 ? 14 : 8.5;
    camera.updateProjectionMatrix();
    renderOnceIfStatic();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0 };
  let downAt: { x: number; y: number } | null = null;

  const pick = (e: PointerEvent): Pickable | null => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const level = focusId ? 'branch' : 'planet';
    const candidates = pickables.filter((p) => p.kind === level).map((p) => p.group);
    const hit = raycaster.intersectObjects(candidates, true)[0];
    if (!hit) return null;
    let obj: THREE.Object3D | null = hit.object;
    while (obj && !obj.userData?.kind) obj = obj.parent;
    return obj ? pickables.find((p) => p.group === obj) ?? null : null;
  };

  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const p = pick(e);
    const key = p ? `${p.kind}:${p.key}` : null;
    if (key !== hovered) {
      hovered = key;
      canvas.style.cursor = p ? 'pointer' : 'default';
      renderOnceIfStatic();
    }
  };
  const onPointerDown = (e: PointerEvent) => {
    downAt = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const from = downAt;
    downAt = null;
    if (!from || Math.hypot(e.clientX - from.x, e.clientY - from.y) > 6) return;
    const p = pick(e);
    if (!p) return;
    if (p.kind === 'planet') handlers.onPickPlanet(p.key);
    else handlers.onPickBranch(p.key);
  };
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  const onPointerLeave = () => {
    pointer.x = 0;
    pointer.y = 0;
    if (hovered !== null) {
      hovered = null;
      canvas.style.cursor = 'default';
      renderOnceIfStatic();
    }
  };
  canvas.addEventListener('pointerleave', onPointerLeave);

  // --- Animation ---
  let universeFade = 1;
  let galaxyFade = 0;
  let spin = 0;
  let time = 0;
  let last = performance.now();
  let frame = 0;
  const tmp = new THREE.Vector3();
  const projected = new THREE.Vector3();

  const applyFade = (mats: FadeMaterial[], f: number) => {
    for (const m of mats) m.opacity = m.userData.base * f;
  };

  const placeLabel = (
    el: HTMLDivElement,
    obj: THREE.Object3D,
    fade: number,
    offsetY: number,
    emphasis: boolean,
    below = false,
  ) => {
    obj.getWorldPosition(projected);
    projected.y += offsetY;
    projected.project(camera);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const visible = fade > 0.2 && projected.z < 1;
    el.style.opacity = visible ? String(Math.min(1, fade) * (emphasis ? 1 : 0.85)) : '0';
    if (!visible) return;
    const x = (projected.x * 0.5 + 0.5) * w;
    const y = (-projected.y * 0.5 + 0.5) * h;
    el.style.transform = `translate(-50%, ${below ? '0' : '-100%'}) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.style.borderColor = emphasis ? 'rgba(255,255,255,0.7)' : '';
    el.style.color = emphasis ? '#fff' : '';
  };

  const update = (dt: number) => {
    time += dt;
    const ease = 1 - Math.exp(-dt * 4);
    const focused = focusId !== null;

    universeFade += ((focused ? 0 : 1) - universeFade) * ease;
    galaxyFade += ((focused ? 1 : 0) - galaxyFade) * ease;
    if (!focused) spin += dt * 0.04;

    stage.rotation.x += (0.42 + pointer.y * 0.12 - stage.rotation.x) * ease;
    stage.rotation.y += (pointer.x * 0.18 - stage.rotation.y) * ease;
    universe.rotation.y = spin;
    const targetZ = focused ? galaxyZ : universeZ;
    camera.position.z += (targetZ - camera.position.z) * ease;

    // Zoom the universe into the focused planet while it fades out.
    const targetScale = focused ? 3.2 : 1;
    const s = universe.scale.x + (targetScale - universe.scale.x) * ease;
    universe.scale.setScalar(s);
    const focusPos = focusId ? planetPositions.get(focusId) : undefined;
    if (focused && focusPos) {
      tmp.copy(focusPos).multiplyScalar(s).applyAxisAngle(UP, spin).negate();
    } else {
      tmp.set(0, 0, 0);
    }
    universe.position.lerp(tmp, ease);
    universe.visible = universeFade > 0.01;

    galaxy.visible = galaxyFade > 0.01;
    galaxy.scale.setScalar(0.35 + 0.65 * galaxyFade);
    galaxy.rotation.y = time * 0.03;

    applyFade(universeMats, universeFade);
    applyFade(galaxyMats, galaxyFade);

    const core = universe.getObjectByName('core');
    if (core) {
      core.rotation.y = time * 0.3;
      core.rotation.x = time * 0.17;
    }
    const star = galaxy.getObjectByName('star');
    if (star) star.rotation.y = time * 0.15;

    for (const p of pickables) {
      const data = p.group.userData as { orbitRadius?: number; phase?: number; speed?: number };
      if (p.kind === 'branch' && data.orbitRadius !== undefined) {
        const a = (data.phase ?? 0) + time * (data.speed ?? 0);
        p.group.position.set(Math.cos(a) * data.orbitRadius, Math.sin(a * 2) * 0.08, Math.sin(a) * data.orbitRadius);
      }
      const isHovered = hovered === `${p.kind}:${p.key}`;
      const isSelected = p.kind === 'branch' && p.key === selectedBranch;
      const target = p.baseScale * (isSelected ? 1.7 : isHovered ? 1.3 : 1);
      p.group.scale.setScalar(p.group.scale.x + (target - p.group.scale.x) * ease);
      p.group.rotation.y += dt * p.spin;
      const fade = p.kind === 'planet' ? universeFade : galaxyFade;
      placeLabel(p.label, p.group, fade, p.group.scale.x + 0.15, isHovered || isSelected);
    }
    // The star's name sits under it so it never collides with branch labels above.
    if (galaxyStarLabel && star) placeLabel(galaxyStarLabel, star, galaxyFade, -1.05, true, true);
    dust.rotation.y = time * 0.005;
  };

  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    renderer.render(scene, camera);
  };

  // Reduced motion: no loop, every state change jumps straight to its end state.
  function renderOnceIfStatic() {
    if (!reducedMotion) return;
    update(10);
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
    setPlanets,
    setFocus,
    setSelectedBranch: (name) => {
      selectedBranch = name;
      renderOnceIfStatic();
    },
    setHandlers: (h) => {
      handlers = h;
    },
    dispose: () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      resizeObserver.disconnect();
      clearLevel(universe, universeMats, 'planet');
      clearLevel(galaxy, galaxyMats, 'branch');
      galaxyStarLabel?.remove();
      for (const item of shared) item.dispose();
      renderer.dispose();
    },
  };
}

/**
 * Interactive 3D map for the Galaxy tab. Universe level: Akson in the middle, one planet
 * per app (ringed when it was deployed from git). Clicking a planet zooms into its own
 * galaxy: the app as a star with its git branches orbiting it. Labels are plain DOM
 * elements projected from 3D. Keyboard users get the same actions from the side lists.
 */
const GalaxyScene3D = ({
  planets,
  focusId,
  focusLabel,
  branches,
  selectedBranch,
  reducedMotion,
  onPickPlanet,
  onPickBranch,
  onUnsupported,
}: GalaxyScene3DProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const unsupportedRef = useRef(onUnsupported);
  useEffect(() => {
    unsupportedRef.current = onUnsupported;
  }, [onUnsupported]);

  const planetSig = planets.map((p) => `${p.id}:${p.label}:${p.running ? 1 : 0}:${p.hasGit ? 1 : 0}`).join('|');
  const branchSig = branches.map((b) => `${b.name}:${b.deployed ? 1 : 0}:${b.isDefault ? 1 : 0}`).join('|');

  useEffect(() => {
    if (!canvasRef.current || !labelsRef.current) return;
    const api = createScene(canvasRef.current, labelsRef.current, reducedMotion);
    if (!api) unsupportedRef.current?.();
    apiRef.current = api;
    return () => {
      api?.dispose();
      apiRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    apiRef.current?.setHandlers({ onPickPlanet, onPickBranch });
  }, [onPickPlanet, onPickBranch, reducedMotion]);

  useEffect(() => {
    apiRef.current?.setPlanets(planets);
    // planetSig captures everything the scene draws from planets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planetSig, reducedMotion]);

  useEffect(() => {
    apiRef.current?.setFocus(focusId, focusLabel, branches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusLabel, branchSig, reducedMotion]);

  useEffect(() => {
    apiRef.current?.setSelectedBranch(selectedBranch);
  }, [selectedBranch, reducedMotion]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full touch-none" aria-hidden="true" />
      <div ref={labelsRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
};

export default GalaxyScene3D;
