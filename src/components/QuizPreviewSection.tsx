import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, HelpCircle, Play } from 'lucide-react';
import type { QuizQuestion } from '../types/revision';

interface QuizPreviewSectionProps {
  questions: QuizQuestion[];
  onStartQuiz: () => void;
  hasAttempted: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function QuizPreviewSection({
  questions,
  onStartQuiz,
  hasAttempted,
}: QuizPreviewSectionProps) {
  const [showAnswers, setShowAnswers] = useState(true);

  return (
    <section
      id="quiz-preview-section"
      aria-labelledby="quiz-preview-heading"
      className="border-t border-[#242731] bg-[#121419] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242731] pb-4">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <div>
            <h3 id="quiz-preview-heading" className="text-sm font-semibold text-stone-100">
              Multiple-Choice Questions &amp; Answers ({questions.length})
            </h3>
            <p className="text-xs text-stone-400">
              Review the questions and answer key below, or launch interactive quiz mode to test yourself.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAnswers((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2e39] bg-[#0e0f12] px-3 py-1.5 text-xs font-medium text-stone-200 transition-colors hover:border-stone-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showAnswers ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
                <span>Hide Answers</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span>Show Answers</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onStartQuiz}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-[#06140e] transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-3 w-3 fill-current" aria-hidden="true" />
            <span>{hasAttempted ? 'Retake Interactive Quiz' : 'Start Interactive Quiz'}</span>
          </button>
        </div>
      </div>

      <ol className="mt-5 grid gap-4 lg:grid-cols-2">
        {questions.map((q, qIdx) => {
          const correctLetter = OPTION_LETTERS[q.correctIndex];
          return (
            <li
              key={qIdx}
              className="flex flex-col justify-between rounded-lg border border-[#242731] bg-[#0b0c0f] p-4 sm:p-5"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                      Q{String(qIdx + 1).padStart(2, '0')}
                    </span>
                    {q.topic && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-stone-300 font-medium">{q.topic}</span>
                      </>
                    )}
                  </div>
                </div>

                <p className="mt-2 font-serif text-base font-medium leading-snug text-stone-100">
                  {q.question}
                </p>

                <ul className="mt-3.5 space-y-1.5">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correctIndex;
                    const highlightCorrect = showAnswers && isCorrect;
                    return (
                      <li
                        key={optIdx}
                        className={`flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                          highlightCorrect
                            ? 'border-emerald-500/45 bg-emerald-500/12 text-emerald-50'
                            : 'border-[#1d2028] bg-[#15171c] text-stone-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold ${
                              highlightCorrect
                                ? 'bg-emerald-500 text-[#06140e]'
                                : 'bg-[#20232d] text-stone-300'
                            }`}
                          >
                            {OPTION_LETTERS[optIdx]}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </div>

                        {highlightCorrect && (
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                            aria-label="Correct answer"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {showAnswers && (
                <div className="mt-3.5 border-t border-[#1e212a] pt-3 text-xs leading-relaxed text-stone-300">
                  <span className="font-semibold text-emerald-400">
                    Answer: {correctLetter}. {q.options[q.correctIndex]}
                  </span>
                  <p className="mt-1 text-stone-400">{q.explanation}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
