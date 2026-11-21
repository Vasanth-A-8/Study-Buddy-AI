import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  heading?: string;
  description?: string;
}

export function LoadingState({
  heading = 'Preparing your study material',
  description = 'Gemini AI is analyzing your notes and structuring the output.',
}: LoadingStateProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      aria-live="polite"
      className="rounded-lg border border-[#242731] bg-[#15171c] p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-100">{heading}</h2>
          <p className="mt-1 text-sm text-stone-400">{description}</p>
        </div>
      </div>
    </motion.section>
  );
}
