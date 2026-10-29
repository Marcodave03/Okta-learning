export type QuestionType = "single" | "multiple" | "matching";

export interface Pair {
  left: string;
  right: string;
}

export interface Question {
  id: number;
  topic: string;
  type: QuestionType;
  /** Paragraphs shown above the question (case studies, scenarios). `**text**` renders bold. */
  context: string[];
  /** System Log excerpt lines, rendered in a log panel. */
  log: string[];
  images: string[];
  imageCaptions: string[];
  prompt: string;
  /** single / multiple choice */
  options?: string[];
  /** Indices into `options`. */
  correct?: number[];
  /** matching: each left item must be matched to its right item */
  pairs?: Pair[];
  explanation: string;
  /** True when the answer differs from the one highlighted in the source document. */
  corrected: boolean;
}

export interface Answer {
  /** Original option indices (single / multiple). */
  selected?: number[];
  /** Chosen right-hand value for each pair, by original pair index (matching). */
  matches?: string[];
}

export type FeedbackMode = "end" | "instant";

export interface TestSettings {
  /** 0 means every question in the selected topics. */
  questionCount: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  /** Empty means all topics. */
  topics: string[];
  /** 0 means no time limit. */
  timeLimitMinutes: number;
  passingScore: number;
  feedback: FeedbackMode;
  allowBack: boolean;
  requireAllAnswered: boolean;
}

/** A question as presented in one test: display order of options/pairs and the shuffled match choices. */
export interface TestQuestion {
  question: Question;
  order: number[];
  rightChoices: string[];
}

export interface AttemptItem extends TestQuestion {
  answer: Answer;
  isCorrect: boolean;
}

export interface AttemptSummary {
  id: number;
  name: string;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  durationSec: number;
  createdAt: string;
}

export interface Attempt extends AttemptSummary {
  settings: TestSettings;
  items: AttemptItem[];
}

export type NewAttempt = Omit<Attempt, "id" | "createdAt">;
