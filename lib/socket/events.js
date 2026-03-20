export const SOCKET_PATH = '/api/socketio';

/** 같은 오리진 탭 전체 리로드 (BroadcastChannel) */
export const RELOAD_BROADCAST_CHANNEL = 'platforml-reload';

export const EVENTS = {
  WALL_LAST: 'wall:last',
  CARD_SENT: 'card:sent',
  /** 소켓 연결된 클라이언트(예: wall) 전체 새로고침 */
  RELOAD_ALL: 'app:reload-all',
};

