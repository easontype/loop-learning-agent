/**
 * COCA English vocabulary seed import.
 * Run: npx tsx scripts/import-coca.ts
 *
 * Seeds ~100 high-value English words for learners (B1-C1 level).
 * Common words (the, a, I, you...) are excluded — learners already know them.
 * Replace VOCAB_DATA with a full COCA 60k list CSV for production.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'db')
const DB_PATH = path.join(DB_DIR, 'lingua.db')

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

interface EnglishEntry {
  word: string
  definition: string
  example: string
  level: string
}

const VOCAB_DATA: EnglishEntry[] = [
  // B1 - Intermediate
  { word: 'achieve', definition: 'to successfully reach a goal or result', example: 'She worked hard to achieve her dream.', level: 'B1' },
  { word: 'appreciate', definition: 'to recognize the value or importance of something', example: 'I appreciate your help.', level: 'B1' },
  { word: 'assume', definition: 'to believe something is true without proof', example: 'Don\'t assume I agree with you.', level: 'B1' },
  { word: 'benefit', definition: 'an advantage or profit gained from something', example: 'Exercise has many health benefits.', level: 'B1' },
  { word: 'challenge', definition: 'a difficult task that tests your abilities', example: 'Learning a new language is a challenge.', level: 'B1' },
  { word: 'compare', definition: 'to examine similarities and differences', example: 'Compare the two options before deciding.', level: 'B1' },
  { word: 'concentrate', definition: 'to focus your attention on something', example: 'I can\'t concentrate with this noise.', level: 'B1' },
  { word: 'confident', definition: 'feeling sure about yourself or something', example: 'She felt confident about the exam.', level: 'B1' },
  { word: 'consider', definition: 'to think carefully about something', example: 'Consider all the options first.', level: 'B1' },
  { word: 'convenient', definition: 'easy to use or fitting well with your needs', example: 'Is this time convenient for you?', level: 'B1' },
  { word: 'curious', definition: 'eager to know or learn something', example: 'Children are naturally curious.', level: 'B1' },
  { word: 'decide', definition: 'to make a choice after thinking', example: 'I decided to study abroad.', level: 'B1' },
  { word: 'describe', definition: 'to say what something is like', example: 'Describe what you saw.', level: 'B1' },
  { word: 'develop', definition: 'to grow or cause something to grow over time', example: 'She developed her skills through practice.', level: 'B1' },
  { word: 'discuss', definition: 'to talk about something with others', example: 'Let\'s discuss the plan.', level: 'B1' },
  { word: 'effort', definition: 'energy used to do something', example: 'It takes effort to learn a language.', level: 'B1' },
  { word: 'encourage', definition: 'to give support or confidence to someone', example: 'He encouraged me to keep trying.', level: 'B1' },
  { word: 'expect', definition: 'to think something will happen', example: 'I expect to finish by Friday.', level: 'B1' },
  { word: 'experience', definition: 'knowledge or skill gained from doing something', example: 'She has a lot of teaching experience.', level: 'B1' },
  { word: 'flexible', definition: 'able to change easily to suit different situations', example: 'We need a flexible schedule.', level: 'B1' },
  { word: 'grateful', definition: 'feeling thankful for something', example: 'I am grateful for your advice.', level: 'B1' },
  { word: 'improve', definition: 'to make or become better', example: 'Practice daily to improve your pronunciation.', level: 'B1' },
  { word: 'include', definition: 'to contain something as part of a whole', example: 'Does the price include tax?', level: 'B1' },
  { word: 'influence', definition: 'to have an effect on someone or something', example: 'Music influences your mood.', level: 'B1' },
  { word: 'manage', definition: 'to succeed in doing something difficult', example: 'I managed to finish on time.', level: 'B1' },
  { word: 'mention', definition: 'to say or write something briefly', example: 'She mentioned she was tired.', level: 'B1' },
  { word: 'nervous', definition: 'feeling worried or anxious', example: 'I was nervous before the speech.', level: 'B1' },
  { word: 'obvious', definition: 'easy to see or understand', example: 'The answer was obvious.', level: 'B1' },
  { word: 'opportunity', definition: 'a chance to do something', example: 'This is a great opportunity to learn.', level: 'B1' },
  { word: 'prepare', definition: 'to get ready for something', example: 'Prepare your notes before the meeting.', level: 'B1' },
  { word: 'probably', definition: 'likely to happen or be true', example: 'It will probably rain today.', level: 'B1' },
  { word: 'progress', definition: 'movement toward a goal', example: 'She made great progress in English.', level: 'B1' },
  { word: 'provide', definition: 'to give something that is needed', example: 'The company provides free training.', level: 'B1' },
  { word: 'realize', definition: 'to become aware of a fact', example: 'I didn\'t realize how late it was.', level: 'B1' },
  { word: 'reduce', definition: 'to make something smaller or less', example: 'Exercise can reduce stress.', level: 'B1' },
  { word: 'require', definition: 'to need something', example: 'This job requires good communication skills.', level: 'B1' },
  { word: 'responsible', definition: 'being in charge of something or someone', example: 'She is responsible for the project.', level: 'B1' },
  { word: 'situation', definition: 'a set of circumstances at a particular time', example: 'How do you handle a difficult situation?', level: 'B1' },
  { word: 'succeed', definition: 'to achieve what you wanted to do', example: 'Hard work helps you succeed.', level: 'B1' },
  { word: 'suggest', definition: 'to put forward an idea for consideration', example: 'I suggest we meet tomorrow.', level: 'B1' },

  // B2 - Upper Intermediate
  { word: 'acknowledge', definition: 'to accept or admit that something is true', example: 'He acknowledged his mistake.', level: 'B2' },
  { word: 'adapt', definition: 'to change to fit new conditions', example: 'She quickly adapted to the new environment.', level: 'B2' },
  { word: 'ambiguous', definition: 'having more than one possible meaning', example: 'The instructions were ambiguous.', level: 'B2' },
  { word: 'anticipate', definition: 'to expect something and prepare for it', example: 'We anticipated the demand and stocked up.', level: 'B2' },
  { word: 'clarify', definition: 'to make something easier to understand', example: 'Could you clarify what you mean?', level: 'B2' },
  { word: 'commitment', definition: 'a promise or dedication to something', example: 'Learning requires commitment.', level: 'B2' },
  { word: 'complexity', definition: 'the state of being complicated', example: 'The complexity of the task surprised me.', level: 'B2' },
  { word: 'compromise', definition: 'to reach an agreement by both sides giving up something', example: 'We need to compromise on the deadline.', level: 'B2' },
  { word: 'consequence', definition: 'a result of an action or decision', example: 'Think about the consequences.', level: 'B2' },
  { word: 'crucial', definition: 'extremely important', example: 'Practice is crucial for improvement.', level: 'B2' },
  { word: 'dedicate', definition: 'to devote time or effort to something', example: 'She dedicated herself to learning Japanese.', level: 'B2' },
  { word: 'demonstrate', definition: 'to show or prove something clearly', example: 'Demonstrate how the machine works.', level: 'B2' },
  { word: 'efficient', definition: 'achieving maximum output with minimum waste', example: 'This is a more efficient method.', level: 'B2' },
  { word: 'emphasize', definition: 'to give special importance to something', example: 'The teacher emphasized pronunciation.', level: 'B2' },
  { word: 'evaluate', definition: 'to judge the quality or value of something', example: 'Evaluate the results carefully.', level: 'B2' },
  { word: 'fundamental', definition: 'forming the base or most important part', example: 'Grammar is fundamental to language.', level: 'B2' },
  { word: 'generate', definition: 'to produce or create something', example: 'This app generates new vocabulary quizzes.', level: 'B2' },
  { word: 'implement', definition: 'to put a plan or decision into action', example: 'We need to implement the changes soon.', level: 'B2' },
  { word: 'interpret', definition: 'to understand or explain the meaning of something', example: 'How do you interpret this sentence?', level: 'B2' },
  { word: 'maintain', definition: 'to keep something in the same state', example: 'Maintain eye contact when speaking.', level: 'B2' },
  { word: 'negotiate', definition: 'to discuss something to reach an agreement', example: 'They negotiated the price.', level: 'B2' },
  { word: 'obtain', definition: 'to get something, especially with effort', example: 'She obtained a scholarship.', level: 'B2' },
  { word: 'perspective', definition: 'a particular way of thinking about something', example: 'Try to see it from his perspective.', level: 'B2' },
  { word: 'precise', definition: 'exact and accurate', example: 'Please be more precise in your answer.', level: 'B2' },
  { word: 'prioritize', definition: 'to deal with the most important things first', example: 'Prioritize your tasks for the day.', level: 'B2' },
  { word: 'relevant', definition: 'closely connected to the topic', example: 'Is this information relevant to the project?', level: 'B2' },
  { word: 'significant', definition: 'important or large enough to be noticed', example: 'There was a significant improvement.', level: 'B2' },
  { word: 'strategy', definition: 'a plan of action to achieve a goal', example: 'What\'s your strategy for the exam?', level: 'B2' },
  { word: 'sufficient', definition: 'enough for a purpose', example: 'Is this information sufficient?', level: 'B2' },
  { word: 'sustain', definition: 'to keep something going over time', example: 'Can you sustain this level of effort?', level: 'B2' },

  // C1 - Advanced
  { word: 'articulate', definition: 'to express thoughts clearly and effectively', example: 'She articulated her ideas perfectly.', level: 'C1' },
  { word: 'coherent', definition: 'logical and consistent', example: 'Present a coherent argument.', level: 'C1' },
  { word: 'concise', definition: 'giving a lot of information clearly in few words', example: 'Keep your answer concise.', level: 'C1' },
  { word: 'compelling', definition: 'evoking interest or admiration in a powerful way', example: 'A compelling story keeps you reading.', level: 'C1' },
  { word: 'contemplate', definition: 'to think deeply about something', example: 'She contemplated her next move.', level: 'C1' },
  { word: 'elaborate', definition: 'to explain something in more detail', example: 'Could you elaborate on that point?', level: 'C1' },
  { word: 'eloquent', definition: 'fluent or persuasive in speaking or writing', example: 'An eloquent speech moved the audience.', level: 'C1' },
  { word: 'facilitate', definition: 'to make an action or process easier', example: 'Technology facilitates communication.', level: 'C1' },
  { word: 'implicit', definition: 'suggested but not directly stated', example: 'There was an implicit criticism in his tone.', level: 'C1' },
  { word: 'nuance', definition: 'a subtle difference in meaning or expression', example: 'Poetry is full of nuance.', level: 'C1' },
  { word: 'paradox', definition: 'a seemingly contradictory statement that is true', example: 'It\'s a paradox that the more you learn, the more you realize you don\'t know.', level: 'C1' },
  { word: 'prevalent', definition: 'widespread in a particular area at a time', example: 'Smartphones are prevalent in modern society.', level: 'C1' },
  { word: 'profound', definition: 'having deep meaning or great effect', example: 'The experience had a profound impact on her.', level: 'C1' },
  { word: 'scrutinize', definition: 'to examine very carefully', example: 'Scrutinize the contract before signing.', level: 'C1' },
  { word: 'ubiquitous', definition: 'present or appearing everywhere', example: 'Smartphones are ubiquitous today.', level: 'C1' },
  { word: 'versatile', definition: 'able to adapt to many different functions', example: 'She is a versatile musician.', level: 'C1' },
]

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY, word TEXT NOT NULL, language TEXT NOT NULL,
  reading TEXT, definition TEXT NOT NULL, example TEXT, level TEXT, source TEXT,
  created_at INTEGER DEFAULT (unixepoch()), UNIQUE(word, language)
);
CREATE TABLE IF NOT EXISTS word_progress (
  id INTEGER PRIMARY KEY, word_id INTEGER REFERENCES words(id),
  ease_factor REAL DEFAULT 2.5, interval INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0,
  last_quality INTEGER, last_reviewed INTEGER, next_review INTEGER,
  updated_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_word_progress_review ON word_progress(next_review, ease_factor);
`)

const insertWord = db.prepare(`
  INSERT OR IGNORE INTO words (word, reading, definition, example, level, language, source)
  VALUES (@word, NULL, @definition, @example, @level, 'en', 'coca-seed')
`)

const insertProgress = db.prepare(`
  INSERT OR IGNORE INTO word_progress (word_id, ease_factor, interval, repetitions, lapses, next_review)
  VALUES (?, 2.5, 1, 0, 0, unixepoch())
`)

const getWordId = db.prepare(`SELECT id FROM words WHERE word = ? AND language = 'en'`)

let inserted = 0
let skipped = 0

const run = db.transaction(() => {
  for (const entry of VOCAB_DATA) {
    const result = insertWord.run({
      word: entry.word,
      definition: entry.definition,
      example: entry.example,
      level: entry.level,
    })
    if (result.changes > 0) {
      const row = getWordId.get(entry.word) as { id: number }
      if (row) {
        insertProgress.run(row.id)
        inserted++
      }
    } else {
      skipped++
    }
  }
})

run()
console.log(`COCA import done: ${inserted} inserted, ${skipped} skipped (already exist)`)
db.close()
