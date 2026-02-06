# סיכונים ותיקונים – Defensive Coding

מסמך זה מתעד סיכונים שזוהו בסריקת הפרויקט והתיקונים שהוחלו כדי להפוך את המשחק ל"unbreakable".

---

## 1. Error Boundaries ו־Bootstrap

| סיכון | תיאור | תיקון |
|--------|--------|--------|
| **Bootstrap ללא Error Boundary** | אם `App` זורק לפני רינדור (או `createRoot` נכשל), המשתמש רואה מסך לבן ללא הודעה. | ב־`main.tsx`: עוטפים את `<App />` ב־`<ErrorBoundary>`, ו־`createRoot().render()` בתוך `try/catch` – במקרה של throw מציגים הודעת שגיאה ב־DOM. |
| **Error Boundary קיים רק מסביב ל־Routes** | שגיאות בתוך Index/Admin נתפסות; שגיאות ב־AuthProvider, TooltipProvider וכו' לא. | Error Boundary עכשיו עוטף את כל ה־App ב־main.tsx. |

---

## 2. Timers ו־Memory Leaks

| סיכון | תיאור | תיקון |
|--------|--------|--------|
| **DailyRewardModal – setTimeout ללא ניקוי** | אחרי "תביעת פרס" קוראים ל־`setTimeout(() => onClose(), 1500)`. אם המודל נסגר/נפרד לפני 1.5 שניות, `onClose()` ייקרא אחרי unmount (setState on unmounted). | שימוש ב־`useRef` לשמירת ה־timer; ב־cleanup של `useEffect` קוראים ל־`clearTimeout`. ב־`handleClaim` מנקים timer קודם אם קיים. |
| **setInterval ב־GameWithLeaflet (multiplayer)** | אם `getSerializableStateSnapshot()` זורק (למשל גישה ל־undefined), ה־interval ממשיך לרוץ אבל כל tick זורק – unhandled. | עטיפה של תוכן ה־interval ב־`try/catch` – בשגיאה מתעלמים כדי שה־interval ימשיך לרוץ. |
| **AlertsPanel, Admin loadActiveNow** | `setInterval` עם `return () => clearInterval(id)` – כבר קיים. | ללא שינוי. |

---

## 3. Async ו־Promises

