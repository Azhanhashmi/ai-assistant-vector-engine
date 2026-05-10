const PDFParser = require('pdf2json')
const { embed } = require('./embeddings')
const engine = require('./engine')
const store = require('./store')

function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 20) chunks.push(chunk)
    start += chunkSize - overlap
  }
  return chunks
}

function parsePDF(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1)
    parser.on('pdfParser_dataError', err => reject(new Error(err.parserError)))
    parser.on('pdfParser_dataReady', () => {
      const text = parser.getRawTextContent()
      if (!text || text.trim().length === 0) {
        reject(new Error('Could not extract text from PDF. It may be a scanned image.'))
      } else {
        resolve(text)
      }
    })
    parser.parseBuffer(buffer)
  })
}

async function ingestText(text, source = 'text') {
  const chunks = chunkText(text)
  const results = []
  for (const chunk of chunks) {
    const id = store.save(chunk, source)
    const vector = await embed(chunk)
    await engine.insert(id, vector)
    results.push({ id, text: chunk })
  }
  return results
}

async function ingestPDF(buffer, source = 'pdf') {
  const text = await parsePDF(buffer)
  return await ingestText(text, source)
}

async function ingestTxt(buffer, source = 'txt') {
  const text = buffer.toString('utf-8')
  return await ingestText(text, source)
}

module.exports = { ingestPDF, ingestTxt, ingestText, chunkText }