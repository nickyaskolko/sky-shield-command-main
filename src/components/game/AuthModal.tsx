// Auth Modal – התחברות והרשמה (Supabase)

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp, signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setError(null);
    setMagicSent(false);
    setPassword('');
    setConfirmPassword('');
    setNickname('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signIn(email, password);
      if (err) setError(err.message);
      else handleClose();
    } catch {
      setError('שגיאה בהתחברות. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setError('חובה למלא כינוי');
      return;
    }
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await signUp(email, password, trimmedNickname);
      if (err) setError(err.message);
      else {
        setError(null);
        setMagicSent(true);
      }
    } catch {
      setError('שגיאה בהרשמה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signInWithOtp(email);
      if (err) setError(err.message);
      else {
        setMagicSent(true);
        setError(null);
      }
    } catch {
      setError('שגיאה בשליחת קישור. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="bg-game-panel/95 border-game-accent/30 text-game-text max-w-md"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-game-accent text-center">
            התחברות / הרשמה
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-game-accent/10">
            <TabsTrigger value="login" className="data-[state=active]:bg-game-accent data-[state=active]:text-game-panel">
              התחברות
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-game-accent data-[state=active]:text-game-panel">
              הרשמה
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="space-y-4 mt-4">
            {magicSent ? (
              <p className="text-center text-game-accent text-sm">
                נשלח קישור התחברות לאימייל. בדוק את תיבת הדואר.
              </p>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">אימייל</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-game-bg/50 border-game-accent/30 mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">סיסמה</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-game-bg/50 border-game-accent/30 mt-1"
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-game-accent hover:bg-game-accent/80 text-game-panel"
                  >
                    {loading ? 'מתחבר...' : 'התחבר'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-game-accent/50 text-game-accent"
                    onClick={handleMagicLink}
                    disabled={loading || !email}
                  >
                    שלח קישור התחברות לאימייל
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>
          <TabsContent value="register" className="space-y-4 mt-4">
            {magicSent ? (
              <p className="text-center text-game-accent text-sm">
                נשלח אימייל לאימות – בדוק את תיבת הדואר והקלק על הקישור.
              </p>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="reg-nickname">כינוי *</Label>
                  <Input
                    id="reg-nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="כינוי להצגה במשחק"
                    className="bg-game-bg/50 border-game-accent/30 mt-1"
                    required
                    minLength={1}
                  />
                </div>
                <div>
                  <Label htmlFor="reg-email">אימייל</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-game-bg/50 border-game-accent/30 mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reg-password">סיסמה (לפחות 6 תווים)</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-game-bg/50 border-game-accent/30 mt-1"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="reg-confirm">אישור סיסמה</Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-game-bg/50 border-game-accent/30 mt-1"
                    required
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-game-accent hover:bg-game-accent/80 text-game-panel"
                >
                  {loading ? 'נרשם...' : 'הירשם'}
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
