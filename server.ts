import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { GoogleGenAI, ThinkingLevel, Type, type Schema } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {
  FlashcardItem,
  FlashcardsResult,
  KeyTerm,
  NotesExplainerResult,
  NotesStyle,
  QuickRevisionResult,
  QuizDifficulty,
  QuizQuestion,
  RevisionPack,
  StructuredNotesResult,
} from './src/types/revision.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_NOTES_CHARS = 60000;
const MIN_NOTES_CHARS = 30;
const GEMINI_MODEL = 'gemini-4-hydrogen';
const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

const app = express();
app.use(express.json({ limit: '1mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const isPdfExt = file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdfExt) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
});

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const header = buffer.subarray(0, 8).toString('latin1');
  if (!header.includes('%PDF-')) {
    throw new Error('INVALID_PDF_FORMAT');
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  });

  const pdfDocument = await loadingTask.promise;
  const pageCount = pdfDocument.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = '';

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const textItem = item as { str: string; transform?: number[]; hasEOL?: boolean };
      const y = Array.isArray(textItem.transform) ? textItem.transform[5] : null;

      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = textItem.str;
      } else {
        if (currentLine && textItem.str && !currentLine.endsWith(' ') && !textItem.str.startsWith(' ')) {
          currentLine += ' ';
        }
        currentLine += textItem.str;
      }

      if (textItem.hasEOL) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = '';
      }

      if (y !== null) lastY = y;
    }

    if (currentLine.trim()) lines.push(currentLine.trim());

    const pageStr = lines.join('\n').trim();
    if (pageStr) pageTexts.push(pageStr);
  }

  await pdfDocument.cleanup();
  const combined = pageTexts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: combined, pageCount };
}

function getValidatedNotesAndKey(req: Request, res: Response): { apiKey: string; notes: string } | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      code: 'MISSING_API_KEY',
      error:
        'Gemini API key is not configured. Please set GEMINI_API_KEY in the Settings > Secrets panel (or environment variables) and try again.',
    });
    return null;
  }

  const rawNotes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
  if (!rawNotes) {
    res.status(400).json({ error: 'Please paste your study notes or upload a PDF first.' });
    return null;
  }

  if (rawNotes.length < MIN_NOTES_CHARS || countWords(rawNotes) < 6) {
    res.status(400).json({
      error: 'Your study notes are too short. Please provide at least a couple of sentences of notes.',
    });
    return null;
  }

  return {
    apiKey,
    notes: rawNotes.length > MAX_NOTES_CHARS ? rawNotes.slice(0, MAX_NOTES_CHARS) : rawNotes,
  };
}

function getGeminiErrorResponse(err: unknown): { status: number; message: string; code: string } {
  const errMsg = err instanceof Error ? err.message : String(err);
  const lower = errMsg.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('api key is invalid')
  ) {
    return {
      status: 400,
      code: 'API_KEY_INVALID',
      message: 'The configured GEMINI_API_KEY is invalid. Please check your key in Settings > Secrets and try again.',
    };
  }

  if (
    lower.includes('unauthenticated') ||
    lower.includes('401') ||
    lower.includes('permission_denied') ||
    lower.includes('403')
  ) {
    return {
      status: 403,
      code: 'PERMISSION_DENIED',
      message: 'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets and try again.',
    };
  }

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      code: 'RESOURCE_EXHAUSTED',
      message: 'Gemini API rate limit or quota exceeded. Please wait a moment or check your billing quota in Settings > Secrets.',
    };
  }

  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 502,
      code: 'MODEL_NOT_FOUND',
      message: 'The requested Gemini model is unavailable right now. Please try again shortly.',
    };
  }

  if (lower.includes('unavailable') || lower.includes('503') || lower.includes('high demand') || lower.includes('overloaded')) {
    return {
      status: 503,
      code: 'MODEL_OVERLOADED',
      message: 'Gemini AI is currently experiencing high demand. Please wait a few seconds and try again.',
    };
  }

  if (
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    lower.includes('deadline_exceeded') ||
    lower.includes('504')
  ) {
    return {
      status: 504,
      code: 'AI_TIMEOUT',
      message: 'The AI took too long to respond. Please try again.',
    };
  }

  if (errMsg === 'INVALID_AI_SCHEMA') {
    return {
      status: 502,
      code: 'INVALID_AI_RESPONSE',
      message: 'The AI returned an incomplete response format. Please try generating again.',
    };
  }

  return {
    status: 502,
    code: 'AI_GENERATION_FAILED',
    message: 'Unable to process your study notes right now. Please try again in a moment.',
  };
}

