import { create } from 'zustand';
import type { Socket } from 'socket.io-client';

interface SocketState {
  isConnected: boolean;
  socket: Socket | null;
  setConnected: (connected: boolean) => void;
  setSocket: (socket: Socket | null) => void;
  clearSocket: () => void;
}

export const useSocketStore = create<SocketState>()((set) => ({
  isConnected: false,
  socket: null,
  setConnected: (c) => set({ isConnected: c }),
  setSocket: (s) => set({ socket: s }),
  clearSocket: () => set({ socket: null, isConnected: false }),
}));
