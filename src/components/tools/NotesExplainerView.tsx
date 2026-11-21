import { useState } from 'react';
import {
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type { NotesExplainerResult } from '../../types/revision';
import { NotesInputSection } from '../NotesInputSection';
import { PdfUploadSection } from '../PdfUploadSection';
import { LoadingState } from '../LoadingState';

interface UploadedPdfMeta {
  fileName: string;
  pageCount: number;
  wordCount: number;
}

interface NotesExplainerViewProps {
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

export function NotesExplainerView({
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
}: NotesExplainerViewProps) {
  const [focusTopic, setFocusTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NotesExplainerResult | null>(null);

  const hasContent = notes.trim().length > 0 || uploadedPdf !== null || result !== null;

  const handleExplain = async () => {
    setError(null);
    const trimmed = notes.trim();
    if (!trimmed) {
      setError('Please paste your study notes or upload a PDF first.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/explain-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmed, focusTopic: focusTopic.trim() }),
      });
      const data = (await res.json()) as Partial<NotesExplainerResult> & { error?: string };
      if (!res.ok || !data.simpleOverview) {
        setError(data.error || 'Could not explain your notes. Please try again.');
        return;
      }
      setResult(data as NotesExplainerResult);
    } catch {
      setError('Network error while connecting to StudyBuddy AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-stone-100">Notes Explainer</h2>
        <p className="mt-0.5 text-sm text-stone-400">
          Break down dense lecture notes into plain-English steps, an intuitive analogy, and common pitfalls.
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

            <div className="p-5 sm:p-6 space-y-2.5">
              <label htmlFor="focus-concept-input" className="flex items-center gap-2 text-xs font-semibold text-stone-200">
                <HelpCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>Specific Concept to Clarify (Optional)</span>
              </label>
              <input
                id="focus-concept-input"
                type="text"
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                disabled={isGenerating}
                placeholder="e.g., Oxidative phosphorylation or Chemiosmosis"
                className="w-full rounded-lg border border-[#242731] bg-[#0b0c0f] px-3.5 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-emerald-500/70 focus:outline-none"
              />
            </div>

            <div className="p-5 sm:p-6 bg-[#111318] flex flex-wrap items-center justify-between gap-3">
              {hasContent ? (
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setFocusTopic('');
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
                <span className="text-xs text-stone-500">Plain-English walkthrough</span>
              )}

              <button
                type="button"
                onClick={handleExplain}
                disabled={isGenerating || isExtractingPdf}
                className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-[#06140e] transition-colors hover:bg-emerald-400 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Explaining Notes...</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4" aria-hidden="true" />
                    <span>Explain Simply</span>
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
          heading="Breaking down your notes"
          description="Building a step-by-step plain-English explanation grounded in your notes."
        />
      )}

      {!isGenerating && result && (
        <article className="overflow-hidden rounded-lg border border-[#242731] bg-[#15171c]">
          <div className="border-b border-[#242731] bg-[#111318] px-5 py-5 sm:px-7">
            <p className="font-mono text-xs font-semibold text-emerald-400">
              Plain-English Walkthrough
            </p>
            <h3 className="mt-1 font-serif text-2xl font-semibold text-stone-50">
              {result.title}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-200">
              {result.simpleOverview}
            </p>
          </div>

          <div className="grid lg:grid-cols-12 lg:divide-x lg:divide-[#242731]">
            <div className="lg:col-span-7 p-5 sm:p-7">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Step-by-Step Breakdown
              </h4>
              <ol className="mt-4 divide-y divide-[#20232c]">
                {result.stepByStep.map((step, i) => (
                  <li key={i} className="py-4 first:pt-1 last:pb-0">
                    <p className="font-serif text-base font-semibold text-stone-100">
                      <span className="mr-2.5 font-mono text-xs text-emerald-400 tabular-nums">
                        0{i + 1}
                      </span>
                      {step.stepTitle}
                    </p>
                    <p className="mt-1.5 pl-6 text-sm leading-relaxed text-stone-300">
                      {step.explanation}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-5 p-5 sm:p-7 space-y-6 border-t border-[#242731] lg:border-t-0">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Intuitive Analogy
                </h4>
                <p className="mt-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-50">
                  {result.everydayAnalogy}
                </p>
              </div>

              <div className="border-t border-[#242731] pt-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                  Common Pitfall to Avoid
                </h4>
                <p className="mt-2.5 rounded-lg border border-rose-500/25 bg-rose-500/10 p-4 text-sm leading-relaxed text-rose-100">
                  {result.watchOut}
                </p>
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