async function callGeminiStructured<T>(
  apiKey: string,
  systemInstruction: string,
  prompt: string,
  responseSchema: Schema,
  validator: (raw: unknown) => T
): Promise<T> {
  let lastError: unknown = null;
  const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL];

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const activeModel = modelsToTry[attempt];
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          timeout: attempt === 0 ? 15000 : 25000,
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const config =
        activeModel === GEMINI_MODEL
          ? {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            }
          : {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            };

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config,
      });

      const text = (response.text ?? '').trim();
      if (!text) {
        throw new Error('INVALID_AI_SCHEMA');
      }

      const parsed = JSON.parse(text) as unknown;
      return validator(parsed);
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const lowerErr = errMsg.toLowerCase();
      const isRetryable =
        errMsg === 'INVALID_AI_SCHEMA' ||
        errMsg.includes('JSON') ||
        errMsg.includes('429') ||
        errMsg.includes('503') ||
        errMsg.includes('504') ||
        errMsg.includes('500') ||
        lowerErr.includes('resource_exhausted') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('DEADLINE_EXCEEDED') ||
        lowerErr.includes('timeout') ||
        lowerErr.includes('abort');
      if (!isRetryable || attempt === modelsToTry.length - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  throw lastError;
}

function validateRevisionPack(
  raw: unknown,
  expectedQuestionCount: number,
  difficulty: QuizDifficulty
): RevisionPack {
  if (!raw || typeof raw !== 'object') throw new Error('INVALID_AI_SCHEMA');
  const data = raw as Record<string, unknown>;
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Study Revision Pack';

  if (!Array.isArray(data.summary)) throw new Error('INVALID_AI_SCHEMA');
  const summary = data.summary
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 6);
  if (summary.length < 5) throw new Error('INVALID_AI_SCHEMA');

  if (!Array.isArray(data.quiz) || data.quiz.length < expectedQuestionCount) {
    throw new Error('INVALID_AI_SCHEMA');
  }

  const quiz: QuizQuestion[] = data.quiz.slice(0, expectedQuestionCount).map((q) => {
    if (!q || typeof q !== 'object') throw new Error('INVALID_AI_SCHEMA');
    const qObj = q as Record<string, unknown>;
    const question = typeof qObj.question === 'string' ? qObj.question.trim() : '';
    const topic = typeof qObj.topic === 'string' && qObj.topic.trim() ? qObj.topic.trim() : undefined;
    const rawOptions = Array.isArray(qObj.options)
      ? qObj.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0).map((o) => o.trim())
      : [];
    const correctIndex = typeof qObj.correctIndex === 'number' ? Math.trunc(qObj.correctIndex) : -1;
    const explanation = typeof qObj.explanation === 'string' ? qObj.explanation.trim() : '';
    const reviewTip =
      typeof qObj.reviewTip === 'string' && qObj.reviewTip.trim() ? qObj.reviewTip.trim() : undefined;

    if (!question || rawOptions.length !== 4 || correctIndex < 0 || correctIndex > 3 || !explanation) {
      throw new Error('INVALID_AI_SCHEMA');
    }

    return {
      question,
      ...(topic ? { topic } : {}),
      options: [rawOptions[0], rawOptions[1], rawOptions[2], rawOptions[3]],
      correctIndex,
      explanation,
      ...(reviewTip ? { reviewTip } : {}),
    };
  });

  if (!Array.isArray(data.keyTerms) || data.keyTerms.length < 3) throw new Error('INVALID_AI_SCHEMA');
  const keyTerms: KeyTerm[] = data.keyTerms.slice(0, 3).map((t) => {
    if (!t || typeof t !== 'object') throw new Error('INVALID_AI_SCHEMA');
    const tObj = t as Record<string, unknown>;
    const term = typeof tObj.term === 'string' ? tObj.term.trim() : '';
    const definition = typeof tObj.definition === 'string' ? tObj.definition.trim() : '';
    if (!term || !definition) throw new Error('INVALID_AI_SCHEMA');
    return { term, definition };
  });

  return { title, difficulty, questionCount: quiz.length, summary, quiz, keyTerms };
}

