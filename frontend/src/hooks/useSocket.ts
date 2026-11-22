import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { refreshAccessToken } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import type { Task } from '../types';

const rawSocketUrl = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');
const SOCKET_URL: string = rawSocketUrl.replace(/\/api\/?$/, '');

const AUTH_ERROR_CODES = ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_MISSING'];

interface TaskPayload {
  task: Task;
}

interface ActivityPayload {
  activity: { familyId: string; entityType: string };
}

interface SocketHandlers {
  connect: () => void;
  disconnect: () => void;
  connect_error: (err: Error) => void;
  'task:created': (payload: TaskPayload) => void;
  'task:updated': (payload: TaskPayload) => void;
  'task:completed': (payload: TaskPayload) => void;
  'activity:new': (payload: ActivityPayload) => void;
}

// Module-level references so teardown can remove exactly the listeners we registered.
let activeHandlers: SocketHandlers | null = null;

function createHandlers(socket: Socket, queryClient: QueryClient): SocketHandlers {
  const handleTaskWrite = (payload: TaskPayload): void => {
    const { task } = payload;
    const detailKey = ['tasks', task.familyId, 'detail', task._id] as const;
    if (queryClient.getQueryData(detailKey) !== undefined) {
      queryClient.setQueryData(detailKey, { task });
    }
    void queryClient.invalidateQueries({ queryKey: ['tasks', task.familyId, 'list'] });
  };

  return {
    connect: () => {
      useSocketStore.getState().setConnected(true);
    },
    disconnect: () => {
      useSocketStore.getState().setConnected(false);
    },
    connect_error: (err: Error) => {
      useSocketStore.getState().setConnected(false);
      if (!AUTH_ERROR_CODES.includes(err.message)) return;

      socket.disconnect();
      refreshAccessToken()
        .then(() => {
          socket.connect();
        })
        .catch(() => {
          useAuthStore.getState().clearAuth();
        });
    },
    'task:created': (payload: TaskPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', payload.task.familyId] });
    },
    'task:updated': handleTaskWrite,
    'task:completed': handleTaskWrite,
    'activity:new': (payload: ActivityPayload) => {
      const { familyId, entityType } = payload.activity;
      if (entityType === 'task') {
        void queryClient.invalidateQueries({ queryKey: ['tasks', familyId, 'list'] });
      }
      void queryClient.invalidateQueries({ queryKey: ['activities', familyId] });
    },
  };
}

function attachListeners(socket: Socket, handlers: SocketHandlers): void {
  socket.on('connect', handlers.connect);
  socket.on('disconnect', handlers.disconnect);
  socket.on('connect_error', handlers.connect_error);
  socket.on('task:created', handlers['task:created']);
  socket.on('task:updated', handlers['task:updated']);
  socket.on('task:completed', handlers['task:completed']);
  socket.on('activity:new', handlers['activity:new']);
}

function detachListeners(socket: Socket, handlers: SocketHandlers): void {
  socket.off('connect', handlers.connect);
  socket.off('disconnect', handlers.disconnect);
  socket.off('connect_error', handlers.connect_error);
  socket.off('task:created', handlers['task:created']);
  socket.off('task:updated', handlers['task:updated']);
  socket.off('task:completed', handlers['task:completed']);
  socket.off('activity:new', handlers['activity:new']);
}

function teardownSocket(): void {
  const { socket } = useSocketStore.getState();
  if (socket) {
    if (activeHandlers) detachListeners(socket, activeHandlers);
    socket.disconnect();
  }
  activeHandlers = null;
  useSocketStore.getState().clearSocket();
}

export function useSocket(): void {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      teardownSocket();
      return;
    }

    // Single connection: reuse the existing socket if one is already live.
    if (useSocketStore.getState().socket) return;

    const socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: (cb: (data: { token: string | null }) => void) => {
        cb({ token: useAuthStore.getState().accessToken });
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    const handlers = createHandlers(socket, queryClient);
    activeHandlers = handlers;
    attachListeners(socket, handlers);
    useSocketStore.getState().setSocket(socket);
    socket.connect();
  }, [isAuthenticated, queryClient]);

  // The layout persists across navigation, so only tear down on true unmount.
  useEffect(() => {
    return () => {
      teardownSocket();
    };
  }, []);
}
