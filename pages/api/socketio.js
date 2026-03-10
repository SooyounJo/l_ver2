import { ensureIO } from '@/lib/socket/server';

export default async function handler(req, res) {
  await ensureIO(res.socket.server);
  res.status(200).json({ ok: true });
}

