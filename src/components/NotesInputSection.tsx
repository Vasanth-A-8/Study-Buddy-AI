import { Eraser, FileText } from 'lucide-react';

interface NotesInputSectionProps {
  notes: string;
  onChange: (value: string) => void;
  onLoadSample: () => void;
  onClear: () => void;
  disabled?: boolean;
  rows?: number;
}

export function NotesInputSection({
  notes,
  onChange,
  onLoadSample,
  onClear,
  disabled = false,
  rows = 12,
}: NotesInputSectionProps) {
  const trimmed = notes.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const charCount = notes.length;

  return (
    <section
      aria-labelledby="notes-input-heading"
      className="flex h-full flex-col justify-between bg-[#15171c] p-5 sm:p-6"
    >
      <div className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#242731]">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h2 id="notes-input-heading" className="text-sm font-semibold text-stone-100">
              Study Notes
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLoadSample}
              disabled={disabled}
              className="rounded-md border border-[#2a2e39] bg-[#0e0f12] px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:border-emerald-500/50 hover:bg-[#1a1d24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Load Sample Notes
            </button>

            {notes.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-400 transition-colors hover:bg-[#1e2129] hover:text-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <label htmlFor="study-notes-textarea" className="sr-only">
          Study notes
        </label>
        <textarea
          id="study-notes-textarea"
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={rows}
          placeholder="Paste your study notes or a chapter paragraph here — or upload a PDF on the right to extract text automatically."
          className="mt-4 w-full flex-1 resize-y rounded-lg border border-[#242731] bg-[#0b0c0f] p-4 text-sm leading-relaxed text-stone-100 placeholder:text-stone-500 transition-colors focus:border-emerald-500/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
        <span>All outputs stay strictly grounded in your notes.</span>
        <div className="flex items-center gap-2.5 font-mono tabular-nums text-stone-300">
          <span>{wordCount.toLocaleString()} words</span>
          <span aria-hidden="true" className="text-stone-600">/</span>
          <span>{charCount.toLocaleString()} chars</span>
        </div>
      </div>
    </section>
  );
}
