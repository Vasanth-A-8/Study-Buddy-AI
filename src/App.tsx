import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type {
  PdfExtractResponse,
  QuizDifficulty,
  RevisionPack,
  SavedQuizRecord,
  ToolRoute,
} from './types/revision';
import { SAMPLE_STUDY_NOTES } from './utils/sampleNotes';
import { Header } from './components/Header';
import { NotesInputSection } from './components/NotesInputSection';
import { PdfUploadSection } from './components/PdfUploadSection';
import { QuizPreferencesSection } from './components/QuizPreferencesSection';
import { LoadingState } from './components/LoadingState';
import { SummarySection } from './components/SummarySection';
import { QuizSection } from './components/QuizSection';
import { QuizPreviewSection } from './components/QuizPreviewSection';
import { KeyTermsSection } from './components/KeyTermsSection';
import { NotesMakerView } from './components/tools/NotesMakerView';
import { QuickRevisionView } from './components/tools/QuickRevisionView';
import { FlashcardsView } from './components/tools/FlashcardsView';
import { NotesExplainerView } from './components/tools/NotesExplainerView';

interface UploadedPdfMeta {
  fileName: string;
  pageCount: number;
  wordCount: number;
}

const STORAGE_KEY = 'studybuddy_saved_quizzes_v1';

function loadSavedQuizzes(): SavedQuizRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedQuizRecord[]) : [];
  } catch {
    return [];
  }
}