app.get('/api/health', (_req: Request, res: Response) => {
  const rawKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  const hasApiKey = Boolean(rawKey && rawKey !== 'MY_GEMINI_API_KEY');
  res.json({ ok: true, configured: hasApiKey });
});

app.post('/api/extract-pdf', (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, async (uploadErr: unknown) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError) {
        if (uploadErr.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'PDF file is too large. Please upload a PDF smaller than 10 MB.' });
          return;
        }
        res.status(400).json({ error: 'Failed to process the uploaded file.' });
        return;
      }
      if (uploadErr instanceof Error && uploadErr.message === 'INVALID_FILE_TYPE') {
        res.status(400).json({ error: 'Only PDF (.pdf) files are supported. Please choose a valid PDF document.' });
        return;
      }
      next(uploadErr);
      return;
    }

    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      res.status(400).json({ error: 'No PDF file was uploaded or the file is empty.' });
      return;
    }

    try {
      const { text, pageCount } = await extractTextFromPdfBuffer(req.file.buffer);
      if (!text || text.trim().length < 20) {
        res.status(422).json({
          error:
            'No readable text could be extracted from this PDF. It may be empty, password-protected, or composed of scanned images. Try pasting your notes directly.',
        });
        return;
      }

      res.json({
        text,
        pageCount,
        wordCount: countWords(text),
        fileName: req.file.originalname,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'INVALID_PDF_FORMAT') {
        res.status(400).json({ error: 'The uploaded file does not appear to be a valid PDF document.' });
        return;
      }
      res.status(422).json({
        error:
          'Could not read this PDF file. It may be corrupted or encrypted. Please try another PDF or paste your notes directly.',
      });
    }
  });
});

// 1. Quiz Making & Revision Pack
app.post('/api/generate-revision', async (req: Request, res: Response) => {
  const checked = getValidatedNotesAndKey(req, res);
  if (!checked) return;

  const rawQuestionCount = Number(req.body?.questionCount);
  const questionCount =
    Number.isInteger(rawQuestionCount) && rawQuestionCount >= 3 && rawQuestionCount <= 10 ? rawQuestionCount : 5;

  const rawDifficulty = typeof req.body?.difficulty === 'string' ? req.body.difficulty.toLowerCase().trim() : '';
  const difficulty: QuizDifficulty =
    rawDifficulty === 'easy' || rawDifficulty === 'medium' || rawDifficulty === 'hard' ? rawDifficulty : 'medium';

  const difficultyGuidance: Record<QuizDifficulty, string> = {
    easy: 'EASY difficulty: focus on direct definitions, core facts, and straightforward recall explicitly stated in the notes with clearly distinct distractors.',
    medium:
      'MEDIUM difficulty: test conceptual understanding, cause-and-effect relationships, and comparisons within the notes using plausible distractors.',
    hard: 'HARD difficulty: craft challenging analytical, multi-step, or subtle distinction questions strictly grounded in the notes, using nuanced and closely related distractors.',
  };

  const systemInstruction = [
    'You are StudyBuddy AI, an academic study assistant helping college students revise their notes.',
    'STRICT GROUNDING RULE: Use ONLY the information explicitly contained in the student notes provided by the user. Never invent facts, external definitions, dates, or answers not supported by the notes.',
    'Produce a JSON object matching the schema with:',
    '1. title: A concise, clear 3-to-7 word topic title based on the notes.',
    '2. summary: 5 to 6 bullet-point strings written in simple, student-friendly language capturing the most important points from the notes.',
    `3. quiz: Exactly ${questionCount} multiple-choice questions testing comprehension of the notes. ${difficultyGuidance[difficulty]} Each question must include: question, topic (a concise 2-to-5 word topic or section name from the notes that this question tests, e.g. "Glycolysis Net Yield"), 4 distinct options (do NOT prefix options with "A.", "B.", etc.), a zero-based integer correctIndex (0, 1, 2, or 3) with only one unambiguous correct answer, a brief explanation citing why the answer is correct based solely on the notes, and reviewTip (one clear sentence telling the student what specific concept or section of their notes to re-glance if they miss this question).`,
    '4. keyTerms: Exactly 3 important terms taken directly from the notes, each with a simple, clear definition grounded in the notes.',
  ].join('\n');

  const prompt = `Create a revision pack with ${questionCount} ${difficulty}-difficulty quiz questions strictly from the following student study notes:\n\n"""\n${checked.notes}\n"""`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      summary: { type: Type.ARRAY, items: { type: Type.STRING } },
      quiz: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            topic: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            reviewTip: { type: Type.STRING },
          },
          required: ['question', 'topic', 'options', 'correctIndex', 'explanation', 'reviewTip'],
        },
      },
      keyTerms: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            definition: { type: Type.STRING },
          },
          required: ['term', 'definition'],
        },
      },
    },
    required: ['title', 'summary', 'quiz', 'keyTerms'],
  };

  try {
    const result = await callGeminiStructured(checked.apiKey, systemInstruction, prompt, responseSchema, (raw) =>
      validateRevisionPack(raw, questionCount, difficulty)
    );
    res.json(result);
  } catch (err) {
    const mapped = getGeminiErrorResponse(err);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
  }
});

