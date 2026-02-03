// Story Menu – רשימת פרקים במצב סיפור

import { motion } from 'framer-motion';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStoryChaptersList } from '@/lib/game/storyMode';

interface StoryMenuProps {
  onSelectChapter: (chapterId: string) => void;
  onBack: () => void;
}

export function StoryMenu({ onSelectChapter, onBack }: StoryMenuProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-game-panel/95 backdrop-blur-md rounded-2xl p-8 border border-game-accent/30 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold text-game-accent mb-2 flex items-center gap-2">
          <BookOpen className="h-7 w-7" />
          מצב סיפור
        </h2>
        <p className="text-game-text-dim text-sm mb-6">בחר פרק – עלילה וגלים מיוחדים</p>
        <div className="space-y-3">
          {getStoryChaptersList().map((ch) => (
            <Button
              key={ch.id}
              variant="outline"
              size="lg"
              className="w-full justify-between border-game-accent/30 text-game-text hover:bg-game-accent/10"
              onClick={() => onSelectChapter(ch.id)}
            >
              <span className="font-medium">{ch.title}</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="w-full mt-6 text-game-text-dim hover:text-game-accent"
          onClick={onBack}
        >
          חזרה לתפריט
        </Button>
      </motion.div>
    </div>
  );
}