function parseToolFromHash(hash: string): ToolRoute {
  const clean = hash.replace(/^#/, '');
  if (
    clean === 'notes-making' ||
    clean === 'quick-revision' ||
    clean === 'flashcards' ||
    clean === 'quiz-maker' ||
    clean === 'notes-explainer'
  ) {
    return clean;
  }
  return 'quiz-maker';
}

export default function App() {
  const [notes, setNotes] = useState('');
  const [uploadedPdf, setUploadedPdf] = useState<UploadedPdfMeta | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [activeTool, setActiveTool] = useState<ToolRoute>(() => parseToolFromHash(window.location.hash));
  const [isQuizPage, setIsQuizPage] = useState(false);

  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuizRecord[]>(() => loadSavedQuizzes());
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [quizSessionCounter, setQuizSessionCounter] = useState(0);

  const activeSavedQuiz = savedQuizzes.find((q) => q.id === activeQuizId) ?? null;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQuizzes));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedQuizzes]);

  useEffect(() => {
    const handlePopState = () => {
      const h = window.location.hash;
      if (h === '#quiz' && activeQuizId) {
        setIsQuizPage(true);
      } else {
        setIsQuizPage(false);
        setActiveTool(parseToolFromHash(h));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeQuizId]);

  const handleSelectTool = (tool: ToolRoute) => {
    setIsQuizPage(false);
    setActiveTool(tool);
    setGenerationError(null);
    if (window.location.hash !== `#${tool}`) {
      window.history.pushState({ tool }, '', `#${tool}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openQuizPage = (quizId: string) => {
    setActiveQuizId(quizId);
    setQuizSessionCounter((c) => c + 1);
    setIsQuizPage(true);
    if (window.location.hash !== '#quiz') {
      window.history.pushState({ page: 'quiz', quizId }, '', '#quiz');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromQuiz = () => {
    setIsQuizPage(false);
    setActiveTool('quiz-maker');
    if (window.location.hash === '#quiz') {
      window.history.pushState({ tool: 'quiz-maker' }, '', '#quiz-maker');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScoreRecorded = (quizId: string, score: number) => {
    setSavedQuizzes((prev) =>
      prev.map((item) => {
        if (item.id !== quizId) return item;
        const bestScore = item.bestScore === null ? score : Math.max(item.bestScore, score);
        return {
          ...item,
          lastScore: score,
          bestScore,
          attempts: item.attempts + 1,
        };
      })
    );
  };

  const handleDeleteSavedQuiz = (quizId: string) => {
    setSavedQuizzes((prev) => prev.filter((item) => item.id !== quizId));
    if (activeQuizId === quizId) {
      setActiveQuizId(null);
      if (isQuizPage) {
        handleBackFromQuiz();
      }
    }
  };

  const handleFileSelected = async (file: File) => {
    setPdfError(null);
    setGenerationError(null);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setPdfError('Only PDF (.pdf) files are supported. Please select a valid PDF document.');
      return;
    }

    if (file.size === 0) {
      setPdfError('The selected PDF file is empty. Please choose another file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPdfError('PDF file exceeds the 10 MB size limit. Please upload a smaller document.');
      return;
    }

    setIsExtractingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as Partial<PdfExtractResponse> & { error?: string };

      if (!response.ok || !data.text) {
        setUploadedPdf(null);
        setPdfError(data.error || 'Could not extract readable text from this PDF.');
        return;
      }

      setUploadedPdf({
        fileName: data.fileName || file.name,
        pageCount: data.pageCount ?? 1,
        wordCount: data.wordCount ?? 0,
      });
      setNotes(data.text);
    } catch {
      setUploadedPdf(null);
      setPdfError('Network error while uploading the PDF. Please check your connection and try again.');
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handleRemovePdf = () => {
    setUploadedPdf(null);
    setPdfError(null);
  };

  const handleLoadSample = () => {
    setNotes(SAMPLE_STUDY_NOTES);
    setUploadedPdf(null);
    setPdfError(null);
    setGenerationError(null);
  };

  const handleClearNotes = () => {
    setNotes('');
    setUploadedPdf(null);
    setPdfError(null);
    setGenerationError(null);
  };

  const handleResetWorkspace = () => {
    setNotes('');
    setUploadedPdf(null);
    setPdfError(null);
    setGenerationError(null);
    setActiveQuizId(null);
    setIsQuizPage(false);
  };

  const handleGenerateRevisionPack = async () => {
    setGenerationError(null);

    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      setGenerationError('Please paste your study notes or upload a PDF before clicking "Generate Revision Pack".');
      return;
    }

    if (trimmedNotes.length < 30 || trimmedNotes.split(/\s+/).length < 6) {
      setGenerationError(
        `Please provide slightly longer study notes (at least a few sentences) so Gemini can generate a ${questionCount}-question quiz.`
      );
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-revision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: trimmedNotes,
          questionCount,
          difficulty,
        }),
      });

      const data = (await response.json()) as Partial<RevisionPack> & { error?: string };

      if (!response.ok) {
        setGenerationError(data.error || 'Failed to generate revision pack. Please try again.');
        return;
      }

      if (!data.summary || !data.quiz || !data.keyTerms || !data.title) {
        setGenerationError('Received an incomplete revision pack from the server. Please try again.');
        return;
      }

      const pack = data as RevisionPack;
      const newId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const record: SavedQuizRecord = {
        id: newId,
        title: pack.title,
        difficulty: pack.difficulty,
        questionCount: pack.quiz.length,
        quiz: pack.quiz,
        summary: pack.summary,
        keyTerms: pack.keyTerms,
        createdAt: new Date().toISOString(),
        lastScore: null,
        bestScore: null,
        attempts: 0,
      };

      setSavedQuizzes((prev) => [record, ...prev]);
      setActiveQuizId(newId);
      setQuizSessionCounter((c) => c + 1);
      setIsQuizPage(false);
    } catch {
      setGenerationError('Unable to reach the StudyBuddy AI server. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasQuizMakerContent = notes.trim().length > 0 || uploadedPdf !== null || activeSavedQuiz !== null;

  return (
    <div className="min-h-screen bg-[#0e0f12] text-stone-100 flex flex-col">
      <Header
        activeTool={activeTool}
        isQuizPage={isQuizPage}
        savedQuizzes={savedQuizzes}
        onSelectTool={handleSelectTool}
        onRetakeSavedQuiz={openQuizPage}
        onDeleteSavedQuiz={handleDeleteSavedQuiz}
        onBackFromQuiz={handleBackFromQuiz}
      />

      {isQuizPage && activeSavedQuiz ? (
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          <QuizSection
            key={`${activeSavedQuiz.id}-${quizSessionCounter}`}
            title={activeSavedQuiz.title}
            difficulty={activeSavedQuiz.difficulty}
            questions={activeSavedQuiz.quiz}
            onScoreRecorded={(score) => handleScoreRecorded(activeSavedQuiz.id, score)}
            onBackToSummary={handleBackFromQuiz}
          />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {activeTool === 'notes-making' && (
            <NotesMakerView
              notes={notes}
              uploadedPdf={uploadedPdf}
              isExtractingPdf={isExtractingPdf}
              pdfError={pdfError}
              onChangeNotes={setNotes}
              onLoadSample={handleLoadSample}
              onClearNotes={handleClearNotes}
              onFileSelected={handleFileSelected}
              onRemovePdf={handleRemovePdf}
              onResetAll={handleResetWorkspace}
            />
          )}

          {activeTool === 'quick-revision' && (
            <QuickRevisionView
              notes={notes}
              uploadedPdf={uploadedPdf}
              isExtractingPdf={isExtractingPdf}
              pdfError={pdfError}
              onChangeNotes={setNotes}
              onLoadSample={handleLoadSample}
              onClearNotes={handleClearNotes}
              onFileSelected={handleFileSelected}
              onRemovePdf={handleRemovePdf}
              onResetAll={handleResetWorkspace}
            />
          )}

          {activeTool === 'flashcards' && (
            <FlashcardsView
              notes={notes}
              uploadedPdf={uploadedPdf}
              isExtractingPdf={isExtractingPdf}
              pdfError={pdfError}
              onChangeNotes={setNotes}
              onLoadSample={handleLoadSample}
              onClearNotes={handleClearNotes}
              onFileSelected={handleFileSelected}
              onRemovePdf={handleRemovePdf}
              onResetAll={handleResetWorkspace}
            />
          )}

          {activeTool === 'notes-explainer' && (
            <NotesExplainerView
              notes={notes}
              uploadedPdf={uploadedPdf}
              isExtractingPdf={isExtractingPdf}
              pdfError={pdfError}
              onChangeNotes={setNotes}
              onLoadSample={handleLoadSample}
              onClearNotes={handleClearNotes}
              onFileSelected={handleFileSelected}
              onRemovePdf={handleRemovePdf}
              onResetAll={handleResetWorkspace}
            />
          )}

          {activeTool === 'quiz-maker' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-stone-100">
                  AI Study Buddy — Notes to Quiz
                </h2>
                <p className="mt-0.5 text-sm text-stone-400">
                  Paste notes or a chapter paragraph, or upload a PDF to generate 5–6 summary bullet points, multiple-choice questions with answers, and 3 key terms.
                </p>
              </div>

              {/* Unified Editorial Study Desk */}
              <div className="overflow-hidden rounded-lg border border-[#242731] bg-[#15171c]">
                <div className="grid lg:grid-cols-12 lg:divide-x lg:divide-[#242731]">
                  <div className="lg:col-span-7">
                    <NotesInputSection
                      notes={notes}
                      onChange={(val) => {
                        setNotes(val);
                        if (generationError) setGenerationError(null);
                      }}
                      onLoadSample={handleLoadSample}
                      onClear={handleClearNotes}
                      disabled={isGenerating || isExtractingPdf}
                    />
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between divide-y divide-[#242731] border-t border-[#242731] lg:border-t-0">
                    <PdfUploadSection
                      uploadedPdf={uploadedPdf}
                      isExtracting={isExtractingPdf}
                      pdfError={pdfError}
                      onFileSelected={handleFileSelected}
                      onRemovePdf={handleRemovePdf}
                      disabled={isGenerating}
                    />

                    <QuizPreferencesSection
                      questionCount={questionCount}
                      difficulty={difficulty}
                      onChangeQuestionCount={setQuestionCount}
                      onChangeDifficulty={setDifficulty}
                      disabled={isGenerating || isExtractingPdf}
                    />

                    <div className="p-5 sm:p-6 bg-[#111318] flex flex-wrap items-center justify-between gap-3">
                      {hasQuizMakerContent ? (
                        <button
                          type="button"
                          onClick={handleResetWorkspace}
                          disabled={isGenerating || isExtractingPdf}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2e39] bg-transparent px-3.5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <RotateCcw className="h-4 w-4 text-stone-400" aria-hidden="true" />
                          <span>Reset</span>
                        </button>
                      ) : (
                        <span className="text-xs text-stone-500">
                          Summary, glossary &amp; custom quiz
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleGenerateRevisionPack}
                        disabled={isGenerating || isExtractingPdf}
                        className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-[#06140e] transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                            <span>Generate Revision Pack</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {generationError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-lg border border-rose-500/35 bg-rose-500/10 px-5 py-4 text-sm text-rose-100"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-rose-200">Could not generate revision pack</p>
                    <p className="mt-1 leading-relaxed text-rose-200/90">{generationError}</p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <LoadingState
                  heading="Preparing your revision pack"
                  description={`Extracting 5–6 summary points, 3 key terms, and ${questionCount} ${difficulty} quiz questions directly from your notes.`}
                />
              )}

              {!isGenerating && activeSavedQuiz && (
                <div className="overflow-hidden rounded-lg border border-[#242731] bg-[#15171c]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242731] bg-[#111318] px-5 py-5 sm:px-7">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400 font-mono tabular-nums">
                        <span className="text-emerald-400 font-semibold">Saved to Quiz History</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeSavedQuiz.summary.length} summary points</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeSavedQuiz.quiz.length} questions</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{activeSavedQuiz.difficulty} difficulty</span>
                        {activeSavedQuiz.lastScore !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-300 font-semibold">
                              Last Score: {activeSavedQuiz.lastScore}/{activeSavedQuiz.questionCount}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="mt-1 font-serif text-2xl font-semibold text-stone-50">
                        {activeSavedQuiz.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => openQuizPage(activeSavedQuiz.id)}
                      className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-[#06140e] transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      <span>
                        {activeSavedQuiz.attempts > 0
                          ? `Retake Quiz (${activeSavedQuiz.quiz.length} Questions)`
                          : `Start Quiz (${activeSavedQuiz.quiz.length} Questions)`}
                      </span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid lg:grid-cols-12 lg:divide-x lg:divide-[#242731]">
                    <div className="lg:col-span-7">
                      <SummarySection
                        pack={{
                          title: activeSavedQuiz.title,
                          difficulty: activeSavedQuiz.difficulty,
                          questionCount: activeSavedQuiz.questionCount,
                          summary: activeSavedQuiz.summary,
                          quiz: activeSavedQuiz.quiz,
                          keyTerms: activeSavedQuiz.keyTerms,
                        }}
                      />
                    </div>
                    <div className="lg:col-span-5 border-t border-[#242731] lg:border-t-0">
                      <KeyTermsSection terms={activeSavedQuiz.keyTerms} />
                    </div>
                  </div>

                  <QuizPreviewSection
                    questions={activeSavedQuiz.quiz}
                    hasAttempted={activeSavedQuiz.attempts > 0}
                    onStartQuiz={() => openQuizPage(activeSavedQuiz.id)}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      )}

      <footer className="border-t border-[#242731] bg-[#0b0c0f] py-4 text-center text-xs text-stone-500">
        StudyBuddy AI · Grounded exclusively in your uploaded study notes
      </footer>
    </div>
  );
}
