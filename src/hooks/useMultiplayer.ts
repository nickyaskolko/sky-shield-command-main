// Multiplayer co-op: Realtime room, presence, broadcast state / guest actions

import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { GameStateSnapshot, GuestAction } from '@/lib/game/multiplayerSnapshot';

const ROOM_CODE_LENGTH = 6;
const CHANNEL_PREFIX = 'room:';

function generateRoomCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export type MultiplayerRole = 'host' | 'guest' | null;

export interface MultiplayerPresence {
  role: 'host' | 'guest';
  userId: string;
  displayName?: string;
}

export interface UseMultiplayerResult {
  role: MultiplayerRole;
  roomId: string | null;
  roomCode: string | null;
  error: string | null;
  presenceList: MultiplayerPresence[];
  isGuestConnected: boolean;
  createRoom: () => Promise<{ roomId: string; roomCode: string } | null>;
  joinRoom: (code: string) => Promise<{ roomId: string } | null>;
  leaveRoom: () => Promise<void>;
  setRoomPlaying: () => Promise<void>;
  sendState: (snapshot: GameStateSnapshot) => void;
  sendAction: (action: GuestAction) => void;
  onStateUpdate: (cb: (snapshot: GameStateSnapshot) => void) => () => void;
  onGuestAction: (cb: (action: GuestAction) => void) => () => void;
  onHostLeft: (cb: () => void) => () => void;
}

export function useMultiplayer(): UseMultiplayerResult {
  const [role, setRole] = useState<MultiplayerRole>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presenceList, setPresenceList] = useState<MultiplayerPresence[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roleRef = useRef<MultiplayerRole>(null);
  const roomIdRef = useRef<string | null>(null);
  const stateListenersRef = useRef<Set<(s: GameStateSnapshot) => void>>(new Set());
  const guestActionListenersRef = useRef<Set<(a: GuestAction) => void>>(new Set());
  const hostLeftListenersRef = useRef<Set<() => void>>(new Set());

  roleRef.current = role;
  roomIdRef.current = roomId;

  const leaveRoom = useCallback(async () => {
    const ch = channelRef.current;
    const currentRole = roleRef.current;
    const currentRoomId = roomIdRef.current;
    if (ch) {
      await supabase.removeChannel(ch);
      channelRef.current = null;
    }
    setRole(null);
    setRoomId(null);
    setRoomCode(null);
    setPresenceList([]);
    setError(null);
    if (currentRole === 'host' && currentRoomId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('multiplayer_rooms')
          .update({ status: 'ended', updated_at: new Date().toISOString() })
          .eq('id', currentRoomId)
          .eq('host_user_id', user.id);
      }
    }
  }, []);

  const createRoom = useCallback(async (): Promise<{ roomId: string; roomCode: string } | null> => {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('יש להתחבר כדי ליצור חדר');
      return null;
    }
    const code = generateRoomCode();
    const { data: row, error: insertError } = await supabase
      .from('multiplayer_rooms')
      .insert({
        room_code: code,
        host_user_id: user.id,
        status: 'waiting',
      })
      .select('id')
      .single();

    if (insertError || !row) {
      setError(insertError?.message || 'יצירת חדר נכשלה');
      return null;
    }

    const rid = row.id as string;
    const channelName = `${CHANNEL_PREFIX}${rid}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const list: MultiplayerPresence[] = [];
        Object.entries(state).forEach(([, presences]) => {
          (presences as { role: string; userId: string; displayName?: string }[]).forEach(p => {
            list.push({
              role: p.role as 'host' | 'guest',
              userId: p.userId,
              displayName: p.displayName,
            });
          });
        });
        setPresenceList(list);
      })
      .on('broadcast', { event: 'guest_action' }, ({ payload }) => {
        guestActionListenersRef.current.forEach(cb => cb(payload as GuestAction));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            role: 'host',
            userId: user.id,
            displayName: user.email ?? user.id.slice(0, 8),
          });
        }
      });

    channelRef.current = channel;
    setRole('host');
    setRoomId(rid);
    setRoomCode(code);
    return { roomId: rid, roomCode: code };
  }, []);

  const joinRoom = useCallback(async (code: string): Promise<{ roomId: string } | null> => {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('יש להתחבר כדי להצטרף');
      return null;
    }
    const { data: rid, error: rpcError } = await supabase.rpc('join_multiplayer_room', {
      p_room_code: code.trim().toLowerCase(),
    });

    if (rpcError || rid == null) {
      setError('לא נמצא חדר עם הקוד הזה או שהחדר מלא');
      return null;
    }

    const roomIdStr = rid as string;
    const channelName = `${CHANNEL_PREFIX}${roomIdStr}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const list: MultiplayerPresence[] = [];
        Object.entries(state).forEach(([, presences]) => {
          (presences as { role: string; userId: string; displayName?: string }[]).forEach(p => {
            list.push({
              role: p.role as 'host' | 'guest',
              userId: p.userId,
              displayName: p.displayName,
            });
          });
        });
        setPresenceList(list);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const left = leftPresences as { role: string }[];
        if (left.some(p => p.role === 'host')) {
          hostLeftListenersRef.current.forEach(cb => cb());
        }
      })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        stateListenersRef.current.forEach(cb => cb(payload as GameStateSnapshot));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            role: 'guest',
            userId: user.id,
            displayName: user.email ?? user.id.slice(0, 8),
          });
        }
      });

    channelRef.current = channel;
    setRole('guest');
    setRoomId(roomIdStr);
    setRoomCode(code.trim().toLowerCase());
    return { roomId: roomIdStr };
  }, []);

  const setRoomPlaying = useCallback(async () => {
    const rid = roomIdRef.current;
    if (!rid) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('multiplayer_rooms')
      .update({ status: 'playing', updated_at: new Date().toISOString() })
      .eq('id', rid)
      .eq('host_user_id', user.id);
  }, []);

  const sendState = useCallback((snapshot: GameStateSnapshot) => {
    const ch = channelRef.current;
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'state',
      payload: snapshot,
    });
  }, []);

  const sendAction = useCallback((action: GuestAction) => {
    const ch = channelRef.current;
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'guest_action',
      payload: action,
    });
  }, []);

  const onStateUpdate = useCallback((cb: (snapshot: GameStateSnapshot) => void) => {
    stateListenersRef.current.add(cb);
    return () => {
      stateListenersRef.current.delete(cb);
    };
  }, []);

  const onGuestAction = useCallback((cb: (action: GuestAction) => void) => {
    guestActionListenersRef.current.add(cb);
    return () => {
      guestActionListenersRef.current.delete(cb);
    };
  }, []);

  const onHostLeft = useCallback((cb: () => void) => {
    hostLeftListenersRef.current.add(cb);
    return () => {
      hostLeftListenersRef.current.delete(cb);
    };
  }, []);

  const isGuestConnected = presenceList.some(p => p.role === 'guest');

  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    role,
    roomId,
    roomCode,
    error,
    presenceList,
    isGuestConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    setRoomPlaying,
    sendState,
    sendAction,
    onStateUpdate,
    onGuestAction,
    onHostLeft,
  };
}
