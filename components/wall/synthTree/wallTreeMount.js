import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTreePointCloud, smoothstep } from './treePointCloud.js';
import { attachSourcesToAnchors, buildTreePostcardAnchors } from './treePostcardAnchors.js';

/** Fork SimpleSynthTree 기본값 — outline 모드 */
const params = {
  randomSeed: 32,
  trunkHeight: 17.3,
  trunkRadius: 0.88,
  branchCount: 10,
  secondaryBranchCount: 2,
  tertiaryBranchCount: 1,
  leafDensity: 180,
  postcardScale: 1,
  canopyWidth: 2.18,
  canopyBaseHeight: 0.18,
  canopyRoundness: 1.39,
  lateralSpread: 0.83,
  windSway: 0.66,
  rotationSpeed: 0.0015,
  cameraZoom: 44,
  renderMode: 'outline',
};

const defaultView = {
  cameraPosition: new THREE.Vector3(-0.06, 3.76, 44),
  target: new THREE.Vector3(-0.06, 3.76, 0),
};

const colorState = {
  background: '#5f983f',
  trunkFill: '#ff2600',
  trunkLine: '#f5e34f',
  ground: '#ff6a00',
  groundOpacity: 1,
};

function cloneSilhouetteSpecs(specs) {
  return specs.map((spec) => ({
    ...spec,
    points: spec.points.map((point) => point.clone()),
  }));
}

function mergeUrlsForAnchors(cardUrls, fillerUrls, count) {
  const primary = (cardUrls || []).map((u) => String(u || '').trim()).filter(Boolean);
  const pool = (fillerUrls || []).map((u) => String(u || '').trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    if (i < primary.length) out.push(primary[i]);
    else if (pool.length) out.push(pool[(i - primary.length) % pool.length]);
    else out.push('');
  }
  return out;
}

/**
 * @param {HTMLElement} root
 * @param {{ getCardUrls?: () => string[], getFillerUrls?: () => string[] }} opts
 */