// 2. Notes Making (Structured Study Notes)
app.post('/api/generate-notes', async (req: Request, res: Response) => {
  const checked = getValidatedNotesAndKey(req, res);
  if (!checked) return;

  const rawStyle = typeof req.body?.style === 'string' ? req.body.style.toLowerCase().trim() : '';
  const style: NotesStyle =
    rawStyle === 'structured' || rawStyle === 'outline' || rawStyle === 'cornell' ? rawStyle : 'structured';

  const styleGuide: Record<NotesStyle, string> = {
    structured: 'Organize into 3 to 5 clear topical sections with concise study bullet points under each heading.',
    outline: 'Organize as a hierarchical lecture outline with 3 to 5 major topic headings and crisp sub-points.',
    cornell:
      'Organize in Cornell Notes style: 3 to 5 sections where each section has a short "cue" question/prompt and clear bulleted study notes.',
  };

  const systemInstruction = [
    'You are StudyBuddy AI, an academic note-taking assistant.',
    'STRICT GROUNDING RULE: Use ONLY facts and concepts from the student notes provided. Never invent outside facts.',
    styleGuide[style],
    'Include a concise overall takeaway sentence at the end.',
  ].join('\n');

  const prompt = `Transform these raw notes into clean ${style} study notes:\n\n"""\n${checked.notes}\n"""`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            heading: { type: Type.STRING },
            cue: { type: Type.STRING },
            points: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['heading', 'points'],
        },
      },
      takeaway: { type: Type.STRING },
    },
    required: ['title', 'sections', 'takeaway'],
  };

  try {
    const result = await callGeminiStructured<StructuredNotesResult>(
      checked.apiKey,
      systemInstruction,
      prompt,
      responseSchema,
      (raw) => {
        if (!raw || typeof raw !== 'object') throw new Error('INVALID_AI_SCHEMA');
        const data = raw as Record<string, unknown>;
        const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Organized Study Notes';
        const takeaway = typeof data.takeaway === 'string' ? data.takeaway.trim() : '';
        if (!Array.isArray(data.sections) || data.sections.length === 0 || !takeaway) {
          throw new Error('INVALID_AI_SCHEMA');
        }
        const sections = data.sections
          .map((sec) => {
            if (!sec || typeof sec !== 'object') throw new Error('INVALID_AI_SCHEMA');
            const s = sec as Record<string, unknown>;
            const heading = typeof s.heading === 'string' ? s.heading.trim() : '';
            const cue = typeof s.cue === 'string' && s.cue.trim() ? s.cue.trim() : undefined;
            const points = Array.isArray(s.points)
              ? s.points.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim())
              : [];
            if (!heading || points.length === 0) throw new Error('INVALID_AI_SCHEMA');
            return { heading, points, ...(cue ? { cue } : {}) };
          })
          .slice(0, 6);
        return { title, style, sections, takeaway };
      }
    );
    res.json(result);
  } catch (err) {
    const mapped = getGeminiErrorResponse(err);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
  }
});

