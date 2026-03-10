import { useEffect, useRef } from 'react';

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function hashSeed(str) {
  const s = typeof str === 'string' ? str : '';
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 2147483647;
}

function makeFallbackGraphics(p, w = 320, h = 320) {
  const g = p.createGraphics(w, h);
  g.noStroke();

  // subtle gradient blocks
  for (let y = 0; y < h; y += 8) {
    for (let x = 0; x < w; x += 8) {
      const t = (x + y) / (w + h);
      const v = 235 - Math.floor(t * 120);
      const n = Math.floor((p.noise(x * 0.03, y * 0.03) - 0.5) * 50);
      g.fill(clamp(v + n, 60, 245), clamp(v + n, 60, 245), clamp(v + n, 60, 245));
      g.rect(x, y, 8, 8);
    }
  }

  return g;
}

export default function P5Mosaic() {
  const hostRef = useRef(null);
  const instanceRef = useRef(null);
  const latestUrlRef = useRef(null);
  const defaultTreeUrl = '/img/tree/tree.png';

  useEffect(() => {
    if (!hostRef.current) return;

    let cancelled = false;

    const sketch = (p) => {
      let img = null;
      let fitted = { x: 0, y: 0, w: 0, h: 0 };

      const getFittedImageRect = (srcW, srcH, maxW, maxH) => {
        const ratio = Math.min(maxW / srcW, maxH / srcH);
        const w = srcW * ratio;
        const h = srcH * ratio;
        const x = (p.width - w) * 0.5;
        const y = (p.height - h) * 0.5;
        return { x, y, w, h };
      };

      const getBrightness = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

      const sampleImageAtCanvasPos = (px, py) => {
        // Outside fitted image area → keep it white (match reference look).
        if (px < fitted.x || px > fitted.x + fitted.w || py < fitted.y || py > fitted.y + fitted.h) {
          return { r: 245, g: 245, b: 245, a: 255 };
        }

        const uFloat = p.map(px, fitted.x, fitted.x + fitted.w, 0, img.width - 1);
        const vFloat = p.map(py, fitted.y, fitted.y + fitted.h, 0, img.height - 1);

        const u = clamp(Math.floor(uFloat), 0, img.width - 1);
        const v = clamp(Math.floor(vFloat), 0, img.height - 1);

        const idx = 4 * (v * img.width + u);
        return {
          r: img.pixels[idx + 0],
          g: img.pixels[idx + 1],
          b: img.pixels[idx + 2],
          a: img.pixels[idx + 3],
        };
      };

      const drawCell = (x, y, w, h, sample) => {
        p.noStroke();
        p.fill(sample.r, sample.g, sample.b);
        p.rect(x, y, w, h);

        p.stroke(25);
        p.strokeWeight(1);
        p.noFill();
        p.rect(x, y, w, h);
      };

      const subdivide = (x, y, w, h, depth) => {
        const cx = x + w * 0.5;
        const cy = y + h * 0.5;

        const sample = sampleImageAtCanvasPos(cx, cy);
        const b = getBrightness(sample.r, sample.g, sample.b);
        const t = clamp(p.map(b, 0, 255, 0, 1), 0, 1);

        // Slight "close-up": fewer, larger cells than the reference defaults.
        const maxCell = 150;
        const minSize = p.lerp(22, 8, t);
        const maxDepth = Math.floor(p.lerp(9, 14, t));

        const shouldStop = (w < minSize || h < minSize || depth >= maxDepth) && w <= maxCell && h <= maxCell;
        if (shouldStop) {
          drawCell(x, y, w, h, sample);
          return;
        }

        let splitVertical;
        if (w > h * 1.2) splitVertical = true;
        else if (h > w * 1.2) splitVertical = false;
        else splitVertical = p.random() < 0.5;

        const ratios = [0.33, 0.38, 0.5, 0.62, 0.67];
        const r = p.random(ratios);

        if (splitVertical) {
          const w1 = w * r;
          const w2 = w - w1;
          if (w1 < 4 || w2 < 4) {
            drawCell(x, y, w, h, sample);
            return;
          }
          subdivide(x, y, w1, h, depth + 1);
          subdivide(x + w1, y, w2, h, depth + 1);
        } else {
          const h1 = h * r;
          const h2 = h - h1;
          if (h1 < 4 || h2 < 4) {
            drawCell(x, y, w, h, sample);
            return;
          }
          subdivide(x, y, w, h1, depth + 1);
          subdivide(x, y + h1, w, h2, depth + 1);
        }
      };

      const loadAndRedraw = (url) => {
        const seed = hashSeed(url || '');
        p.randomSeed(seed);
        p.noiseSeed(seed);

        const applyGraphic = (g) => {
          img = g;
          img.loadPixels();
          p.redraw();
        };

        if (!url) {
          applyGraphic(makeFallbackGraphics(p));
          return;
        }

        p.loadImage(
          url,
          (loaded) => {
            img = loaded;
            try {
              img.loadPixels();
              p.redraw();
            } catch (_) {
              applyGraphic(makeFallbackGraphics(p));
            }
          },
          () => {
            applyGraphic(makeFallbackGraphics(p));
          }
        );
      };

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.noLoop();
        loadAndRedraw(latestUrlRef.current);
      };

      p.draw = () => {
        p.background(245);
        if (!img) return;

        fitted = getFittedImageRect(img.width, img.height, p.width * 0.78, p.height * 0.78);
        p.stroke(25);
        p.strokeWeight(1);
        // Match reference behavior: fill the whole canvas with cells,
        // sampling colors by mapping canvas coords into the fitted image rect.
        subdivide(0, 0, p.width, p.height, 0);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        p.redraw();
      };

      // external trigger
      p.__platforml_setImageUrl = (url) => loadAndRedraw(url);
    };

    (async () => {
      try {
        const mod = await import('p5');
        const P5 = mod?.default || mod;
        if (cancelled || !hostRef.current) return;
        const instance = new P5(sketch, hostRef.current);
        instanceRef.current = instance;
      } catch (_) {
        // ignore; wall will show overlay only
      }
    })();

    return () => {
      cancelled = true;
      try {
        const inst = instanceRef.current;
        if (inst && typeof inst.remove === 'function') inst.remove();
      } catch (_) {}
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    latestUrlRef.current = defaultTreeUrl;
    const inst = instanceRef.current;
    if (inst && typeof inst.__platforml_setImageUrl === 'function') {
      inst.__platforml_setImageUrl(latestUrlRef.current);
    }
  }, [defaultTreeUrl]);

  return <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />;
}

