/**
 * In-memory store that maps numeric IDs → original text chunks.
 * This runs alongside the C++ engine which stores vectors by the same IDs.
 * 
 * Note: This resets when the server restarts.
 * Next step (later): persist this to a JSON file or SQLite.
 */

const docs = new Map()  // id (int) → { text, source, insertedAt }
let nextId = 1

/**
 * Save a text chunk. Returns the assigned numeric ID.
 * @param {string} text - The text chunk to store
 * @param {string} source - Optional label e.g. "notes.txt", "manual"
 */
function save(text, source = 'manual') {
  const id = nextId++
  docs.set(id, {
    text,
    source,
    insertedAt: new Date().toISOString()
  })
  return id
}

/**
 * Get a single doc by ID. Returns null if not found.
 */
function get(id) {
  return docs.get(id) || null
}

/**
 * Get multiple docs by IDs. Returns array with text attached.
 */
function getMany(ids) {
  return ids.map(id => {
    const doc = docs.get(id)
    return doc ? { id, ...doc } : null
  }).filter(Boolean)
}

/**
 * Get all stored docs (useful for /docs debug endpoint).
 */
function getAll() {
  return Array.from(docs.entries()).map(([id, doc]) => ({ id, ...doc }))
}

/**
 * Delete a doc by ID.
 */
function remove(id) {
  docs.delete(id)
}

/**
 * Total number of stored docs.
 */
function count() {
  return docs.size
}

module.exports = { save, get, getMany, getAll, remove, count }
