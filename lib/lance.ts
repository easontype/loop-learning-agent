import path from 'path'
import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _table: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _embedder: any = null

async function getEmbedder() {
  if (!_embedder) {
    const { pipeline } = await import('@xenova/transformers')
    _embedder = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5')
  }
  return _embedder as (text: string, opts: object) => Promise<{ data: Float32Array }>
}

async function getTable() {
  if (_table) return _table
  const dbPath = path.join(process.cwd(), 'db', 'lance')
  fs.mkdirSync(dbPath, { recursive: true })
  const { connect } = await import('@lancedb/lancedb')
  const db = await connect(dbPath)
  const tables = await db.tableNames()
  if (tables.includes('memories')) {
    _table = await db.openTable('memories')
  } else {
    _table = await db.createTable('memories', [{
      session_id: 0,
      summary: '',
      vector: new Array(384).fill(0),
      language: 'en',
      created_at: 0,
      recency_weight: 0,
    }])
  }
  return _table
}

export async function insertMemory(r: {
  session_id: number
  summary: string
  language: string
  created_at: number
}) {
  const embedder = await getEmbedder()
  const out = await embedder(r.summary, { pooling: 'mean', normalize: true })
  const vector = Array.from(out.data)
  const daysSince = (Date.now() / 1000 - r.created_at) / 86400
  const table = await getTable()
  await table.delete(`session_id = ${r.session_id}`)
  await table.add([{ ...r, vector, recency_weight: Math.exp(-daysSince / 90) }])
}

export async function searchMemories(
  queryText: string,
  language: string,
  limit = 3
): Promise<Array<{ summary: string; created_at: number }>> {
  const embedder = await getEmbedder()
  const out = await embedder(queryText, { pooling: 'mean', normalize: true })
  const table = await getTable()
  return table
    .search(Array.from(out.data))
    .where(`language = '${language}'`)
    .limit(limit)
    .toArray()
}
