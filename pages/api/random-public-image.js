import fs from 'fs';
import path from 'path';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function handler(req, res) {
  const dir = path.join(process.cwd(), 'public', 'img');
  const exclude = typeof req.query?.exclude === 'string' ? req.query.exclude : '';

  try {
    if (!fs.existsSync(dir)) {
      return res.status(200).json({
        url: null,
        warning: 'public/img directory does not exist',
      });
    }

    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
      .map((f) => `/img/${f}`);

    if (files.length === 0) {
      return res.status(200).json({
        url: null,
        warning: 'No images found in public/img',
      });
    }

    let pool = files;
    if (exclude) {
      const filtered = files.filter((u) => u !== exclude);
      if (filtered.length > 0) pool = filtered;
    }

    const url = pickRandom(pool);
    return res.status(200).json({ url });
  } catch (e) {
    return res.status(200).json({ url: null, warning: String(e?.message || e) });
  }
}

