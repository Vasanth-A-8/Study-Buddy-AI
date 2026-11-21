import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import type { QuizDifficulty, QuizQuestion } from '../types/revision';

function getQuestionTopic(q: QuizQuestion, index: number): string {
  if (q.topic && q.topic.trim()) return q.topic.trim();
  const cleaned = q.question
    .replace(/^(what|which|why|how|when|where|who|in|during|according to[^,]*,?)\s+(is|are|was|were|does|do|did|the|a|an)?\s*/i, '')
    .replace(/[?!.]+$/, '')
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 5).join(' ');
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : `Question ${index + 1} Concept`;
}

function getQuestionReviewTip(q: QuizQuestion, topic: string): string {
  if (q.reviewTip && q.reviewTip.trim()) return q.reviewTip.trim();
  return `Re-glance your notes on ${topic}: ${q.explanation}`;
}

interface QuizSectionProps {
  title: string;
  difficulty: QuizDifficulty;
  questions: QuizQuestion[];
  onScoreRecorded?: (score: number) => void;
  onBackToSummary?: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function QuizSection({
  title,
  difficulty,
  questions,
  onScoreRecorded,
  onBackToSummary,
}: QuizSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(() =>
    Array(questions.length).fill(null)
  );
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const recordedCurrentAttemptRef = useRef(false);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const currentSelection = selectedAnswers[currentIndex];
  const hasAnsweredCurrent = currentSelection !== null;

  const answeredCount = selectedAnswers.filter((ans) => ans !== null).length;
  const allAnswered = answeredCount === totalQuestions;
  const currentScore = questions.reduce(
    (acc, q, idx) => (selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc),
    0
  );

  const handleSelectOption = (optionIndex: number) => {
    if (hasAnsweredCurrent || showFinalScore) return;
    setValidationMessage(null);

    const next = [...selectedAnswers];
    next[currentIndex] = optionIndex;
    setSelectedAnswers(next);

    const nextAllAnswered = next.every((ans) => ans !== null);
    if (nextAllAnswered && !recordedCurrentAttemptRef.current) {
      recordedCurrentAttemptRef.current = true;
      const finalScore = questions.reduce(
        (acc, q, idx) => (next[idx] === q.correctIndex ? acc + 1 : acc),
        0
      );
      onScoreRecorded?.(finalScore);
    }
  };

  const handleViewFinalScore = () => {
    if (!allAnswered) {
      const firstUnanswered = selectedAnswers.findIndex((ans) => ans === null);
      if (firstUnanswered !== -1) {
        setCurrentIndex(firstUnanswered);
      }
      const remaining = totalQuestions - answeredCount;
      setValidationMessage(
        `Please answer all ${totalQuestions} questions before finishing (${remaining} ${
          remaining === 1 ? 'question' : 'questions'
        } remaining).`
      );
      return;
    }

    if (!recordedCurrentAttemptRef.current) {
      recordedCurrentAttemptRef.current = true;
      onScoreRecorded?.(currentScore);
    }

    setValidationMessage(null);
    setShowFinalScore(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTryAgain = () => {
    setSelectedAnswers(Array(totalQuestions).fill(null));
    setCurrentIndex(0);
    setShowFinalScore(false);
    setValidationMessage(null);
    recordedCurrentAttemptRef.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getScoreFeedback = (finalScore: number, total: number): string => {
    const ratio = finalScore / total;
    if (ratio === 1) return 'Perfect score — you mastered every concept in these notes.';
    if (ratio >= 0.8) return 'Strong recall — re-glance the highlighted topic below to reach 100%.';
    if (ratio >= 0.6) return 'Good progress — re-glance the missed topics below, then try again.';
    return 'Keep reviewing — re-glance the topics suggested below before retaking the quiz.';
  };

  const missedSuggestions = questions
    .map((q, idx) => {
      const choice = selectedAnswers[idx];
      if (choice === q.correctIndex) return null;
      const topic = getQuestionTopic(q, idx);
      return {
        idx,
        question: q.question,
        topic,
        tip: getQuestionReviewTip(q, topic),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const masteredTopics = Array.from(
    new Set(
      questions
        .map((q, idx) => (selectedAnswers[idx] === q.correctIndex ? getQuestionTopic(q, idx) : null))
        .filter((t): t is string => Boolean(t))
    )
  );

  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return (
    <motion.section
      id="quiz-section"
      aria-labelledby="quiz-heading"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-lg border border-[#242731] bg-[#15171c] p-5 sm:p-8"
    >
      {/* Quiz Top Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#242731] pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400 font-mono tabular-nums">
            <span className="text-emerald-400 font-semibold">{difficultyLabel}</span>
            <span aria-hidden="true">·</span>
            {showFinalScore ? (
              <span>
                Completed · Final Score {currentScore} / {totalQuestions}
              </span>
            ) : (
              <span>
                Question {currentIndex + 1} of {totalQuestions} · {answeredCount} / {totalQuestions}{' '}
                answered · Score {currentScore} / {answeredCount || 0}
              </span>
            )}
          </div>
          <h2 id="quiz-heading" className="mt-1.5 font-serif text-xl sm:text-2xl font-semibold text-stone-100">
            {title}
          </h2>
        </div>

        {showFinalScore && (
          <button
            type="button"
            onClick={handleTryAgain}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#06140e] transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Try Again</span>
          </button>
        )}
      </div>

      {/* Progress Bar & Step Tabs */}
      {!showFinalScore && (
        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#242731]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>

          <div
            className="mt-4 flex flex-wrap items-center gap-1.5"
            role="tablist"
            aria-label="Quiz question navigation"
          >
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const choice = selectedAnswers[idx];
              const isAnswered = choice !== null;
              const isCorrect = isAnswered && choice === q.correctIndex;

              let tabStyle =
                'border-[#242731] bg-[#0b0c0f] text-stone-400 hover:border-stone-600 hover:text-stone-100';
              if (isCurrent) {
                tabStyle = 'border-emerald-400 bg-emerald-500 text-[#06140e]';
              } else if (isAnswered && isCorrect) {
                tabStyle =
                  'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25';
              } else if (isAnswered && !isCorrect) {
                tabStyle =
                  'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setValidationMessage(null);
                  }}
                  className={`inline-flex h-8 min-w-10 items-center justify-center gap-1 rounded-md border px-2.5 font-mono text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 cursor-pointer ${tabStyle}`}
                >
                  <span>{idx + 1}</span>
                  {isAnswered && isCorrect && (
                    <CheckCircle2
                      className={`h-3 w-3 ${isCurrent ? 'text-[#06140e]' : 'text-emerald-400'}`}
                      aria-hidden="true"
                    />
                  )}
                  {isAnswered && !isCorrect && (
                    <XCircle
                      className={`h-3 w-3 ${isCurrent ? 'text-[#06140e]' : 'text-rose-400'}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Question & Instant Green/Red Reveal */}
      {!showFinalScore && currentQuestion && (
        <div className="mt-6">
          <h3 className="font-serif text-lg sm:text-xl font-medium leading-snug text-stone-50">
            <span className="mr-2.5 font-mono text-sm font-semibold text-emerald-400 tabular-nums">
              {String(currentIndex + 1).padStart(2, '0')}.
            </span>
            {currentQuestion.question}
          </h3>

          <div
            className="mt-5 space-y-2.5"
            role="radiogroup"
            aria-label={`Options for question ${currentIndex + 1}`}
          >
            {currentQuestion.options.map((option, optIdx) => {
              const letter = OPTION_LETTERS[optIdx];
              const isSelected = currentSelection === optIdx;
              const isCorrectOption = optIdx === currentQuestion.correctIndex;

              let containerClass =
                'border-[#242731] bg-[#0b0c0f] text-stone-200 hover:border-emerald-500/60 hover:bg-[#191b22]';
              let letterClass = 'bg-[#1c1f27] text-stone-300';
              let statusBadge: { label: string; kind: 'correct' | 'wrong' } | null = null;

              if (hasAnsweredCurrent) {
                if (isCorrectOption) {
                  containerClass = 'border-emerald-500 bg-emerald-500/15 text-emerald-50';
                  letterClass = 'bg-emerald-500 text-[#06140e]';
                  statusBadge = {
                    label: isSelected ? 'Correct' : 'Correct Answer',
                    kind: 'correct',
                  };
                } else if (isSelected) {
                  containerClass = 'border-rose-500 bg-rose-500/15 text-rose-50';
                  letterClass = 'bg-rose-500 text-white';
                  statusBadge = {
                    label: 'Your Choice',
                    kind: 'wrong',
                  };
                } else {
                  containerClass = 'border-[#1d2028] bg-[#0b0c0f]/60 text-stone-500';
                  letterClass = 'bg-[#15171c] text-stone-500';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={hasAnsweredCurrent}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                    hasAnsweredCurrent ? 'cursor-default' : 'cursor-pointer'
                  } ${containerClass}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded font-mono text-xs font-bold transition-colors ${letterClass}`}
                    >
                      {letter}
                    </span>
                    <span className="text-[15px] leading-snug">{option}</span>
                  </div>

                  {statusBadge && (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                        statusBadge.kind === 'correct' ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {statusBadge.kind === 'correct' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" aria-hidden="true" />
                      )}
                      <span>{statusBadge.label}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {hasAnsweredCurrent && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              role="status"
              className={`mt-5 rounded-lg border p-4 ${
                currentSelection === currentQuestion.correctIndex
                  ? 'border-emerald-500/35 bg-emerald-500/10'
                  : 'border-rose-500/35 bg-rose-500/10'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {currentSelection === currentQuestion.correctIndex ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">
                      Correct! Option {OPTION_LETTERS[currentQuestion.correctIndex]} is right.
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                    <span className="text-rose-200">
                      Incorrect — the correct answer is{' '}
                      <span className="text-emerald-300">
                        {OPTION_LETTERS[currentQuestion.correctIndex]}.{' '}
                        {currentQuestion.options[currentQuestion.correctIndex]}
                      </span>
                    </span>
                  </>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-200">
                <span className="font-semibold text-stone-100">Explanation: </span>
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}

          {validationMessage && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>{validationMessage}</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#242731] pt-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((i) => Math.max(0, i - 1));
                  setValidationMessage(null);
                }}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2e39] bg-[#0b0c0f] px-3.5 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Previous</span>
              </button>

              {currentIndex < totalQuestions - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1));
                    setValidationMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2e39] bg-[#0b0c0f] px-3.5 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-500 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {answeredCount > 0 && !allAnswered && (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2e39] bg-transparent px-3 py-2 text-sm font-medium text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset Quiz</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleViewFinalScore}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer ${
                  allAnswered
                    ? 'bg-emerald-500 text-[#06140e] hover:bg-emerald-400'
                    : 'border border-[#2a2e39] bg-[#1e2129] text-stone-200 hover:bg-[#272b35]'
                }`}
              >
                <Trophy className="h-4 w-4" aria-hidden="true" />
                <span>Finish &amp; View Score</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Score Screen */}
      {showFinalScore && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-emerald-500/35 bg-[#0b0c0f] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Award className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-400">
                  Final Quiz Score · Saved to Header History
                </p>
                <p className="mt-0.5 text-3xl font-bold text-stone-50 font-mono tabular-nums">
                  {currentScore} / {totalQuestions}{' '}
                  <span className="text-base font-medium text-stone-400">
                    ({Math.round((currentScore / totalQuestions) * 100)}%)
                  </span>
                </p>
                <p className="mt-1 text-sm text-stone-300">
                  {getScoreFeedback(currentScore, totalQuestions)}
                </p>
              </div>
            </div>

            {onBackToSummary && (
              <button
                type="button"
                onClick={onBackToSummary}
                className="inline-flex items-center gap-2 rounded-lg border border-[#2a2e39] bg-[#15171c] px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-500 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back to Quiz Maker</span>
              </button>
            )}
          </div>

          {/* End-of-Quiz Re-glance Suggestions */}
          {missedSuggestions.length > 0 ? (
            <div
              role="region"
              aria-labelledby="suggestions-heading"
              className="rounded-lg border border-rose-500/30 bg-[#0b0c0f] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#242731] pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
                    <Compass className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 id="suggestions-heading" className="font-serif text-lg font-semibold text-stone-100">
                      Suggested Topics to Re-glance
                    </h3>
                    <p className="mt-0.5 text-sm text-stone-300">
                      You got <span className="font-mono font-semibold text-stone-100">{currentScore}/{totalQuestions}</span> — re-glance{' '}
                      {missedSuggestions.length === 1
                        ? 'the topic from the question you missed:'
                        : `these ${missedSuggestions.length} topics from the questions you missed:`}
                    </p>
                  </div>
                </div>

                {onBackToSummary && (
                  <button
                    type="button"
                    onClick={onBackToSummary}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Review Summary &amp; Notes</span>
                  </button>
                )}
              </div>

              <ul className="mt-4 space-y-3">
                {missedSuggestions.map((item) => (
                  <li
                    key={item.idx}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-lg border border-[#242731] bg-[#15171c] p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded border border-rose-500/35 bg-rose-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-300 whitespace-nowrap shrink-0">
                          Q{item.idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-stone-100">
                          Re-glance: {item.topic}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-300">{item.tip}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        document
                          .getElementById(`quiz-review-item-${item.idx}`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="inline-flex items-center gap-1 self-start rounded-md border border-[#2a2e39] bg-[#0b0c0f] px-2.5 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>See Q{item.idx + 1}</span>
                      <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>

              {masteredTopics.length > 0 && (
                <p className="mt-4 border-t border-[#242731] pt-3.5 text-xs leading-relaxed text-stone-400">
                  <span className="font-semibold text-emerald-400">Topics you already nailed: </span>
                  {masteredTopics.join(' · ')}
                </p>
              )}
            </div>
          ) : (
            <div
              role="region"
              aria-labelledby="suggestions-heading"
              className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="suggestions-heading" className="font-serif text-lg font-semibold text-emerald-100">
                    All Topics Mastered ({currentScore}/{totalQuestions})
                  </h3>
                  <p className="mt-1 text-sm text-emerald-100/90">
                    You answered every question accurately across:{' '}
                    <span className="font-medium text-white">{masteredTopics.join(' · ')}</span>.
                    Try bumping the difficulty or reviewing with Flashcards next to keep it fresh.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-[#242731]">
            {questions.map((q, qIdx) => {
              const userChoice = selectedAnswers[qIdx];
              const isCorrect = userChoice === q.correctIndex;
              const userLetter = userChoice !== null ? OPTION_LETTERS[userChoice] : '—';
              const correctLetter = OPTION_LETTERS[q.correctIndex];
              const topicLabel = getQuestionTopic(q, qIdx);

              return (
                <div key={qIdx} id={`quiz-review-item-${qIdx}`} className="py-5 first:pt-1 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
                        <span className="font-mono tabular-nums text-stone-400">
                          {String(qIdx + 1).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-emerald-400">{topicLabel}</span>
                      </div>
                      <h3 className="mt-1 font-serif text-base font-medium text-stone-100">
                        {q.question}
                      </h3>
                    </div>

                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                        <span>Correct</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 whitespace-nowrap shrink-0">
                        <XCircle className="h-4 w-4 text-rose-400" aria-hidden="true" />
                        <span>Incorrect</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2 text-sm">
                    <div
                      className={`rounded-md border px-3.5 py-2.5 ${
                        isCorrect
                          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
                          : 'border-rose-500/35 bg-rose-500/10 text-rose-100'
                      }`}
                    >
                      <span className="block text-xs font-medium opacity-80">Your Answer</span>
                      <span className="mt-0.5 block font-medium">
                        {userChoice !== null ? `${userLetter}. ${q.options[userChoice]}` : 'No answer selected'}
                      </span>
                    </div>

                    <div className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-emerald-100">
                      <span className="block text-xs font-medium text-emerald-300">Correct Answer</span>
                      <span className="mt-0.5 block font-medium">
                        {correctLetter}. {q.options[q.correctIndex]}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-stone-300">
                    <span className="font-semibold text-stone-100">Explanation: </span>
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.section>
  );
}
