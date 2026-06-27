/**
 * JLPT N5-N2 vocabulary seed import.
 * Run: npx tsx scripts/import-jlpt.ts
 *
 * This seeds ~120 high-frequency words across N5/N4/N3/N2.
 * Replace VOCAB_DATA with a full JLPT list (e.g. from jlptstudy.net JSON) for production.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'db')
const DB_PATH = path.join(DB_DIR, 'lingua.db')

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

interface VocabEntry {
  word: string
  reading: string
  definition: string
  example?: string
  level: string
}

const VOCAB_DATA: VocabEntry[] = [
  // N5
  { word: '食べる', reading: 'たべる', definition: 'to eat', example: 'ご飯を食べる。(I eat rice.)', level: 'N5' },
  { word: '飲む', reading: 'のむ', definition: 'to drink', example: '水を飲む。(I drink water.)', level: 'N5' },
  { word: '行く', reading: 'いく', definition: 'to go', example: '学校に行く。(I go to school.)', level: 'N5' },
  { word: '来る', reading: 'くる', definition: 'to come', example: '友達が来る。(My friend is coming.)', level: 'N5' },
  { word: '見る', reading: 'みる', definition: 'to see / to watch', example: '映画を見る。(I watch a movie.)', level: 'N5' },
  { word: '聞く', reading: 'きく', definition: 'to listen / to ask', example: '音楽を聞く。(I listen to music.)', level: 'N5' },
  { word: '話す', reading: 'はなす', definition: 'to speak', example: '日本語を話す。(I speak Japanese.)', level: 'N5' },
  { word: '書く', reading: 'かく', definition: 'to write', example: '手紙を書く。(I write a letter.)', level: 'N5' },
  { word: '読む', reading: 'よむ', definition: 'to read', example: '本を読む。(I read a book.)', level: 'N5' },
  { word: '買う', reading: 'かう', definition: 'to buy', example: '野菜を買う。(I buy vegetables.)', level: 'N5' },
  { word: '大きい', reading: 'おおきい', definition: 'big / large', example: '大きい犬。(A big dog.)', level: 'N5' },
  { word: '小さい', reading: 'ちいさい', definition: 'small / little', example: '小さい猫。(A small cat.)', level: 'N5' },
  { word: '新しい', reading: 'あたらしい', definition: 'new', example: '新しい本。(A new book.)', level: 'N5' },
  { word: '古い', reading: 'ふるい', definition: 'old (thing)', example: '古い車。(An old car.)', level: 'N5' },
  { word: '高い', reading: 'たかい', definition: 'expensive / tall', example: '高いビル。(A tall building.)', level: 'N5' },
  { word: '安い', reading: 'やすい', definition: 'cheap / inexpensive', example: '安いレストラン。(A cheap restaurant.)', level: 'N5' },
  { word: '好き', reading: 'すき', definition: 'like / fond of', example: '音楽が好き。(I like music.)', level: 'N5' },
  { word: '嫌い', reading: 'きらい', definition: 'dislike / hate', example: '虫が嫌い。(I hate insects.)', level: 'N5' },
  { word: '毎日', reading: 'まいにち', definition: 'every day', example: '毎日勉強する。(I study every day.)', level: 'N5' },
  { word: '今日', reading: 'きょう', definition: 'today', example: '今日は晴れ。(Today is sunny.)', level: 'N5' },
  { word: '明日', reading: 'あした', definition: 'tomorrow', example: '明日また来る。(I\'ll come again tomorrow.)', level: 'N5' },
  { word: '昨日', reading: 'きのう', definition: 'yesterday', example: '昨日映画を見た。(I watched a movie yesterday.)', level: 'N5' },
  { word: '今', reading: 'いま', definition: 'now', example: '今何時ですか？(What time is it now?)', level: 'N5' },
  { word: '学校', reading: 'がっこう', definition: 'school', example: '学校に行く。(I go to school.)', level: 'N5' },
  { word: '先生', reading: 'せんせい', definition: 'teacher', example: '先生が来た。(The teacher came.)', level: 'N5' },
  { word: '学生', reading: 'がくせい', definition: 'student', example: '私は学生です。(I am a student.)', level: 'N5' },
  { word: '友達', reading: 'ともだち', definition: 'friend', example: '友達と遊ぶ。(I hang out with friends.)', level: 'N5' },
  { word: '家族', reading: 'かぞく', definition: 'family', example: '家族と旅行する。(Travel with family.)', level: 'N5' },
  { word: '仕事', reading: 'しごと', definition: 'work / job', example: '仕事が忙しい。(Work is busy.)', level: 'N5' },
  { word: '電車', reading: 'でんしゃ', definition: 'train', example: '電車で行く。(I go by train.)', level: 'N5' },

  // N4
  { word: '練習', reading: 'れんしゅう', definition: 'practice', example: '毎日練習する。(Practice every day.)', level: 'N4' },
  { word: '説明', reading: 'せつめい', definition: 'explanation', example: '詳しく説明する。(Explain in detail.)', level: 'N4' },
  { word: '準備', reading: 'じゅんび', definition: 'preparation', example: '準備ができた。(I\'m ready.)', level: 'N4' },
  { word: '経験', reading: 'けいけん', definition: 'experience', example: '良い経験になった。(It was a good experience.)', level: 'N4' },
  { word: '気持ち', reading: 'きもち', definition: 'feeling / emotion', example: '気持ちを伝える。(Express feelings.)', level: 'N4' },
  { word: '残念', reading: 'ざんねん', definition: 'unfortunate / regrettable', example: '残念ですね。(That\'s a shame.)', level: 'N4' },
  { word: '難しい', reading: 'むずかしい', definition: 'difficult', example: '難しい問題。(A difficult problem.)', level: 'N4' },
  { word: '簡単', reading: 'かんたん', definition: 'easy / simple', example: '簡単な質問。(A simple question.)', level: 'N4' },
  { word: '忘れる', reading: 'わすれる', definition: 'to forget', example: '名前を忘れた。(I forgot the name.)', level: 'N4' },
  { word: '覚える', reading: 'おぼえる', definition: 'to remember / memorize', example: '単語を覚える。(Memorize vocabulary.)', level: 'N4' },
  { word: '続ける', reading: 'つづける', definition: 'to continue', example: '勉強を続ける。(Continue studying.)', level: 'N4' },
  { word: '始める', reading: 'はじめる', definition: 'to begin', example: '仕事を始める。(Start work.)', level: 'N4' },
  { word: '終わる', reading: 'おわる', definition: 'to end / finish', example: '授業が終わる。(Class ends.)', level: 'N4' },
  { word: '連絡', reading: 'れんらく', definition: 'contact / communication', example: '連絡してください。(Please contact me.)', level: 'N4' },
  { word: '予定', reading: 'よてい', definition: 'plan / schedule', example: '明日の予定は？(What are your plans for tomorrow?)', level: 'N4' },
  { word: '気をつける', reading: 'きをつける', definition: 'to be careful', example: '車に気をつけて。(Watch out for cars.)', level: 'N4' },
  { word: '大丈夫', reading: 'だいじょうぶ', definition: 'okay / all right', example: '大丈夫ですか？(Are you okay?)', level: 'N4' },
  { word: '本当', reading: 'ほんとう', definition: 'truth / really', example: '本当に？(Really?)', level: 'N4' },
  { word: '特に', reading: 'とくに', definition: 'especially / particularly', example: '特に好きな食べ物。(Especially favorite food.)', level: 'N4' },
  { word: '以上', reading: 'いじょう', definition: 'more than / above / that\'s all', example: '10人以上。(More than 10 people.)', level: 'N4' },

  // N3
  { word: '雰囲気', reading: 'ふんいき', definition: 'atmosphere / vibe', example: 'いい雰囲気のカフェ。(A café with a nice vibe.)', level: 'N3' },
  { word: '影響', reading: 'えいきょう', definition: 'influence / effect', example: '大きな影響を与える。(Have a big influence.)', level: 'N3' },
  { word: '判断', reading: 'はんだん', definition: 'judgement / decision', example: '自分で判断する。(Decide for yourself.)', level: 'N3' },
  { word: '解決', reading: 'かいけつ', definition: 'solution / resolution', example: '問題を解決する。(Solve the problem.)', level: 'N3' },
  { word: '成功', reading: 'せいこう', definition: 'success', example: '試験に成功した。(Succeeded in the exam.)', level: 'N3' },
  { word: '失敗', reading: 'しっぱい', definition: 'failure', example: '失敗から学ぶ。(Learn from failure.)', level: 'N3' },
  { word: '努力', reading: 'どりょく', definition: 'effort', example: '努力すれば報われる。(Effort pays off.)', level: 'N3' },
  { word: '複雑', reading: 'ふくざつ', definition: 'complicated / complex', example: '複雑な気持ち。(Complicated feelings.)', level: 'N3' },
  { word: '確認', reading: 'かくにん', definition: 'confirmation / check', example: '内容を確認する。(Check the content.)', level: 'N3' },
  { word: '正確', reading: 'せいかく', definition: 'accurate / precise', example: '正確な情報。(Accurate information.)', level: 'N3' },
  { word: '当然', reading: 'とうぜん', definition: 'natural / of course', example: '当然の結果。(A natural outcome.)', level: 'N3' },
  { word: '一般的', reading: 'いっぱんてき', definition: 'general / common', example: '一般的な意見。(A common opinion.)', level: 'N3' },
  { word: '具体的', reading: 'ぐたいてき', definition: 'concrete / specific', example: '具体的な例を挙げる。(Give a specific example.)', level: 'N3' },
  { word: '集中', reading: 'しゅうちゅう', definition: 'concentration / focus', example: '勉強に集中する。(Focus on studying.)', level: 'N3' },
  { word: '緊張', reading: 'きんちょう', definition: 'tension / nervousness', example: '面接で緊張した。(I was nervous at the interview.)', level: 'N3' },
  { word: '安心', reading: 'あんしん', definition: 'relief / peace of mind', example: '話して安心した。(I felt relieved after talking.)', level: 'N3' },
  { word: '我慢', reading: 'がまん', definition: 'patience / endurance', example: '痛みを我慢する。(Endure the pain.)', level: 'N3' },
  { word: '遠慮', reading: 'えんりょ', definition: 'restraint / hesitation (social)', example: '遠慮せずに言って。(Say it without hesitation.)', level: 'N3' },
  { word: '丁寧', reading: 'ていねい', definition: 'polite / careful', example: '丁寧な言葉を使う。(Use polite language.)', level: 'N3' },
  { word: '印象', reading: 'いんしょう', definition: 'impression', example: '良い印象を与える。(Give a good impression.)', level: 'N3' },

  // N2
  { word: 'ephemeral', reading: '', definition: 'lasting only a short time', example: 'ephemeral beauty of cherry blossoms', level: 'N2' },
  { word: '曖昧', reading: 'あいまい', definition: 'vague / ambiguous', example: '曖昧な返事。(A vague answer.)', level: 'N2' },
  { word: '把握', reading: 'はあく', definition: 'grasp / understanding', example: '状況を把握する。(Grasp the situation.)', level: 'N2' },
  { word: '柔軟', reading: 'じゅうなん', definition: 'flexible', example: '柔軟な考え方。(Flexible thinking.)', level: 'N2' },
  { word: '克服', reading: 'こくふく', definition: 'overcome', example: '困難を克服する。(Overcome difficulties.)', level: 'N2' },
  { word: '貢献', reading: 'こうけん', definition: 'contribution', example: '社会に貢献する。(Contribute to society.)', level: 'N2' },
  { word: '妥協', reading: 'だきょう', definition: 'compromise', example: '妥協しない姿勢。(An uncompromising attitude.)', level: 'N2' },
  { word: '徹底', reading: 'てってい', definition: 'thoroughness / completely', example: '徹底的に調べる。(Investigate thoroughly.)', level: 'N2' },
  { word: '優先', reading: 'ゆうせん', definition: 'priority', example: '健康を優先する。(Prioritize health.)', level: 'N2' },
  { word: '矛盾', reading: 'むじゅん', definition: 'contradiction', example: '矛盾した発言。(A contradictory statement.)', level: 'N2' },
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
  VALUES (@word, @reading, @definition, @example, @level, 'ja', 'jlpt-seed')
`)

const insertProgress = db.prepare(`
  INSERT OR IGNORE INTO word_progress (word_id, ease_factor, interval, repetitions, lapses, next_review)
  VALUES (?, 2.5, 1, 0, 0, unixepoch())
`)

const getWordId = db.prepare(`SELECT id FROM words WHERE word = ? AND language = 'ja'`)

let inserted = 0
let skipped = 0

const run = db.transaction(() => {
  for (const entry of VOCAB_DATA) {
    const result = insertWord.run({
      word: entry.word,
      reading: entry.reading,
      definition: entry.definition,
      example: entry.example ?? null,
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
console.log(`JLPT import done: ${inserted} inserted, ${skipped} skipped (already exist)`)
db.close()
