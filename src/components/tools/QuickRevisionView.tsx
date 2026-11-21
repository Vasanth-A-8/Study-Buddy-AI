import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Loader2,
  RotateCcw,
  Zap,
} from 'lucide-react';
import type { QuickRevisionResult } from '../../types/revision';
import { NotesInputSection } from '../NotesInputSection';
import { PdfUploadSection } from '../PdfUploadSection';
import { LoadingState } from '../LoadingState';
import { KeyTermsSection } from '../KeyTermsSection';

interface UploadedPdfMeta {
  fileName: string;
  pageCount: number;
  wordCount: number;
}

interface QuickRevisionViewProps {
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

export function QuickRevisionView({
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
}: QuickRevisionViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickRevisionResult | null>(null);
  const [copied, setCopied] = useState(false);

  const hasContent = notes.trim().length > 0 || uploadedPdf !== null || result !== null;

  const handleGenerate = async () => {
    setError(null);
    const trimmed = notes.trim();
    if (!trimmed) {
      setError('Please paste your study notes or upload a PDF first.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-quick-revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmed }),
      });
      const data = (await res.json()) as Partial<QuickRevisionResult> & { error?: string };
      if (!res.ok || !data.corePoints) {
        setError(data.error || 'Could not generate quick revision sheet. Please try again.');
        return;
      }
      setResult(data as QuickRevisionResult);
    } catch {
      setError('Network error while connecting to StudyBuddy AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatQuickText = (doc: QuickRevisionResult): string => {
    const lines = [
      `${doc.title} — QUICK REVISION SHEET`,
      '',
      'CORE POINTS:',
      ...doc.corePoints.map((p, i) => `${i + 1}. ${p}`),
      '',
      'MUST-REMEMBER FACTS:',
      ...doc.mustRemember.map((m, i) => `${i + 1}. ${m}`),
      '',
      'KEY TERMS:',
      ...doc.keyTerms.map((t) => `- ${t.term}: ${t.definition}`),
    ];
    return lines.join('\n');
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(formatQuickText(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([formatQuickText(result)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'quick-revision'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-stone-100">Quick Revision Notes</h2>
        <p className="mt-0.5 text-sm text-stone-400">
          Condense your material into high-yield bullet points, must-remember exam facts, and key terms.
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

            <div className="p-5 sm:p-6 bg-[#111318] flex flex-wrap items-center justify-between gap-3">
              {hasContent ? (
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
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
                <span className="text-xs text-stone-500">Rapid exam cheat-sheet</span>
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
                    <span>Distilling Notes...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" aria-hidden="true" />
                    <span>Create Quick Revision</span>
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
          heading="Distilling quick revision sheet"
          description="Pulling core takeaways, high-priority exam facts, and key terms from your notes."
        />
      )}

      {!isGenerating && result && (
        <div className="overflow-hidden rounded-lg border border-[#242731] bg-[#15171c]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242731] bg-[#111318] px-5 py-5 sm:px-7">
            <div>
              <p className="font-mono text-xs font-semibold text-emerald-400">
                Quick Revision Sheet · {result.corePoints.length} Core Points
              </p>
              <h3 className="mt-1 font-serif text-2xl font-semibold text-stone-50">
                {result.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2e39] bg-[#0e0f12] px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-stone-500 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
                    <span>Copy Sheet</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2e39] bg-[#0e0f12] px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-stone-500 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span>Download TXT</span>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 lg:divide-x lg:divide-[#242731]">
            <div className="lg:col-span-7 p-5 sm:p-7 space-y-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Core Revision Points
                </h4>
                <ol className="mt-3 divide-y divide-[#20232c]">
                  {result.corePoints.map((pt, i) => (
                    <li key={i} className="flex items-baseline gap-3.5 py-3 first:pt-1 last:pb-0">
                      <span className="font-mono text-xs font-semibold text-emerald-400 tabular-nums">
                        0{i + 1}
                      </span>
                      <p className="text-[15px] leading-relaxed text-stone-200">{pt}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-[#242731] pt-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Must-Remember Exam Facts
                </h4>
                <ul className="mt-3 space-y-2.5">
                  {result.mustRemember.map((fact, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-50"
                    >
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-5 border-t border-[#242731] lg:border-t-0">
              <KeyTermsSection terms={result.keyTerms} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
