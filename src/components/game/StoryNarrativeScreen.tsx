// Story Narrative – מסך עלילה לפני התחלת פרק

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStoryChapter } from '@/lib/game/storyMode';

interface StoryNarrativeScreenProps {
  chapterId: string;
  onStart: () => void;
  onBack: () => void;
}

export function StoryNarrativeScreen({ chapterId, onStart, onBack }: StoryNarrativeScreenProps) {
  const chapter = getStoryChapter(chapterId);
  if (!chapter) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-game-panel/95 backdrop-blur-md rounded-2xl p-8 border border-game-accent/30 max-w-lg w-full"
      >
        <h2 className="text-xl font-bold text-game-accent mb-4">{chapter.title}</h2>
        <p className="text-game-text leading-relaxed whitespace-pre-line mb-8">
          {chapter.narrativeText}
        </p>
        <div className="flex gap-3">
          <Button
            size="lg"
            className="flex-1 bg-game-accent hover:bg-game-accent/80 text-game-panel font-bold"
            onClick={onStart}
          >
            <Play className="h-5 w-5 ml-2" />
            התחל
          </Button>
          <Button variant="outline" size="lg" className="border-game-accent/30" onClick={onBack}>
            חזרה
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
