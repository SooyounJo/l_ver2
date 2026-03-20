import fs from 'fs';
import path from 'path';
import { getDriveImageUrls } from '@/lib/driveImages';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomMultiple(arr, count) {
  if (arr.length === 0) return [];
  if (count <= arr.length) {
    const out = [];
    const pool = [...arr];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      out.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return out;
  }
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const out = [...shuffled];
  for (let i = arr.length; i < count; i++) {
    out.push(arr[Math.floor(Math.random() * arr.length)]);
  }
  return out;
}

function getPublicImgUrls() {
  const dir = path.join(process.cwd(), 'public', 'img');
  if (!fs.existsSync(dir)) return [];
  const raw = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f));
  return raw.map((f) => `/img/${f}`);
}

export default function handler(req, res) {
  let urls = getDriveImageUrls();
  if (urls.length === 0) urls = getPublicImgUrls();
  const excludeRaw = typeof req.query?.exclude === 'string' ? req.query.exclude : '';
  const excludes = excludeRaw
    ? excludeRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const countParam = req.query?.count;
  const count = countParam != null ? Math.max(0, parseInt(String(countParam), 10) || 0) : 0;

  if (urls.length === 0) {
    return res.status(200).json({
      url: null,
      urls: [],
      warning: 'No drive image URLs configured and public/img is empty',
    });
  }

  let pool = urls;
  if (excludes.length > 0) {
    const set = new Set(excludes);
    const filtered = urls.filter((u) => !set.has(u));
    if (filtered.length > 0) pool = filtered;
  }

  if (count > 0) {
    const picked = pickRandomMultiple(pool, count);
    return res.status(200).json({ url: picked[0] ?? null, urls: picked });
  }

  const url = pickRandom(pool);
  return res.status(200).json({ url, urls: [url] });
}
