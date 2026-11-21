import { SlidersHorizontal } from 'lucide-react';
import type { QuizDifficulty } from '../types/revision';

interface QuizPreferencesSectionProps {
  questionCount: number;
  difficulty: QuizDifficulty;
  onChangeQuestionCount: (count: number) => void;
  onChangeDifficulty: (level: QuizDifficulty) => void;
  disabled?: boolean;
}

const QUESTION_COUNTS = [3, 5, 7, 10] as const;

const DIFFICULTY_OPTIONS: { value: QuizDifficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'Core facts' },
  { value: 'medium', label: 'Medium', hint: 'Concepts' },
  { value: 'hard', label: 'Hard', hint: 'Analysis' },
];

export function QuizPreferencesSection({
  questionCount,
  difficulty,
  onChangeQuestionCount,
  onChangeDifficulty,
  disabled = false,
}: QuizPreferencesSectionProps) {
  return (
    <section aria-labelledby="quiz-preferences-heading" className="p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        <h2 id="quiz-preferences-heading" className="text-sm font-semibold text-stone-100">
          Customize Your Quiz
        </h2>
      </div>

      {/* Number of Questions */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium text-stone-300">Number of questions</span>
          <span className="font-mono text-stone-400 tabular-nums">{questionCount} questions</span>
        </div>
        <div
          role="group"
          aria-label="Number of quiz questions"
          className="grid grid-cols-4 gap-1.5 rounded-lg border border-[#242731] bg-[#0b0c0f] p-1"
        >
          {QUESTION_COUNTS.map((count) => {
            const active = questionCount === count;
            return (
              <button
                key={count}
                type="button"
                disabled={disabled}
                onClick={() => onChangeQuestionCount(count)}
                aria-pressed={active}
                className={`rounded-md py-2 font-mono text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-50 cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-[#06140e]'
                    : 'text-stone-400 hover:bg-[#181b22] hover:text-stone-100'
                }`}
              >
                {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty Level */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium text-stone-300">Difficulty level</span>
          <span className="text-stone-400 capitalize">{difficulty}</span>
        </div>
        <div
          role="group"
          aria-label="Quiz difficulty level"
          className="grid grid-cols-3 gap-1.5 rounded-lg border border-[#242731] bg-[#0b0c0f] p-1"
        >
          {DIFFICULTY_OPTIONS.map((opt) => {
            const active = difficulty === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onChangeDifficulty(opt.value)}
                aria-pressed={active}
                className={`flex flex-col items-center rounded-md px-2 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-50 cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-[#06140e]'
                    : 'text-stone-300 hover:bg-[#181b22] hover:text-white'
                }`}
              >
                <span className="text-xs font-semibold whitespace-nowrap">{opt.label}</span>
                <span
                  className={`text-[10px] whitespace-nowrap ${
                    active ? 'text-[#06140e]/80 font-medium' : 'text-stone-500'
                  }`}
                >
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
