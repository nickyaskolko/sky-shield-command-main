// Multiplayer Lobby – צור חדר / הצטרף עם קוד

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UseMultiplayerResult } from '@/hooks/useMultiplayer';

interface MultiplayerLobbyProps {
  multiplayer: UseMultiplayerResult;
  onBack: () => void;
  onStartGame: () => void;
}

export function MultiplayerLobby({ multiplayer, onBack, onStartGame }: MultiplayerLobbyProps) {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    role,
    roomCode,
    error,
    presenceList,
    isGuestConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    setRoomPlaying,
  } = multiplayer;

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, []);

  const handleCreateRoom = async () => {
    setCreating(true);
    try {
      const result = await createRoom();
      if (!result) return;
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const result = await joinRoom(joinCode.trim());
      if (!result) return;
    } finally {
      setJoining(false);
    }
  };

  const handleStartGame = async () => {
    try {
      await setRoomPlaying();
      onStartGame();
    } catch {
      // setRoomPlaying sets error in hook; loading state not used here
    }
  };

  const copyCode = () => {
    if (!roomCode) return;
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => {
        copiedTimerRef.current = null;
        setCopied(false);
      }, 2000);
    }).catch(() => {
      // clipboard permission or unsupported – ignore
    });
  };

  if (role === 'host' && roomCode) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-30 p-4 overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-game-panel/95 backdrop-blur-md rounded-xl border border-game-accent/30 shadow-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-game-accent flex items-center gap-2">
              <Users className="h-5 w-5" />
              משחק עם חבר
            </h2>
            <Button variant="ghost" size="sm" onClick={() => { leaveRoom(); onBack(); }} className="text-game-text-dim">
              <ArrowRight className="h-4 w-4 ml-1" />
              חזרה
            </Button>
          </div>
          <p className="text-game-text-dim text-sm mb-2">הקוד להצטרפות:</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-2xl font-bold text-game-accent tracking-widest bg-game-bg/50 px-4 py-2 rounded-lg">
              {roomCode.toUpperCase()}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={copyCode}
              className="border-game-accent/40 shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-game-text-dim text-sm mb-4">
            {isGuestConnected ? 'שחקן שני מחובר!' : 'מחכה לשחקן שני...'}
          </p>
          {presenceList.some(p => p.role === 'guest') && (
            <p className="text-amber-300 text-sm mb-4">
              {presenceList.find(p => p.role === 'guest')?.displayName ?? 'שחקן'} הצטרף
            </p>
          )}
          <Button
            className="w-full bg-game-accent hover:bg-game-accent/85 text-game-panel font-bold min-h-[44px]"
            onClick={handleStartGame}
            disabled={!isGuestConnected}
          >
            התחל משחק
          </Button>
        </motion.div>
      </div>
    );
  }

  if (role === 'guest' && roomCode) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-30 p-4 overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-game-panel/95 backdrop-blur-md rounded-xl border border-game-accent/30 shadow-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-game-accent flex items-center gap-2">
              <Users className="h-5 w-5" />
              משחק עם חבר
            </h2>
            <Button variant="ghost" size="sm" onClick={() => { leaveRoom(); onBack(); }} className="text-game-text-dim">
              <ArrowRight className="h-4 w-4 ml-1" />
              יציאה
            </Button>
          </div>
          <p className="text-game-text text-center py-6">
            מחובר לחדר. מחכה למארח להתחיל...
          </p>
          {presenceList.some(p => p.role === 'host') && (
            <p className="text-game-text-dim text-sm text-center">
              מארח: {presenceList.find(p => p.role === 'host')?.displayName ?? '—'}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 p-4 overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-game-panel/95 backdrop-blur-md rounded-xl border border-game-accent/30 shadow-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-game-accent flex items-center gap-2">
            <Users className="h-5 w-5" />
            משחק עם חבר
          </h2>
          <Button variant="ghost" size="sm" onClick={onBack} className="text-game-text-dim">
            <ArrowRight className="h-4 w-4 ml-1" />
            חזרה
          </Button>
        </div>

        {error && (
          <p className="text-game-danger text-sm mb-4 bg-game-danger/10 border border-game-danger/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <Button
            className="w-full bg-game-accent hover:bg-game-accent/85 text-game-panel font-bold min-h-[44px]"
            onClick={handleCreateRoom}
            disabled={creating}
          >
            {creating ? 'יוצר חדר...' : 'צור חדר'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-game-accent/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-game-panel px-2 text-game-text-dim">או</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="הקלד קוד חדר"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="bg-game-bg/60 border-game-accent/20 text-game-text font-mono text-center"
              dir="ltr"
              maxLength={ROOM_CODE_LENGTH}
            />
            <Button
              variant="outline"
              className="border-game-accent/40 text-game-accent min-h-[44px] shrink-0"
              onClick={handleJoinRoom}
              disabled={joining || joinCode.trim().length < 4}
            >
              {joining ? 'מצטרף...' : 'הצטרף'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const ROOM_CODE_LENGTH = 6;
