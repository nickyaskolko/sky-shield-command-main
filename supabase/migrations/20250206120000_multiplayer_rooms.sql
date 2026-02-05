-- חדרים למשחק קואופ אונליין – לובי + קוד הצטרפות
CREATE TYPE public.multiplayer_room_status AS ENUM ('waiting', 'playing', 'ended');

CREATE TABLE IF NOT EXISTS public.multiplayer_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL UNIQUE,
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.multiplayer_room_status NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_multiplayer_rooms_room_code ON public.multiplayer_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_multiplayer_rooms_host_user_id ON public.multiplayer_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_multiplayer_rooms_status ON public.multiplayer_rooms(status);

ALTER TABLE public.multiplayer_rooms ENABLE ROW LEVEL SECURITY;

-- מארח: יכול ליצור חדר (הוא ה-host) ולעדכן/למחוק רק חדרים שבהם הוא host
DROP POLICY IF EXISTS "multiplayer_rooms_host_insert" ON public.multiplayer_rooms;
CREATE POLICY "multiplayer_rooms_host_insert" ON public.multiplayer_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

DROP POLICY IF EXISTS "multiplayer_rooms_host_select" ON public.multiplayer_rooms;
CREATE POLICY "multiplayer_rooms_host_select" ON public.multiplayer_rooms
  FOR SELECT USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

DROP POLICY IF EXISTS "multiplayer_rooms_host_update" ON public.multiplayer_rooms;
CREATE POLICY "multiplayer_rooms_host_update" ON public.multiplayer_rooms
  FOR UPDATE USING (auth.uid() = host_user_id);

-- אורח לא מעדכן ישירות – משתמשים ב-RPC join_multiplayer_room
DROP POLICY IF EXISTS "multiplayer_rooms_guest_join" ON public.multiplayer_rooms;
-- רק מארח יכול לעדכן (סטטוס, סיום משחק)
-- SELECT: מארח או אורח של החדר
-- Insert: רק מארח (כבר קיים)

COMMENT ON TABLE public.multiplayer_rooms IS 'Rooms for co-op multiplayer; room_code used to join.';

-- RPC: אורח מצטרף לחדר לפי קוד (מחזיר את ה-room id אם הצליח)
CREATE OR REPLACE FUNCTION public.join_multiplayer_room(p_room_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_host_id uuid;
BEGIN
  SELECT id, host_user_id INTO v_room_id, v_host_id
  FROM public.multiplayer_rooms
  WHERE room_code = trim(lower(p_room_code))
    AND status = 'waiting'
    AND guest_user_id IS NULL;
  IF v_room_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF v_host_id = auth.uid() THEN
    RETURN NULL;
  END IF;
  UPDATE public.multiplayer_rooms
  SET guest_user_id = auth.uid(), updated_at = now()
  WHERE id = v_room_id;
  RETURN v_room_id;
END;
$$;
COMMENT ON FUNCTION public.join_multiplayer_room(text) IS 'Guest joins room by code; returns room id or null.';

-- Trigger to keep updated_at
DROP TRIGGER IF EXISTS multiplayer_rooms_updated_at ON public.multiplayer_rooms;
CREATE TRIGGER multiplayer_rooms_updated_at
  BEFORE UPDATE ON public.multiplayer_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
