// Tutorial Overlay – הדרכה ראשונה

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Radio, Target, ShoppingCart } from 'lucide-react';
import { analytics } from '@/lib/analytics';

/** טבלה: מערכת יירוט → איומים שהיא מיירטת (לעמוד האחרון בהוראות) */
const INTERCEPTION_TABLE: { system: string; threats: string }[] = [
  { system: 'כיפת ברזל', threats: 'טיל, כטב"ם' },
  { system: 'פטריוט', threats: 'שיוט, כטב"ם, מסוק, מטוס' },
  { system: 'חץ 3', threats: 'כטב"ם, שיוט, בליסטי, מטוס, מסוק, פצצת דאייה, חמקן, משוריין, מתפצל (טווח ארוך)' },
  { system: 'דוד / חץ 2', threats: 'אותן מטרות כמו חץ 3 – טווח קצר מחץ 3' },
  { system: 'THAAD', threats: 'כטב"ם, שיוט, בליסטי, מטוס, מסוק, פצצת דאייה, חמקן, משוריין, מתפצל' },
  { system: 'לייזר', threats: 'כל המטרות (כולל EMP)' },
  { system: 'רדאר ימי', threats: 'כיסוי זיהוי רק לכיוון הים' },
];

const STEPS = [
  {
    icon: Radio,
    title: 'רדאר',
    text: 'הצב רדאר על המפה כדי לזהות איומים. מטרה מזוהה רק כשהיא **בתוך** טווח הרדאר (העיגול). סוללות יירוט פועלות רק בתוך כיסוי רדאר.',
  },
  {
    icon: Target,
    title: 'סוללה',
    text: 'הצב סוללת יירוט בתוך טווח הרדאר. כל מערכת מיירטת סוגי מטרות מסוימים – ראה שלב "מי מיירט מה".',
  },
  {
    icon: ShoppingCart,
    title: 'תחמושת',
    text: 'בין גלים – היכנס לחנות וקנה תחמושת למאגר. ללא תחמושת הסוללות לא יירו.',
  },
  {
    icon: Target,
    title: 'מי מיירט מה',
    isTable: true as const,
  },
];

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialOverlay({ isOpen, onClose }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) analytics.tutorialStart();
  }, [isOpen]);

  if (!isOpen) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-game-panel border border-game-accent/30 rounded-xl p-6 max-w-md w-full shadow-xl"
      >
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-game-accent/20">
            <Icon className="h-10 w-10 text-game-accent" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-game-accent text-center mb-2">{current.title}</h3>
        {'isTable' in current && current.isTable ? (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-game-text text-sm border-collapse">
              <thead>
                <tr className="border-b border-game-accent/30">
                  <th className="text-right py-2 px-3 font-bold text-game-accent">מערכת</th>
                  <th className="text-right py-2 px-3 font-bold text-game-accent">מיירטת</th>
                </tr>
              </thead>
              <tbody>
                {INTERCEPTION_TABLE.map((row, i) => (
                  <tr key={i} className="border-b border-game-accent/10">
                    <td className="py-1.5 px-3 font-medium">{row.system}</td>
                    <td className="py-1.5 px-3 text-game-text-dim">{row.threats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-game-text text-center leading-relaxed mb-6 whitespace-pre-line">{(current as { text?: string }).text?.replace(/\*\*/g, '') ?? ''}</p>
        )}
        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            className="text-game-text-dim hover:text-game-accent"
            onClick={() => {
              analytics.tutorialSkip(step);
              onClose();
            }}
          >
            דלג
          </Button>
          {isLast ? (
            <Button
              className="bg-game-accent text-game-panel"
              onClick={() => {
                analytics.tutorialComplete();
                onClose();
              }}
            >
              הבנתי
            </Button>
          ) : (
            <Button
              className="bg-game-accent text-game-panel"
              onClick={() => setStep((s) => s + 1)}
            >
              הבא
            </Button>
          )}
        </div>
        <div className="flex justify-center gap-1 mt-4">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${i === step ? 'bg-game-accent' : 'bg-game-accent/30'}`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