| סיכון | תיאור | תיקון |
|--------|--------|--------|
| **AuthContext – signOut** | `await supabase.auth.signOut()` עלול לזרוק (רשת/הגדרות). | עטיפה ב־`try/catch` – ב־catch מעדכנים `setSession(null)`, `setUser(null)` כדי שה־UI יתעדכן גם כשהשרת נכשל. |
| **useMultiplayer – leaveRoom** | `removeChannel` או `update('multiplayer_rooms')` עלולים לזרוק. ה־state (role, roomId וכו') חייב להתאפס גם אז. | קודם מאפסים refs ו־state, אחר כך `try/catch` מסביב ל־removeChannel ו־update – ב־catch לא עושים כלום (ה־state כבר אופס). |
| **useMultiplayer – createRoom / joinRoom** | `getUser()`, `insert`, `rpc`, `channel.subscribe` עלולים לזרוק. | עטיפה של כל הלוגיקה ב־`try/catch` – ב־catch מעדכנים `setError(message)` ומחזירים `null`. |
| **Index – analytics pageView** | כבר קיים `.catch()` – מטפלים בשגיאה. | ללא שינוי. |
| **GameWithLeaflet – profiles/diamonds sync** | ל־`.then()` יש `.catch()` ומנקים ref. | ללא שינוי. |

---

## 4. State ו־Store

| סיכון | תיאור | תיקון |
|--------|--------|--------|
| **replaceStateFromHost (gameStore)** | snapshot מקולקל או חסר שדות עלול לגרום ל־`set()` או ל־`projectilePool.restoreFromSnapshot` לזרוק ו"לשבור" את האורח. | עטיפה של כל גוף הפונקציה ב־`try/catch` – ב־catch מתעלמים (לא מעדכנים state) כדי למנוע קריסה. |
| **resumeGame (gameStore)** | כבר קיים `try/catch` ל־localStorage ו־`JSON.parse`, מחזיר `false` בשגיאה. | ללא שינוי. |

---

## 5. Global Unhandled Rejection

| סיכון | תיאור | תיקון |
|--------|--------|--------|
| **Promise שנדחתה ללא .catch()** | כל promise שדחויה ולא טופלה תעלה ל־unhandledrejection ותעלם בשקט בדפדפן. | ב־App.tsx: `useEffect` שמאזין ל־`window.addEventListener('unhandledrejection', onUnhandled)` ומדפיס ל־console, עם cleanup ב־unmount. |

---

## 6. מה נבדק ולא דרש שינוי

- **AuthContext – getSession / onAuthStateChange**: יש `.catch()` ו־`subscription.unsubscribe()` ב־cleanup.
- **Analytics trackEvent**: עטוף ב־try/catch, לא מפיל את האפליקציה.
- **Admin – loadProfiles, loadBlockLogs וכו'**: יש try/catch/finally ומאפסים loading.
- **Game loop (requestAnimationFrame)**: יש try/catch ומבטלים את ה־frame ב־catch.
- **ErrorToast**: מנקה `setTimeout` ב־return של useEffect.
- **EventNotification**: מנקה שני timers ב־cleanup.
- **Leaflet map init**: יש cleanup (removeEventListener, clearTimeout, map.remove).

---

## 7. תיקונים נוספים (סיבוב שני + סריקה חוזרת)

| סיכון | תיאור | תיקון |
|--------|--------|--------|
| **AuthModal – handleSignIn/SignUp/MagicLink** | אם `signIn`/`signUp`/`signInWithOtp` זורקים (רשת), `setLoading(false)` לא נקרא – הכפתור נשאר במצב טעינה. | עטיפה ב־`try/catch/finally` – ב־finally קוראים ל־`setLoading(false)`; ב־catch מציגים הודעת שגיאה. |
| **AuthContext – signIn/signUp/signInWithOtp** | אם `supabase.auth.signInWithPassword` וכו' זורקים, הפונקציה זורקת והקריאה ב־AuthModal תקבל throw. | עטיפה ב־`try/catch` – מחזירים `{ error: { message: ... } }` במקום לזרוק. |
| **useMultiplayer – setRoomPlaying** | `getUser()` או `update('multiplayer_rooms')` עלולים לזרוק. | עטיפה ב־`try/catch` – ב־catch קוראים ל־`setError('...')`. |
| **useMultiplayer – createRoom/joinRoom** | זחה לא עקבית בתוך ה־try. | תוקן זחה (2 רווחים) לכל גוף ה־try. |
| **MultiplayerLobby – handleCreateRoom/handleJoinRoom** | אם createRoom/joinRoom זורקים, setCreating/setJoining(false) לא נקרא. | עטיפה ב־try/finally – ב־finally מעדכנים את מצב הטעינה. |
| **MultiplayerLobby – handleStartGame** | אם setRoomPlaying זורק. | עטיפה ב־try/catch (ההוק כבר לא זורק; הגנה נוספת). |
| **MultiplayerLobby – copyCode** | clipboard.writeText ללא .catch() – דחייה לא מטופלת; setTimeout ללא ניקוי – setState אחרי unmount. | .catch(() => {}) + useRef ל-timer + ניקוי ב-useEffect cleanup. |
| **AchievementToast – onAnimationComplete** | setTimeout(onComplete, 2000) ללא ניקוי – אם הקומפוננטה מתפרקת לפני 2s, onComplete נקרא אחרי unmount. | useRef ל-timer, ניקוי ב-useEffect cleanup, ומנקים לפני setTimeout חדש. |
| **Admin – grantDonorDiamonds** | אם select או update זורקים, setGrantingDonorId(null) לא נקרא. | עטיפה ב־try/finally – ב־finally קוראים ל־setGrantingDonorId(null). |

---

## סיכום

הוחלו הגנות ב־**main.tsx**, **DailyRewardModal**, **AuthContext**, **AuthModal**, **useMultiplayer** (leaveRoom, createRoom, joinRoom, setRoomPlaying), **GameWithLeaflet** (multiplayer interval), **gameStore** (replaceStateFromHost), ו־**App** (unhandledrejection).  
מומלץ להריץ `npm run build` ו־`npm run lint` אחרי שינויים ולוודא שאין regressions.
