import * as THREE from 'three';

const POSTCARD_DEFAULTS = {
  maxTiles: 216,
  randomSeedOffset: 7001,
};

function mulberry32(seed) {
  let value = seed >>> 0;
  return function next() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildTreePostcardAnchors(
  leafPoints,
  { seed = 1, maxCount = POSTCARD_DEFAULTS.maxTiles, trunkLongEdge = 1 } = {},
) {
  const rand = mulberry32(seed + POSTCARD_DEFAULTS.randomSeedOffset);
  const anchors = [];
  const rejectedPoints = [];
  const points = Array.isArray(leafPoints) ? [...leafPoints] : [];
  const total = Math.min(points.length, Math.max(0, Math.round(maxCount)));
  const minDistance = Math.max(trunkLongEdge * 1.65, 0.8);

  function canPlace(position, distanceLimit) {
    return !anchors.some((anchor) => anchor.position.distanceTo(position) < distanceLimit);
  }

  function pushAnchor(position) {
    anchors.push({
      id: `leaf-${anchors.length}`,
      position,
      rotation: new THREE.Euler((rand() - 0.5) * 0.08, (rand() - 0.5) * 0.35, (rand() - 0.5) * 0.45),
      longEdge: trunkLongEdge,
      sourceUrl: '',
      imageState: 'unassigned',
    });
  }

  for (let index = points.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    [points[index], points[swapIndex]] = [points[swapIndex], points[index]];
  }

  for (let index = 0; index < points.length && anchors.length < total; index += 1) {
    const point = points[index];
    const position = new THREE.Vector3(point.x, point.y, point.z);
    if (!canPlace(position, minDistance)) {
      rejectedPoints.push(point);
      continue;
    }
    pushAnchor(position);
  }

  rejectedPoints.sort((a, b) => {
    const aScore = Math.abs(a.x) * 1.2 + Math.abs(a.z) * 0.9 - a.y * 0.02;
    const bScore = Math.abs(b.x) * 1.2 + Math.abs(b.z) * 0.9 - b.y * 0.02;
    return aScore - bScore;
  });

  const relaxedDistance = Math.max(minDistance * 0.68, trunkLongEdge * 0.9, 0.45);
  for (let index = 0; index < rejectedPoints.length && anchors.length < total; index += 1) {
    const point = rejectedPoints[index];
    const centerPull = 0.35 + rand() * 0.2;
    const adjusted = new THREE.Vector3(
      THREE.MathUtils.lerp(point.x, 0, centerPull),
      point.y + (rand() - 0.5) * trunkLongEdge * 0.25,
      THREE.MathUtils.lerp(point.z, point.z * 0.45, centerPull * 0.8),
    );

    if (!canPlace(adjusted, relaxedDistance)) {
      continue;
    }
    pushAnchor(adjusted);
  }

  if (anchors.length < total) {
    const fallbackPoints = rejectedPoints.length > 0 ? rejectedPoints : points;
    const distanceSteps = [
      Math.max(relaxedDistance * 0.82, 0.34),
      Math.max(relaxedDistance * 0.62, 0.24),
      Math.max(relaxedDistance * 0.42, 0.14),
      0,
    ];

    for (const distanceLimit of distanceSteps) {
      for (let index = 0; index < fallbackPoints.length && anchors.length < total; index += 1) {
        const point = fallbackPoints[index];
        const pull = 0.22 + rand() * 0.28;
        const candidate = new THREE.Vector3(
          THREE.MathUtils.lerp(point.x, 0, pull),
          point.y + (rand() - 0.5) * trunkLongEdge * 0.18,
          THREE.MathUtils.lerp(point.z, point.z * 0.6, pull),
        );

        if (distanceLimit > 0 && !canPlace(candidate, distanceLimit)) {
          continue;
        }

        pushAnchor(candidate);
      }

      if (anchors.length >= total) {
        break;
      }
    }
  }

  return anchors;
}

export function attachSourcesToAnchors(anchors, imageUrls) {
  if (!Array.isArray(anchors) || anchors.length === 0) {
    return [];
  }

  return anchors.map((anchor, index) => ({
    ...anchor,
    sourceUrl: imageUrls[index] || '',
    imageState: imageUrls[index] ? 'assigned' : 'missing',
  }));
}
