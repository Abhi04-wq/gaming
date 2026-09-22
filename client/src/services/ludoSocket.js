import { io } from 'socket.io-client';

let socketInstance = null;

// Stable player id: wallet thakle wallet, nahole persistent guest id
export function getStablePlayerId(walletAddress) {
  if (walletAddress) return walletAddress.toLowerCase();
  let gid = null;
  try {
    gid = localStorage.getItem('ludo_guest_id');
    if (!gid) {
      gid = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem('ludo_guest_id', gid);
    }
  } catch (_) {
    gid = `guest_${Date.now()}`;
  }
  return gid;
}

export function getLudoSocket() {
  if (socketInstance?.connected) return socketInstance;
  if (socketInstance) return socketInstance;
  // Vite proxy diye /socket.io same-origin-e jabe; production-e same host
  socketInstance = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
  return socketInstance;
}

export function disconnectLudoSocket() {
  try {
    socketInstance?.disconnect();
  } catch (_) {}
  socketInstance = null;
}
