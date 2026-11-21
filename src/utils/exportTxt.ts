import type { RevisionPack } from '../types/revision';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function formatRevisionPackAsTxt(pack: RevisionPack): string {
  const lines: string[] = [];
  const difficultyLabel = pack.difficulty.charAt(0).toUpperCase() + pack.difficulty.slice(1);

  lines.push('============================================================');
  lines.push('STUDYBUDDY AI - REVISION PACK');
  lines.push(`Topic: ${pack.title}`);
  lines.push(`Quiz Settings: ${pack.quiz.length} Questions (${difficultyLabel} Difficulty)`);
  lines.push('============================================================');
  lines.push('');

  lines.push('1. SUMMARY');
  lines.push('------------------------------------------------------------');
  pack.summary.forEach((point, idx) => {
    lines.push(`${idx + 1}. ${point}`);
  });
  lines.push('');

  lines.push('2. KEY TERMS');
  lines.push('------------------------------------------------------------');
  pack.keyTerms.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.term}`);
    lines.push(`   ${item.definition}`);
    lines.push('');
  });

  lines.push('3. PRACTICE QUIZ');
  lines.push('------------------------------------------------------------');
  pack.quiz.forEach((q, idx) => {
    lines.push(`Q${idx + 1}. ${q.question}`);
    q.options.forEach((opt, optIdx) => {
      lines.push(`   ${OPTION_LETTERS[optIdx]}. ${opt}`);
    });
    lines.push('');
  });

  lines.push('4. QUIZ ANSWER KEY & EXPLANATIONS');
  lines.push('------------------------------------------------------------');
  pack.quiz.forEach((q, idx) => {
    const letter = OPTION_LETTERS[q.correctIndex];
    lines.push(`Q${idx + 1}: ${letter}. ${q.options[q.correctIndex]}`);
    lines.push(`   Explanation: ${q.explanation}`);
    lines.push('');
  });

  return lines.join('\n');
}

export function downloadRevisionPackTxt(pack: RevisionPack): void {
  const content = formatRevisionPackAsTxt(pack);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeSlug = pack.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeSlug || 'studybuddy-revision-pack'}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
