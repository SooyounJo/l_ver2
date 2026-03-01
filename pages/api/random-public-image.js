import fs from 'fs';
import path from 'path';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeCopyName(fileName) {
  // "xxx copy.jpg" -> "xxx.jpg"
  return fileName.replace(/\s+copy(?=\.[^.]+$)/i, '');
}

function isCopyVariant(fileName) {
  return /\s+copy(?=\.[^.]+$)/i.test(fileName);
}

export default function handler(req, res) {
  const dir = path.join(process.cwd(), 'public', 'img');
  const excludeRaw = typeof req.query?.exclude === 'string' ? req.query.exclude : '';
  const excludes = excludeRaw
    ? excludeRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  try {
    if (!fs.existsSync(dir)) {
      return res.status(200).json({
        url: null,
        warning: 'public/img directory does not exist',
      });
    }

    const raw = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f));

    // copy 변형이 있으면 원본을 우선하고, 같은 base는 1개로 병합
    const byBase = new Map();
    for (const f of raw) {
      const base = normalizeCopyName(f);
      const prev = byBase.get(base);
      if (!prev) {
        byBase.set(base, f);
        continue;
      }
      // 이미 원본이 있으면 유지, 원본이 없고 새 파일이 원본이면 교체
      if (isCopyVariant(prev) && !isCopyVariant(f)) byBase.set(base, f);
    }

    const files = Array.from(byBase.values()).map((f) => `/img/${f}`);

    if (files.length === 0) {
      return res.status(200).json({
        url: null,
        warning: 'No images found in public/img',
      });
    }

    let pool = files;
    if (excludes.length > 0) {
      const set = new Set(excludes);
      const filtered = files.filter((u) => !set.has(u));
      if (filtered.length > 0) pool = filtered;
    }

    const url = pickRandom(pool);
    return res.status(200).json({ url });
  } catch (e) {
    return res.status(200).json({ url: null, warning: String(e?.message || e) });
  }
}

