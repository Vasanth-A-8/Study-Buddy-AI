import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2, UploadCloud, X } from 'lucide-react';

interface UploadedPdfInfo {
  fileName: string;
  pageCount: number;
  wordCount: number;
}

interface PdfUploadSectionProps {
  uploadedPdf: UploadedPdfInfo | null;
  isExtracting: boolean;
  pdfError: string | null;
  onFileSelected: (file: File) => void;
  onRemovePdf: () => void;
  disabled?: boolean;
}

export function PdfUploadSection({
  uploadedPdf,
  isExtracting,
  pdfError,
  onFileSelected,
  onRemovePdf,
  disabled = false,
}: PdfUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isExtracting) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isExtracting) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <section aria-labelledby="pdf-upload-heading" className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <h2 id="pdf-upload-heading" className="text-sm font-semibold text-stone-100">
            Upload PDF Notes
          </h2>
        </div>
        <span className="font-mono text-[11px] text-stone-500">Max 10 MB</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        disabled={disabled || isExtracting}
        className="sr-only"
        aria-label="Upload PDF file"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${
          isDragging
            ? 'border-emerald-400 bg-emerald-500/10'
            : 'border-[#2e323e] bg-[#0b0c0f] hover:border-stone-500'
        }`}
      >
        {isExtracting ? (
          <div className="flex items-center gap-3 py-2">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" aria-hidden="true" />
            <span className="text-sm font-medium text-stone-200">Extracting PDF text...</span>
          </div>
        ) : (
          <>
            <UploadCloud className="h-5 w-5 text-stone-400" aria-hidden="true" />
            <p className="mt-2 text-sm text-stone-300">
              Drop a PDF here or{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="font-semibold text-emerald-400 underline underline-offset-4 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-50 cursor-pointer"
              >
                browse files
              </button>
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Text is extracted into the notes editor for review
            </p>
          </>
        )}
      </div>

      {uploadedPdf && !isExtracting && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-stone-100 truncate" title={uploadedPdf.fileName}>
                {uploadedPdf.fileName}
              </p>
              <p className="text-[11px] text-emerald-300 font-mono tabular-nums">
                {uploadedPdf.pageCount} {uploadedPdf.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                {uploadedPdf.wordCount.toLocaleString()} words
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemovePdf}
            disabled={disabled}
            aria-label="Remove uploaded PDF"
            className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {pdfError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
          <span>{pdfError}</span>
        </div>
      )}
    </section>
  );
}
