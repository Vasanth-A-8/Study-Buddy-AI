export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export type ToolRoute =
  | 'notes-making'
  | 'quick-revision'
  | 'flashcards'
  | 'quiz-maker'
  | 'notes-explainer';

export interface QuizQuestion {
  question: string;
  topic?: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  reviewTip?: string;
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface RevisionPack {
  title: string;
  difficulty: QuizDifficulty;
  questionCount: number;
  summary: string[];
  quiz: QuizQuestion[];
  keyTerms: KeyTerm[];
}

export interface SavedQuizRecord {
  id: string;
  title: string;
  difficulty: QuizDifficulty;
  questionCount: number;
  quiz: QuizQuestion[];
  summary: string[];
  keyTerms: KeyTerm[];
  createdAt: string;
  lastScore: number | null;
  bestScore: number | null;
  attempts: number;
}

export type NotesStyle = 'structured' | 'outline' | 'cornell';

export interface StructuredNotesResult {
  title: string;
  style: NotesStyle;
  sections: {
    heading: string;
    points: string[];
    cue?: string;
  }[];
  takeaway: string;
}

export interface QuickRevisionResult {
  title: string;
  corePoints: string[];
  mustRemember: string[];
  keyTerms: KeyTerm[];
}

export interface FlashcardItem {
  front: string;
  back: string;
  hint: string;
}

export interface FlashcardsResult {
  title: string;
  cards: FlashcardItem[];
}

export interface NotesExplainerResult {
  title: string;
  simpleOverview: string;
  stepByStep: {
    stepTitle: string;
    explanation: string;
  }[];
  everydayAnalogy: string;
  watchOut: string;
}

export interface PdfExtractResponse {
  text: string;
  pageCount: number;
  wordCount: number;
  fileName: string;
}
