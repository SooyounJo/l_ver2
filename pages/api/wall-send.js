import { ensureIO } from '@/lib/socket/server';
import { EVENTS } from '@/lib/socket/events';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const io = await ensureIO(res.socket.server);

  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const safePayload = {
    sentAt: Date.now(),
    text: typeof payload.text === 'string' ? payload.text : '',
    date: typeof payload.date === 'string' ? payload.date : '',
    imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : '',
  };

  globalThis.__platforml_wall_last = safePayload;
  io.emit(EVENTS.CARD_SENT, safePayload);

  return res.status(200).json({ ok: true });
}

