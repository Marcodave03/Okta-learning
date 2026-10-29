// MySQL schema shared by the app (created automatically on first request)
// and by `npm run db:setup`. Keep this file free of runtime imports so
// Node can load it directly from scripts/db-setup.mjs.
import type { Question } from "./types";

export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS questions (
    id INT PRIMARY KEY,
    topic VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    prompt TEXT NOT NULL,
    context JSON NOT NULL,
    log JSON NOT NULL,
    images JSON NOT NULL,
    image_captions JSON NOT NULL,
    options JSON NULL,
    correct JSON NULL,
    pairs JSON NULL,
    explanation TEXT NOT NULL,
    corrected TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_questions_topic (topic)
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id TINYINT PRIMARY KEY,
    data JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    score INT NOT NULL,
    total INT NOT NULL,
    percent DECIMAL(5,2) NOT NULL,
    passed TINYINT(1) NOT NULL,
    duration_sec INT NOT NULL,
    settings JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attempts_name (name),
    INDEX idx_attempts_created (created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS attempt_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    position INT NOT NULL,
    question_id INT NOT NULL,
    question JSON NOT NULL,
    display_order JSON NOT NULL,
    right_choices JSON NOT NULL,
    answer JSON NOT NULL,
    is_correct TINYINT(1) NOT NULL,
    INDEX idx_answers_attempt (attempt_id)
  )`,
];

export const UPSERT_QUESTION = `INSERT INTO questions
  (id, topic, type, prompt, context, log, images, image_captions, options, correct, pairs, explanation, corrected)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE topic = VALUES(topic), type = VALUES(type), prompt = VALUES(prompt),
    context = VALUES(context), log = VALUES(log), images = VALUES(images), image_captions = VALUES(image_captions),
    options = VALUES(options), correct = VALUES(correct), pairs = VALUES(pairs),
    explanation = VALUES(explanation), corrected = VALUES(corrected)`;

const json = (v: unknown) => (v === undefined ? null : JSON.stringify(v));

export function questionToRow(q: Question): (string | number | null)[] {
  return [
    q.id, q.topic, q.type, q.prompt, json(q.context), json(q.log), json(q.images), json(q.imageCaptions),
    json(q.options), json(q.correct), json(q.pairs), q.explanation, q.corrected ? 1 : 0,
  ];
}
