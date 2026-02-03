// Story Chapter Complete – פרק הושלם

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getStoryChapter } from '@/lib/game/storyMode';

interface StoryChapterCompleteModalProps {
  isOpen: boolean;
  chapterId: string | null;
  onClose: () => void;
}

export function StoryChapterCompleteModal({
  isOpen,
  chapterId,
  onClose,
}: StoryChapterCompleteModalProps) {
  const chapter = chapterId ? getStoryChapter(chapterId) : null;
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent
        className="bg-game-panel/95 border-game-accent/30 text-game-text max-w-md"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-game-accent text-center">
            פרק הושלם!
          </DialogTitle>
        </DialogHeader>
        <p className="text-center text-game-text-dim py-2">
          {chapter ? `סיימת את "${chapter.title}" בהצלחה.` : 'הפרק הושלם.'}
        </p>
        <div className="flex justify-center pt-2">
          <Button onClick={onClose} className="bg-game-accent text-game-panel">
            חזרה לתפריט
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
