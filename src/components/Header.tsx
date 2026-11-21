import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  ChevronDown,
  GraduationCap,
  Play,
  Trash2,
} from 'lucide-react';
import type { SavedQuizRecord, ToolRoute } from '../types/revision';

interface HeaderProps {
  activeTool: ToolRoute;
  isQuizPage: boolean;
  savedQuizzes: SavedQuizRecord[];
  onSelectTool: (tool: ToolRoute) => void;
  onRetakeSavedQuiz: (quizId: string) => void;
  onDeleteSavedQuiz: (quizId: string) => void;
  onBackFromQuiz: () => void;
}

const TOOL_LINKS: { id: ToolRoute; label: string }[] = [
  { id: 'notes-making', label: 'Notes Maker' },
  { id: 'quick-revision', label: 'Quick Revision' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'quiz-maker', label: 'Quiz Maker' },
  { id: 'notes-explainer', label: 'Notes Explainer' },
];

export function Header({
  activeTool,
  isQuizPage,
  savedQuizzes,
  onSelectTool,
  onRetakeSavedQuiz,
  onDeleteSavedQuiz,
  onBackFromQuiz,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#242731] bg-[#0e0f12]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Brand */}
        <button
          type="button"
          onClick={() => onSelectTool('quiz-maker')}
          className="flex items-center gap-3 min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 rounded-lg cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="block font-serif text-lg font-semibold tracking-tight text-stone-100 whitespace-nowrap truncate">
              StudyBuddy AI
            </span>
            <span className="hidden sm:block text-[11px] text-stone-400 whitespace-nowrap truncate">
              “Turn your notes into smarter revision.”
            </span>
          </div>
        </button>

        {/* Zone 2: 5 Tool Navigation Links (Desktop) */}
        <nav
          aria-label="Study tools"
          className="hidden lg:flex items-center gap-5 text-sm font-medium"
        >
          {TOOL_LINKS.map((item) => {
            const isActive = !isQuizPage && activeTool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTool(item.id)}
                className={`relative py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 ${
                  isActive
                    ? 'text-emerald-400 font-semibold'
                    : 'text-stone-400 hover:text-stone-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[13px] h-0.5 bg-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Saved Quizzes & Scores Drawer + Quiz Back Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isQuizPage && (
            <button
              type="button"
              onClick={onBackFromQuiz}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2e39] bg-[#15171c] px-3 py-2 text-xs sm:text-sm font-medium text-stone-200 transition-colors hover:border-stone-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
              <span>Back</span>
            </button>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookmarkCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Saved Quizzes</span>
              <span className="font-mono text-xs tabular-nums text-emerald-200">
                ({savedQuizzes.length})
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {menuOpen && (
              <div
                role="dialog"
                aria-label="Saved quizzes and scores"
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-[#2a2e39] bg-[#15171c] shadow-2xl shadow-black/60 z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-[#242731] bg-[#111318] px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-100">Your Created Quizzes</h2>
                    <p className="text-[11px] text-stone-400">
                      Retake any saved quiz or review your best score
                    </p>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 tabular-nums">
                    {savedQuizzes.length} saved
                  </span>
                </div>

                {savedQuizzes.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-stone-400 leading-relaxed">
                    No quizzes created yet. Use <span className="text-emerald-300 font-medium">Quiz Maker</span> to generate a quiz and your scores will be stored here.
                  </div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto divide-y divide-[#242731]">
                    {savedQuizzes.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#1a1d24] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-stone-100 truncate" title={item.title}>
                            {item.title}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-stone-400">
                            <span className="capitalize text-stone-300">{item.difficulty}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.questionCount} Qs</span>
                            <span aria-hidden="true">·</span>
                            {item.lastScore !== null ? (
                              <span className="text-emerald-300 font-semibold">
                                Score: {item.lastScore}/{item.questionCount}
                                {item.bestScore !== null && item.bestScore > item.lastScore
                                  ? ` (Best ${item.bestScore}/${item.questionCount})`
                                  : ''}
                              </span>
                            ) : (
                              <span className="text-stone-500">Not taken yet</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onRetakeSavedQuiz(item.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-[#06140e] transition-colors hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                            <span>{item.attempts > 0 ? 'Retake' : 'Start'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteSavedQuiz(item.id)}
                            aria-label={`Delete ${item.title}`}
                            className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-[#242731] hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Horizontal Nav Bar on Tablet / Mobile */}
      <nav
        aria-label="Study tools mobile"
        className="flex lg:hidden items-center gap-1 overflow-x-auto border-t border-[#1e212b] px-4 py-2 text-xs font-medium"
      >
        {TOOL_LINKS.map((item) => {
          const isActive = !isQuizPage && activeTool === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTool(item.id)}
              className={`rounded-md px-3 py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                  : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
