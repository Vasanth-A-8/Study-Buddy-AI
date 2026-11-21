import { useState } from 'react';
import { BookMarked, Check, Copy, Download } from 'lucide-react';
import type { RevisionPack } from '../types/revision';
import { downloadRevisionPackTxt } from '../utils/exportTxt';

interface SummarySectionProps {
  pack: RevisionPack;
}

export function SummarySection({ pack }: SummarySectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = async () => {
    const formatted = [
      `${pack.title} — Study Summary`,
      '',
      ...pack.summary.map((bullet, idx) => `${idx + 1}. ${bullet}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = formatted;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      id="summary-section"
      aria-labelledby="summary-heading"
      className="p-5 sm:p-7 scroll-mt-24"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#242731]">
        <div className="flex items-center gap-2.5">
          <BookMarked className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <h3 id="summary-heading" className="text-sm font-semibold text-stone-100">
            Summary ({pack.summary.length} Bullet Points)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2e39] bg-[#0e0f12] px-3 py-1.5 text-xs font-medium text-stone-200 transition-colors hover:border-stone-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => downloadRevisionPackTxt(pack)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2e39] bg-[#0e0f12] px-3 py-1.5 text-xs font-medium text-stone-200 transition-colors hover:border-stone-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span>Download TXT</span>
          </button>
        </div>
      </div>

      <ol className="mt-4 divide-y divide-[#20232c]">
        {pack.summary.map((point, index) => (
          <li key={index} className="flex items-baseline gap-4 py-3.5 first:pt-1 last:pb-0">
            <span
              className="font-mono text-xs font-semibold text-emerald-400 tabular-nums shrink-0"
              aria-hidden="true"
            >
              0{index + 1}
            </span>
            <p className="text-[15px] leading-relaxed text-stone-200">{point}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