// 3. Quick Revision Notes Making
app.post('/api/generate-quick-revision', async (req: Request, res: Response) => {
  const checked = getValidatedNotesAndKey(req, res);
  if (!checked) return;

  const systemInstruction = [
    'You are StudyBuddy AI, creating a crisp last-minute quick revision sheet.',
    'STRICT GROUNDING RULE: Use ONLY information from the student notes. Never invent facts.',
    'Provide: a clear topic title, 5 to 6 short high-impact summary bullets, 3 "Must-Remember" exam facts/rules directly from the notes, and 3 key terms with simple meanings.',
  ].join('\n');

  const prompt = `Build a quick revision sheet strictly from these notes:\n\n"""\n${checked.notes}\n"""`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      corePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
      mustRemember: { type: Type.ARRAY, items: { type: Type.STRING } },
      keyTerms: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            definition: { type: Type.STRING },
          },
          required: ['term', 'definition'],
        },
      },
    },
    required: ['title', 'corePoints', 'mustRemember', 'keyTerms'],
  };

  try {
    const result = await callGeminiStructured<QuickRevisionResult>(
      checked.apiKey,
      systemInstruction,
      prompt,
      responseSchema,
      (raw) => {
        if (!raw || typeof raw !== 'object') throw new Error('INVALID_AI_SCHEMA');
        const data = raw as Record<string, unknown>;
        const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Quick Revision Sheet';
        const corePoints = Array.isArray(data.corePoints)
          ? data.corePoints.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim()).slice(0, 6)
          : [];
        const mustRemember = Array.isArray(data.mustRemember)
          ? data.mustRemember.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim()).slice(0, 3)
          : [];
        const keyTerms: KeyTerm[] = Array.isArray(data.keyTerms)
          ? data.keyTerms.slice(0, 3).map((t) => {
              if (!t || typeof t !== 'object') throw new Error('INVALID_AI_SCHEMA');
              const tObj = t as Record<string, unknown>;
              const term = typeof tObj.term === 'string' ? tObj.term.trim() : '';
              const definition = typeof tObj.definition === 'string' ? tObj.definition.trim() : '';
              if (!term || !definition) throw new Error('INVALID_AI_SCHEMA');
              return { term, definition };
            })
          : [];
        if (corePoints.length < 4 || mustRemember.length < 2 || keyTerms.length < 3) {
          throw new Error('INVALID_AI_SCHEMA');
        }
        return { title, corePoints, mustRemember, keyTerms };
      }
    );
    res.json(result);
  } catch (err) {
    const mapped = getGeminiErrorResponse(err);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
  }
});

// 4. Flashcards Making
app.post('/api/generate-flashcards', async (req: Request, res: Response) => {
  const checked = getValidatedNotesAndKey(req, res);
  if (!checked) return;

  const rawCount = Number(req.body?.cardCount);
  const cardCount = Number.isInteger(rawCount) && rawCount >= 4 && rawCount <= 12 ? rawCount : 8;

  const systemInstruction = [
    'You are StudyBuddy AI, creating active-recall study flashcards.',
    'STRICT GROUNDING RULE: Use ONLY facts and concepts explicitly present in the student notes.',
    `Generate exactly ${cardCount} concise flashcards. Each card must have a focused "front" prompt/question, a clear "back" answer, and a short 3-to-8 word "hint".`,
  ].join('\n');

  const prompt = `Create ${cardCount} study flashcards strictly from these notes:\n\n"""\n${checked.notes}\n"""`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      cards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
            hint: { type: Type.STRING },
          },
          required: ['front', 'back', 'hint'],
        },
      },
    },
    required: ['title', 'cards'],
  };

  try {
    const result = await callGeminiStructured<FlashcardsResult>(
      checked.apiKey,
      systemInstruction,
      prompt,
      responseSchema,
      (raw) => {
        if (!raw || typeof raw !== 'object') throw new Error('INVALID_AI_SCHEMA');
        const data = raw as Record<string, unknown>;
        const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Flashcard Deck';
        if (!Array.isArray(data.cards) || data.cards.length < Math.min(4, cardCount)) {
          throw new Error('INVALID_AI_SCHEMA');
        }
        const cards: FlashcardItem[] = data.cards.slice(0, cardCount).map((c) => {
          if (!c || typeof c !== 'object') throw new Error('INVALID_AI_SCHEMA');
          const cObj = c as Record<string, unknown>;
          const front = typeof cObj.front === 'string' ? cObj.front.trim() : '';
          const back = typeof cObj.back === 'string' ? cObj.back.trim() : '';
          const hint = typeof cObj.hint === 'string' ? cObj.hint.trim() : '';
          if (!front || !back) throw new Error('INVALID_AI_SCHEMA');
          return { front, back, hint: hint || 'Recall from your notes' };
        });
        return { title, cards };
      }
    );
    res.json(result);
  } catch (err) {
    const mapped = getGeminiErrorResponse(err);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
  }
});