export function mountSynthTreeWall(root, opts = {}) {
  const getCardUrls = typeof opts.getCardUrls === 'function' ? opts.getCardUrls : () => [];
  const getFillerUrls = typeof opts.getFillerUrls === 'function' ? opts.getFillerUrls : () => [];

  /** 트리가 보이는 기준점: 가로 중앙, 세로는 하단 쪽(모바일에서 나무를 아래로) */
  const cameraDisplayState = {
    screenOriginX: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 400,
    screenOriginY: typeof window !== 'undefined' ? window.innerHeight * 0.8 : 360,
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.Fog(colorState.background, 36, 92);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 160);
  camera.position.copy(defaultView.cameraPosition);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.screenSpacePanning = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(defaultView.target);
  controls.enabled = false;

  const ambientLight = new THREE.HemisphereLight('#fff4d1', '#4e4338', 1.35);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight('#fff6dc', 1.25);
  directionalLight.position.set(9, 18, 10);
  scene.add(directionalLight);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(15, 96),
    new THREE.MeshBasicMaterial({
      color: colorState.ground,
      transparent: true,
      opacity: colorState.groundOpacity,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  scene.add(ground);

  const treeGroup = new THREE.Group();
  scene.add(treeGroup);

  const pointMaterial = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: false,
    opacity: 1,
    sizeAttenuation: true,
    fog: false,
  });
  const leafPointMaterial = new THREE.PointsMaterial({
    size: 0.22,
    vertexColors: true,
    transparent: false,
    opacity: 1,
    sizeAttenuation: true,
    fog: false,
  });
  const branchLineMaterial = new THREE.LineBasicMaterial({
    color: colorState.trunkLine,
    transparent: false,
    opacity: 1,
    fog: false,
  });
  const branchFillMaterial = new THREE.MeshBasicMaterial({
    color: colorState.trunkFill,
    transparent: false,
    opacity: 1,
    fog: false,
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const postcardGeometry = new THREE.PlaneGeometry(1, 1);
  const postcardTextureLoader = new THREE.TextureLoader();

  let treePoints = null;
  let treeLeafPoints = null;
  let treeLines = [];
  let treeFillMeshes = [];
  let treeOutlineLinePairs = [];
  let postcardMeshes = [];
  let elapsed = 0;
  let latestSilhouetteSpecs = [];
  let baseTreePointPositions = null;
  let baseLeafPointPositions = null;
  let baseBranchLinePositions = [];
  let baseSilhouetteSpecs = [];
  let postcardData = [];
  const postcardAspectCache = new Map();
  const postcardTextureCache = new Map();
  let postcardLoadToken = 0;
  let postcardLoadTimer = null;

  const postcardParentQuaternion = new THREE.Quaternion();
  const postcardInverseParentQuaternion = new THREE.Quaternion();
  const postcardLocalBillboardQuaternion = new THREE.Quaternion();

  let rafId = null;
  let resizeObs = null;

  function resetScreenOriginToViewport() {
    cameraDisplayState.screenOriginX = window.innerWidth * 0.5;
    cameraDisplayState.screenOriginY = window.innerHeight * 0.8;
  }

  function alignCameraAxisToScreenOrigin() {
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const width = Math.max(root.clientWidth, 1);
    const height = Math.max(root.clientHeight, 1);
    const desiredNdcX = (cameraDisplayState.screenOriginX / width) * 2 - 1;
    const desiredNdcY = 1 - (cameraDisplayState.screenOriginY / height) * 2;
    const elements = camera.projectionMatrix.elements;
    elements[8] = -desiredNdcX;
    elements[9] = -desiredNdcY;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function frameCameraToTreeStart() {
    camera.position.set(defaultView.cameraPosition.x, defaultView.cameraPosition.y, params.cameraZoom);
    controls.target.copy(defaultView.target);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    alignCameraAxisToScreenOrigin();
    controls.update();
  }

  function applyColorToDomAndFog() {
    if (typeof document !== 'undefined') {
      document.documentElement.style.background = colorState.background;
    }
    root.style.background = colorState.background;
    scene.fog.color.set(colorState.background);
    branchLineMaterial.color.set(colorState.trunkLine);
    branchFillMaterial.color.set(colorState.trunkFill);
    ground.material.color.set(colorState.ground);
    ground.material.opacity = colorState.groundOpacity;
  }

  function getPostcardAspectRatio(url) {
    if (!url) return 1;
    const cached = postcardAspectCache.get(url);
    if (typeof cached === 'number' && Number.isFinite(cached) && cached > 0) return cached;
    if (cached === 'loading') return 1;
    postcardAspectCache.set(url, 'loading');
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const w = image.naturalWidth || 1;
      const h = image.naturalHeight || 1;
      postcardAspectCache.set(url, w / Math.max(h, 1));
    };
    image.onerror = () => {
      postcardAspectCache.set(url, 1);
    };
    image.src = url;
    return 1;
  }

  function getPostcardTexture(url) {
    if (!url) return null;
    const cached = postcardTextureCache.get(url);
    if (cached) return cached;
    const texture = postcardTextureLoader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    postcardTextureCache.set(url, texture);
    return texture;
  }

  function clearPostcardLoadSequence() {
    postcardLoadToken += 1;
    if (postcardLoadTimer) {
      window.clearTimeout(postcardLoadTimer);
      postcardLoadTimer = null;
    }
  }

  function createPostcardMesh(card) {
    const texture = getPostcardTexture(card.sourceUrl);
    const material = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      map: texture,
      transparent: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(postcardGeometry.clone(), material);
  }

  function loadPostcardMeshSequentially(index, token) {
    if (token !== postcardLoadToken || index >= postcardData.length) return;
    const card = postcardData[index];
    if (!card?.sourceUrl) {
      postcardLoadTimer = window.setTimeout(() => loadPostcardMeshSequentially(index + 1, token), 16);
      return;
    }
    const cachedTexture = postcardTextureCache.get(card.sourceUrl);
    const finishLoad = () => {
      if (token !== postcardLoadToken) return;
      const mesh = createPostcardMesh(card);
      postcardMeshes[index] = mesh;
      treeGroup.add(mesh);
      applyWindDeformation();
      postcardLoadTimer = window.setTimeout(() => loadPostcardMeshSequentially(index + 1, token), 45);
    };
    if (cachedTexture) {
      finishLoad();
      return;
    }
    postcardTextureLoader.load(
      card.sourceUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        postcardTextureCache.set(card.sourceUrl, texture);
        finishLoad();
      },
      undefined,
      () => {
        if (token !== postcardLoadToken) return;
        postcardLoadTimer = window.setTimeout(() => loadPostcardMeshSequentially(index + 1, token), 16);
      },
    );
  }

  function constrainPostcardPositionToBranches(position, branchLinesArg) {
    if (!Array.isArray(branchLinesArg) || branchLinesArg.length === 0) return position.clone();
    let nearestPoint = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const line of branchLinesArg) {
      for (let i = 0; i < line.length; i += 1) {
        const point = line[i];
        const distance = position.distanceTo(point);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPoint = point;
        }
      }
    }
    if (!nearestPoint) return position.clone();
    const maxDistance = Math.max(params.trunkRadius * 2.4, 1.1);
    if (nearestDistance <= maxDistance) return position.clone();
    const adjusted = position.clone();
    const pullStrength = THREE.MathUtils.clamp(
      (nearestDistance - maxDistance) / Math.max(maxDistance * 1.6, 0.001),
      0,
      0.72,
    );
    adjusted.lerp(nearestPoint, pullStrength);
    return adjusted;
  }

  function applyWindToVector(basePoint, elapsedTime, windStrength) {
    if (windStrength <= 0) return basePoint.clone();
    const heightRatio = THREE.MathUtils.clamp(basePoint.y / Math.max(params.trunkHeight, 0.001), 0, 1);
    const trunkLock = smoothstep(0.08, 0.95, heightRatio);
    const phase = elapsedTime * 1.4 + heightRatio * 1.9 + basePoint.z * 0.05;
    const lateralOffset = Math.sin(phase) * windStrength * trunkLock;
    const forwardOffset =
      Math.cos(elapsedTime * 0.9 + heightRatio * 1.3) * windStrength * 0.12 * trunkLock;
    const liftOffset =
      Math.sin(elapsedTime * 1.05 + heightRatio * 2.4) * windStrength * 0.08 * smoothstep(0.35, 1, heightRatio);
    const canopyInfluence = smoothstep(params.canopyBaseHeight, 1, heightRatio);
    const canopyWidthOffset =
      Math.sin(elapsedTime * 1.1 + heightRatio * 1.6) * ((params.windSway / 4) * 0.12) * canopyInfluence;
    const widthScaledX = basePoint.x * (1 + canopyWidthOffset);
    return new THREE.Vector3(
      widthScaledX + lateralOffset,
      basePoint.y + liftOffset,
      basePoint.z + forwardOffset,
    );
  }

  function applyWindDeformation() {
    const windStrength = (params.windSway / 2) * 0.12;
    treeGroup.updateMatrixWorld(true);
    treeGroup.getWorldQuaternion(postcardParentQuaternion);
    postcardInverseParentQuaternion.copy(postcardParentQuaternion).invert();
    postcardLocalBillboardQuaternion.copy(camera.quaternion).premultiply(postcardInverseParentQuaternion);

    if (treePoints && baseTreePointPositions) {
      const position = treePoints.geometry.getAttribute('position');
      const array = position.array;
      for (let i = 0; i < baseTreePointPositions.length; i += 3) {
        const basePoint = new THREE.Vector3(
          baseTreePointPositions[i],
          baseTreePointPositions[i + 1],
          baseTreePointPositions[i + 2],
        );
        const deformed = applyWindToVector(basePoint, elapsed, windStrength);
        array[i] = deformed.x;
        array[i + 1] = deformed.y;
        array[i + 2] = deformed.z;
      }
      position.needsUpdate = true;
      treePoints.geometry.computeBoundingBox();
      treePoints.geometry.computeBoundingSphere();
    }

    if (treeLeafPoints && baseLeafPointPositions) {
      const leafPosition = treeLeafPoints.geometry.getAttribute('position');
      const array = leafPosition.array;
      for (let i = 0; i < baseLeafPointPositions.length; i += 3) {
        const basePoint = new THREE.Vector3(
          baseLeafPointPositions[i],
          baseLeafPointPositions[i + 1],
          baseLeafPointPositions[i + 2],
        );
        const deformed = applyWindToVector(basePoint, elapsed, windStrength);
        array[i] = deformed.x;
        array[i + 1] = deformed.y;
        array[i + 2] = deformed.z;
      }
      leafPosition.needsUpdate = true;
      treeLeafPoints.geometry.computeBoundingBox();
      treeLeafPoints.geometry.computeBoundingSphere();
    }

    const postcardLongSide = params.trunkRadius * 1.55 * params.postcardScale;
    const postcardDepth = Math.max(params.trunkRadius * 0.05, 0.03);

    if (postcardMeshes.length > 0) {
      for (let i = 0; i < postcardData.length; i += 1) {
        const card = postcardData[i];
        const mesh = postcardMeshes[i];
        if (!mesh) continue;
        const deformed = applyWindToVector(card.position, elapsed, windStrength);
        const aspectRatio = getPostcardAspectRatio(card.sourceUrl);
        const widthScale = aspectRatio >= 1 ? postcardLongSide : postcardLongSide * aspectRatio;
        const heightScale =
          aspectRatio >= 1 ? postcardLongSide / Math.max(aspectRatio, 0.001) : postcardLongSide;
        mesh.position.copy(deformed);
        mesh.quaternion.copy(postcardLocalBillboardQuaternion);
        mesh.scale.set(widthScale, heightScale, postcardDepth);
      }
    }

    for (let lineIndex = 0; lineIndex < treeLines.length; lineIndex += 1) {
      const line = treeLines[lineIndex];
      const basePositions = baseBranchLinePositions[lineIndex];
      if (!line || !basePositions) continue;
      const position = line.geometry.getAttribute('position');
      const array = position.array;
      for (let i = 0; i < basePositions.length; i += 3) {
        const basePoint = new THREE.Vector3(basePositions[i], basePositions[i + 1], basePositions[i + 2]);
        const deformed = applyWindToVector(basePoint, elapsed, windStrength);
        array[i] = deformed.x;
        array[i + 1] = deformed.y;
        array[i + 2] = deformed.z;
      }
      position.needsUpdate = true;
      line.geometry.computeBoundingBox();
      line.geometry.computeBoundingSphere();
    }

    if (baseSilhouetteSpecs.length > 0) {
      latestSilhouetteSpecs = baseSilhouetteSpecs.map((spec) => ({
        ...spec,
        points: spec.points.map((point) => applyWindToVector(point, elapsed, windStrength)),
      }));
    }
  }

  function buildViewSilhouetteGeometry(spec) {
    treeGroup.updateMatrixWorld(true);
    const localCameraPosition = treeGroup.worldToLocal(camera.position.clone());
    const leftPoints = [];
    const rightPoints = [];
    for (let i = 0; i < spec.points.length; i += 1) {
      const current = spec.points[i];
      const prev = spec.points[Math.max(0, i - 1)];
      const next = spec.points[Math.min(spec.points.length - 1, i + 1)];
      const tangent = next.clone().sub(prev);
      if (tangent.lengthSq() < 1e-6) tangent.set(0, 1, 0);
      tangent.normalize();
      const toCamera = localCameraPosition.clone().sub(current);
      const lateral = tangent.clone().cross(toCamera);
      if (lateral.lengthSq() < 1e-6) lateral.set(1, 0, 0);
      lateral.normalize();
      const t = spec.points.length <= 1 ? 0 : i / (spec.points.length - 1);
      const thickness = spec.baseThickness * spec.thicknessScale * (0.95 - t * 0.68);
      leftPoints.push(current.clone().addScaledVector(lateral, thickness));
      rightPoints.push(current.clone().addScaledVector(lateral, -thickness));
    }
    const stripPositions = [];
    const indices = [];
    const count = Math.min(leftPoints.length, rightPoints.length);
    for (let i = 0; i < count; i += 1) {
      const leftPoint = leftPoints[i];
      const rightPoint = rightPoints[i];
      stripPositions.push(leftPoint.x, leftPoint.y, leftPoint.z);
      stripPositions.push(rightPoint.x, rightPoint.y, rightPoint.z);
    }
    for (let i = 0; i < count - 1; i += 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
    return { leftPoints, rightPoints, stripPositions, indices };
  }

  function updateOutlineModeSilhouette() {
    if (params.renderMode !== 'outline' || latestSilhouetteSpecs.length === 0) return;
    for (let i = 0; i < latestSilhouetteSpecs.length; i += 1) {
      const spec = latestSilhouetteSpecs[i];
      const fillMesh = treeFillMeshes[i];
      const linePair = treeOutlineLinePairs[i];
      if (!fillMesh || !linePair) continue;
      const { leftPoints, rightPoints, stripPositions, indices } = buildViewSilhouetteGeometry(spec);
      const fillGeometry = fillMesh.geometry;
      fillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stripPositions, 3));
      fillGeometry.setIndex(indices);
      fillGeometry.computeVertexNormals();
      linePair.left.geometry.setFromPoints(leftPoints);
      linePair.right.geometry.setFromPoints(rightPoints);
    }
  }

  function rebuildTree() {
    const { geometry, branchLines, silhouetteSpecs, leafPoints } = createTreePointCloud(params, colorState);
    clearPostcardLoadSequence();

    const cardUrls = getCardUrls();
    const fillerUrls = getFillerUrls();

    if (treePoints) {
      treeGroup.remove(treePoints);
      treePoints.geometry.dispose();
    }
    if (treeLeafPoints) {
      treeGroup.remove(treeLeafPoints);
      treeLeafPoints.geometry.dispose();
      treeLeafPoints = null;
    }
    for (const mesh of postcardMeshes) {
      if (!mesh) continue;
      treeGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    postcardMeshes = [];
    postcardData = [];
    for (const line of treeLines) {
      treeGroup.remove(line);
      line.geometry.dispose();
    }
    treeLines = [];
    baseBranchLinePositions = [];
    for (const mesh of treeFillMeshes) {
      treeGroup.remove(mesh);
      mesh.geometry.dispose();
    }
    treeFillMeshes = [];
    for (const pair of treeOutlineLinePairs) {
      treeGroup.remove(pair.left);
      treeGroup.remove(pair.right);
      pair.left.geometry.dispose();
      pair.right.geometry.dispose();
    }
    treeOutlineLinePairs = [];
    latestSilhouetteSpecs = cloneSilhouetteSpecs(silhouetteSpecs);
    baseSilhouetteSpecs = cloneSilhouetteSpecs(silhouetteSpecs);

    treePoints = new THREE.Points(geometry, pointMaterial);
    baseTreePointPositions = treePoints.geometry.getAttribute('position').array.slice();
    treePoints.position.y = 0;
    treePoints.visible = false;

    for (let i = 0; i < silhouetteSpecs.length; i += 1) {
      const fillMesh = new THREE.Mesh(new THREE.BufferGeometry(), branchFillMaterial);
      const leftLine = new THREE.Line(new THREE.BufferGeometry(), branchLineMaterial);
      const rightLine = new THREE.Line(new THREE.BufferGeometry(), branchLineMaterial);
      treeGroup.add(fillMesh);
      treeGroup.add(leftLine);
      treeGroup.add(rightLine);
      treeFillMeshes.push(fillMesh);
      treeOutlineLinePairs.push({ left: leftLine, right: rightLine });
    }
    updateOutlineModeSilhouette();

    const leafPositions = [];
    const leafColors = [];
    for (const point of leafPoints) {
      leafPositions.push(point.x, point.y, point.z);
      leafColors.push(point.color.r, point.color.g, point.color.b);
    }
    const leafGeometry = new THREE.BufferGeometry();
    leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leafPositions, 3));
    leafGeometry.setAttribute('color', new THREE.Float32BufferAttribute(leafColors, 3));
    treeLeafPoints = new THREE.Points(leafGeometry, leafPointMaterial);
    baseLeafPointPositions = treeLeafPoints.geometry.getAttribute('position').array.slice();
    treeLeafPoints.visible = false;

    const anchorsRaw = buildTreePostcardAnchors(leafPoints, {
      seed: params.randomSeed,
      maxCount: params.leafDensity,
      trunkLongEdge: params.trunkRadius,
    });
    const urlList = mergeUrlsForAnchors(cardUrls, fillerUrls, anchorsRaw.length);
    const resolvedAnchors = attachSourcesToAnchors(anchorsRaw, urlList);

    for (let i = 0; i < resolvedAnchors.length; i += 1) {
      const anchor = resolvedAnchors[i];
      const constrainedPosition = constrainPostcardPositionToBranches(anchor.position, branchLines);
      postcardData.push({
        position: constrainedPosition,
        rotation: anchor.rotation.clone(),
        sourceUrl: anchor.sourceUrl || '',
      });
    }
    postcardMeshes = new Array(postcardData.length).fill(null);

    baseBranchLinePositions = [];

    elapsed = 0;
    frameCameraToTreeStart();
    applyWindDeformation();
    if (postcardData.length > 0) {
      loadPostcardMeshSequentially(0, postcardLoadToken);
    }
    treeGroup.scale.setScalar(1.12);
  }

  function resize() {
    resetScreenOriginToViewport();
    const width = root.clientWidth;
    const height = root.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    frameCameraToTreeStart();
  }

  function animate() {
    elapsed += 0.016;
    applyWindDeformation();
    updateOutlineModeSilhouette();
    treeGroup.rotation.y +=
      params.rotationSpeed > 0 ? params.rotationSpeed : -treeGroup.rotation.y * 0.12;
    controls.update();
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    alignCameraAxisToScreenOrigin();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }

  const dragState = { active: false, pointerId: null, lastX: 0 };
  function onPointerDown(e) {
    if (e.button !== 0) return;
    dragState.active = true;
    dragState.pointerId = e.pointerId;
    dragState.lastX = e.clientX;
    renderer.domElement.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragState.active || dragState.pointerId !== e.pointerId) return;
    const deltaX = e.clientX - dragState.lastX;
    dragState.lastX = e.clientX;
    treeGroup.rotation.y += deltaX * 0.01;
  }
  function onPointerUp(e) {
    if (!dragState.active || dragState.pointerId !== e.pointerId) return;
    dragState.active = false;
    dragState.pointerId = null;
    try {
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
  }

  applyColorToDomAndFog();
  resize();
  rebuildTree();
  rafId = requestAnimationFrame(animate);

  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', resize);

  return {
    dispose() {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      clearPostcardLoadSequence();
      try {
        root.removeChild(renderer.domElement);
      } catch (_) {}
      renderer.dispose();
    },
    rebuild() {
      rebuildTree();
    },
    setDimmed(on) {
      root.style.opacity = on ? '0.78' : '1';
      root.style.transition = 'opacity 0.5s ease';
    },
  };
}
