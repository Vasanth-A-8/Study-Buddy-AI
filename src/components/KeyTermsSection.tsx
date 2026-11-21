import { KeyRound } from 'lucide-react';
import type { KeyTerm } from '../types/revision';

interface KeyTermsSectionProps {
  terms: KeyTerm[];
}

export function KeyTermsSection({ terms }: KeyTermsSectionProps) {
  return (
    <section
      id="key-terms-section"
      aria-labelledby="key-terms-heading"
      className="p-5 sm:p-7 scroll-mt-24"
    >
      <div className="flex items-center gap-2.5 pb-4 border-b border-[#242731]">
        <KeyRound className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        <h3 id="key-terms-heading" className="text-sm font-semibold text-stone-100">
          Key Terms ({terms.length} Simple Meanings)
        </h3>
      </div>

      <dl className="mt-4 divide-y divide-[#20232c]">
        {terms.map((item, idx) => (
          <div key={idx} className="py-4 first:pt-1 last:pb-0">
            <dt className="flex items-baseline gap-2.5">
              <span className="font-mono text-[11px] font-semibold text-emerald-400 tabular-nums">
                0{idx + 1}
              </span>
              <span className="font-serif text-base font-semibold text-stone-100">
                {item.term}
              </span>
            </dt>
            <dd className="mt-1.5 pl-6 text-sm leading-relaxed text-stone-300">
              {item.definition}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