// 5. Notes Explainer
app.post('/api/explain-notes', async (req: Request, res: Response) => {
  const checked = getValidatedNotesAndKey(req, res);
  if (!checked) return;

  const focusTopic = typeof req.body?.focusTopic === 'string' ? req.body.focusTopic.trim().slice(0, 300) : '';

  const systemInstruction = [
    'You are StudyBuddy AI, a patient college tutor explaining complex study notes in clear, everyday language.',
    'STRICT GROUNDING RULE: Explain ONLY concepts present in the provided student notes. Do not invent external facts.',
    'Provide: a topic title, a clear plain-language overview, 3 to 5 step-by-step breakdown stages, one intuitive everyday analogy that accurately mirrors the process/concept in the notes, and one common misconception or pitfall to watch out for based on the notes.',
  ].join('\n');

  const prompt = focusTopic
    ? `Explain the concept "${focusTopic}" clearly using ONLY the following student notes:\n\n"""\n${checked.notes}\n"""`
    : `Explain these study notes clearly in simple step-by-step language:\n\n"""\n${checked.notes}\n"""`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      simpleOverview: { type: Type.STRING },
      stepByStep: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            stepTitle: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ['stepTitle', 'explanation'],
        },
      },
      everydayAnalogy: { type: Type.STRING },
      watchOut: { type: Type.STRING },
    },
    required: ['title', 'simpleOverview', 'stepByStep', 'everydayAnalogy', 'watchOut'],
  };

  try {
    const result = await callGeminiStructured<NotesExplainerResult>(
      checked.apiKey,
      systemInstruction,
      prompt,
      responseSchema,
      (raw) => {
        if (!raw || typeof raw !== 'object') throw new Error('INVALID_AI_SCHEMA');
        const data = raw as Record<string, unknown>;
        const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Concept Explanation';
        const simpleOverview = typeof data.simpleOverview === 'string' ? data.simpleOverview.trim() : '';
        const everydayAnalogy = typeof data.everydayAnalogy === 'string' ? data.everydayAnalogy.trim() : '';
        const watchOut = typeof data.watchOut === 'string' ? data.watchOut.trim() : '';
        if (!simpleOverview || !Array.isArray(data.stepByStep) || data.stepByStep.length < 2 || !everydayAnalogy || !watchOut) {
          throw new Error('INVALID_AI_SCHEMA');
        }
        const stepByStep = data.stepByStep.slice(0, 5).map((st) => {
          if (!st || typeof st !== 'object') throw new Error('INVALID_AI_SCHEMA');
          const s = st as Record<string, unknown>;
          const stepTitle = typeof s.stepTitle === 'string' ? s.stepTitle.trim() : '';
          const explanation = typeof s.explanation === 'string' ? s.explanation.trim() : '';
          if (!stepTitle || !explanation) throw new Error('INVALID_AI_SCHEMA');
          return { stepTitle, explanation };
        });
        return { title, simpleOverview, stepByStep, everydayAnalogy, watchOut };
      }
    );
    res.json(result);
  } catch (err) {
    const mapped = getGeminiErrorResponse(err);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyBuddy AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
