import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Loader2,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import type { FlashcardItem, FlashcardsResult } from '../../types/revision';
import { NotesInputSection } from '../NotesInputSection';
import { PdfUploadSection } from '../PdfUploadSection';
import { LoadingState } from '../LoadingState';

interface UploadedPdfMeta {
  fileName: string;
  pageCount: number;
  wordCount: number;
}

interface FlashcardsViewProps {
  notes: string;
  uploadedPdf: UploadedPdfMeta | null;
  isExtractingPdf: boolean;
  pdfError: string | null;
  onChangeNotes: (val: string) => void;
  onLoadSample: () => void;
  onClearNotes: () => void;
  onFileSelected: (file: File) => void;
  onRemovePdf: () => void;
  onResetAll: () => void;
}

const CARD_COUNTS = [5, 8, 12] as const;

export function FlashcardsView({
  notes,
  uploadedPdf,
  isExtractingPdf,
  pdfError,
  onChangeNotes,
  onLoadSample,
  onClearNotes,
  onFileSelected,
  onRemovePdf,
  onResetAll,
}: FlashcardsViewProps) {
  const [cardCount, setCardCount] = useState<number>(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<FlashcardsResult | null>(null);

  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [knownSet, setKnownSet] = useState<Set<number>>(new Set());

  const hasContent = notes.trim().length > 0 || uploadedPdf !== null || deck !== null;

  const handleGenerate = async () => {
    setError(null);
    const trimmed = notes.trim();
    if (!trimmed) {
      setError('Please paste your study notes or upload a PDF first.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmed, cardCount }),
      });
      const data = (await res.json()) as Partial<FlashcardsResult> & { error?: string };
      if (!res.ok || !data.cards) {
        setError(data.error || 'Could not generate flashcards. Please try again.');
        return;
      }
      const typed = data as FlashcardsResult;
      setDeck(typed);
      setCards(typed.cards);
      setActiveIndex(0);
      setFlipped(false);
      setShowHint(false);
      setKnownSet(new Set());
    } catch {
      setError('Network error while connecting to StudyBuddy AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShuffle = () => {
    if (cards.length <= 1) return;
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled);
    setActiveIndex(0);
    setFlipped(false);
    setShowHint(false);
    setKnownSet(new Set());
  };

  const toggleKnown = (idx: number) => {
    setKnownSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const currentCard = cards[activeIndex];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-stone-100">Flashcards Maker</h2>
        <p className="mt-0.5 text-sm text-stone-400">
          Generate interactive active-recall flashcards from your notes and track cards you have mastered.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#242731] bg-[#15171c]">
        <div className="grid lg:grid-cols-12 lg:divide-x lg:divide-[#242731]">
          <div className="lg:col-span-7">
            <NotesInputSection
              notes={notes}
              onChange={(v) => {
                onChangeNotes(v);
                if (error) setError(null);
              }}
              onLoadSample={onLoadSample}
              onClear={onClearNotes}
              disabled={isGenerating || isExtractingPdf}
              rows={10}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between divide-y divide-[#242731] border-t border-[#242731] lg:border-t-0">
            <PdfUploadSection
              uploadedPdf={uploadedPdf}
              isExtracting={isExtractingPdf}
              pdfError={pdfError}
              onFileSelected={onFileSelected}
              onRemovePdf={onRemovePdf}
              disabled={isGenerating}
            />

            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-200 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>Deck Size</span>
                </span>
                <span className="font-mono text-stone-400 tabular-nums">{cardCount} cards</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-[#242731] bg-[#0b0c0f] p-1">
                {CARD_COUNTS.map((cnt) => {
                  const active = cardCount === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setCardCount(cnt)}
                      aria-pressed={active}
                      className={`rounded-md py-2 font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                        active
                          ? 'bg-emerald-500 text-[#06140e]'
                          : 'text-stone-400 hover:bg-[#181b22] hover:text-stone-100'
                      }`}
                    >
                      {cnt} Cards
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-[#111318] flex flex-wrap items-center justify-between gap-3">
              {hasContent ? (
                <button
                  type="button"
                  onClick={() => {
                    setDeck(null);
                    setCards([]);
                    setError(null);
                    onResetAll();
                  }}
                  disabled={isGenerating || isExtractingPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2e39] px-3.5 py-2.5 text-sm font-medium text-stone-300 hover:border-stone-500 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 text-stone-400" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              ) : (
                <span className="text-xs text-stone-500">Click cards to flip</span>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || isExtractingPdf}
                className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-[#06140e] transition-colors hover:bg-emerald-400 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Building Deck...</span>
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4" aria-hidden="true" />
                    <span>Generate Flashcards</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-rose-500/35 bg-rose-500/10 px-5 py-4 text-sm text-rose-100"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isGenerating && (
        <LoadingState
          heading="Creating your flashcard deck"
          description={`Generating ${cardCount} active-recall cards strictly from your notes.`}
        />
      )}

      {!isGenerating && deck && currentCard && (
        <section className="rounded-lg border border-[#242731] bg-[#15171c] p-5 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242731] pb-4">
            <div>
              <p className="font-mono text-xs text-emerald-400 tabular-nums">
                Card {activeIndex + 1} of {cards.length} · {knownSet.size} / {cards.length} marked known
              </p>
              <h3 className="mt-1 font-serif text-xl font-semibold text-stone-100">
                {deck.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2e39] bg-[#0e0f12] px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-stone-500 cursor-pointer"
            >
              <Shuffle className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>Shuffle Deck</span>
            </button>
          </div>

          {/* Interactive Flashcard */}
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={`w-full min-h-[220px] rounded-lg border p-6 sm:p-8 text-left transition-colors cursor-pointer flex flex-col justify-between ${
              flipped
                ? 'border-emerald-500/45 bg-emerald-500/10'
                : 'border-[#2a2e39] bg-[#0b0c0f] hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs font-mono">
              <span className={flipped ? 'text-emerald-300 font-semibold' : 'text-stone-400'}>
                {flipped ? 'ANSWER' : 'PROMPT'}
              </span>
              <span className="text-stone-500">Click card to flip</span>
            </div>

            <p className="my-6 font-serif text-xl sm:text-2xl font-medium leading-snug text-stone-50">
              {flipped ? currentCard.back : currentCard.front}
            </p>

            <div className="flex items-center justify-between gap-2 text-xs text-stone-400">
              <span>{showHint ? `Hint: ${currentCard.hint}` : 'Need a hint? Toggle hint below.'}</span>
              {knownSet.has(activeIndex) && (
                <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Known</span>
                </span>
              )}
            </div>
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveIndex((i) => Math.max(0, i - 1));
                  setFlipped(false);
                  setShowHint(false);
                }}
                disabled={activeIndex === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2e39] bg-[#0b0c0f] px-3.5 py-2 text-sm font-medium text-stone-200 hover:border-stone-500 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveIndex((i) => Math.min(cards.length - 1, i + 1));
                  setFlipped(false);
                  setShowHint(false);
                }}
                disabled={activeIndex === cards.length - 1}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2e39] bg-[#0b0c0f] px-3.5 py-2 text-sm font-medium text-stone-200 hover:border-stone-500 disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowHint((h) => !h)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2e39] bg-[#0b0c0f] px-3.5 py-2 text-sm font-medium text-stone-300 hover:border-stone-500 cursor-pointer"
              >
                <Eye className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleKnown(activeIndex)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                  knownSet.has(activeIndex)
                    ? 'bg-emerald-500 text-[#06140e]'
                    : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{knownSet.has(activeIndex) ? 'Marked Known' : 'Mark Known'}</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
