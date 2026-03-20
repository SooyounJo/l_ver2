import { ensureIO } from '@/lib/socket/server';
import { EVENTS } from '@/lib/socket/events';

/**
 * POST — 연결된 socket.io 클라이언트에 리로드 이벤트 브로드캐스트
 * (탭 간은 BroadcastChannel + _app 에서 처리)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (res.socket?.server) {
      const io = await ensureIO(res.socket.server);
      io.emit(EVENTS.RELOAD_ALL);
    }
  } catch (_) {
    // 소켓 미초기화 환경에서도 200 — BC만으로도 동작 가능
  }

  return res.status(200).json({ ok: true });
}
