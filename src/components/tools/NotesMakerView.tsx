import { useState } from 'react';
import {
  AlertTriangle,
  BookText,
  Check,
  Copy,
  Download,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { NotesStyle, StructuredNotesResult } from '../../types/revision';
import { NotesInputSection } from '../NotesInputSection';
import { PdfUploadSection } from '../PdfUploadSection';
import { LoadingState } from '../LoadingState';

interface UploadedPdfMeta {
  fileName: string;
  pageCount: number;
  wordCount: number;
}

interface NotesMakerViewProps {
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

const STYLE_OPTIONS: { value: NotesStyle; label: string; hint: string }[] = [
  { value: 'structured', label: 'Structured', hint: 'Topical sections' },
  { value: 'outline', label: 'Outline', hint: 'Lecture hierarchy' },
  { value: 'cornell', label: 'Cornell', hint: 'Cue + notes' },
];

export function NotesMakerView({
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
}: NotesMakerViewProps) {
  const [style, setStyle] = useState<NotesStyle>('structured');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StructuredNotesResult | null>(null);
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
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmed, style }),
      });
      const data = (await res.json()) as Partial<StructuredNotesResult> & { error?: string };
      if (!res.ok || !data.sections) {
        setError(data.error || 'Could not format study notes. Please try again.');
        return;
      }
      setResult(data as StructuredNotesResult);
    } catch {
      setError('Network error while connecting to StudyBuddy AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatNotesText = (doc: StructuredNotesResult): string => {
    const lines = [doc.title.toUpperCase(), `Format: ${doc.style}`, ''];
    doc.sections.forEach((sec, i) => {
      lines.push(`${i + 1}. ${sec.heading}`);
      if (sec.cue) lines.push(`   Cue: ${sec.cue}`);
      sec.points.forEach((p) => lines.push(`   - ${p}`));
      lines.push('');
    });
    lines.push(`Takeaway: ${doc.takeaway}`);
    return lines.join('\n');
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(formatNotesText(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([formatNotesText(result)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'study-notes'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-stone-100">Notes Maker</h2>
          <p className="mt-0.5 text-sm text-stone-400">
            Turn rough lecture transcripts or PDFs into clean, structured study notes.
          </p>
        </div>
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

            <section aria-label="Note format style" className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <BookText className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-stone-100">Note Format Style</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-[#242731] bg-[#0b0c0f] p-1">
                {STYLE_OPTIONS.map((opt) => {
                  const active = style === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setStyle(opt.value)}
                      aria-pressed={active}
                      className={`flex flex-col items-center rounded-md px-2 py-2 text-center transition-colors cursor-pointer ${
                        active
                          ? 'bg-emerald-500 text-[#06140e]'
                          : 'text-stone-300 hover:bg-[#181b22] hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span
                        className={`text-[10px] ${
                          active ? 'text-[#06140e]/80 font-medium' : 'text-stone-500'
                        }`}
                      >
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

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
                <span className="text-xs text-stone-500">Organized by topic</span>
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
                    <span>Organizing Notes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>Make Structured Notes</span>
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
          heading="Structuring your study notes"
          description="Organizing headings, key takeaways, and points strictly from your input."
        />
      )}

      {!isGenerating && result && (
        <article className="overflow-hidden rounded-lg border border-[#242731] bg-[#15171c]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242731] bg-[#111318] px-5 py-5 sm:px-7">
            <div>
              <p className="font-mono text-xs font-semibold text-emerald-400 capitalize">
                {result.style} Study Notes · {result.sections.length} Sections
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
                    <span>Copy Notes</span>
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

          <div className="divide-y divide-[#242731] px-5 sm:px-7">
            {result.sections.map((sec, idx) => (
              <div key={idx} className="py-5">
                <div className="grid gap-4 md:grid-cols-12">
                  {sec.cue && (
                    <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#242731] pb-3 md:pb-0 md:pr-4">
                      <span className="font-mono text-[11px] font-semibold text-emerald-400">
                        CUE 0{idx + 1}
                      </span>
                      <p className="mt-1 font-serif text-sm font-medium text-stone-200">
                        {sec.cue}
                      </p>
                    </div>
                  )}
                  <div className={sec.cue ? 'md:col-span-8' : 'md:col-span-12'}>
                    <h4 className="font-serif text-lg font-semibold text-stone-100">
                      <span className="mr-2 font-mono text-xs text-emerald-400 tabular-nums">
                        0{idx + 1}
                      </span>
                      {sec.heading}
                    </h4>
                    <ul className="mt-2.5 space-y-2">
                      {sec.points.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-baseline gap-2.5 text-sm leading-relaxed text-stone-300">
                          <span className="text-emerald-400 font-mono text-xs" aria-hidden="true">
                            —
                          </span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#242731] bg-[#111318] px-5 py-4 sm:px-7">
            <p className="text-xs font-semibold text-emerald-400">Overall Takeaway</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-200">{result.takeaway}</p>
          </div>
        </article>
      )}
    </div>
  );
}
