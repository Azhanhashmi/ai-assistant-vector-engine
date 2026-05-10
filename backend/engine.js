const { spawn } = require('child_process')
const path = require('path')
const readline = require('readline')

const ENGINE_PATH = path.resolve(__dirname, '../cpp-engine/hnsw_engine.exe')

class HNSWEngine {
  constructor() {
    this.proc = spawn(ENGINE_PATH, [], { stdio: ['pipe', 'pipe', 'pipe'] })
    this.queue = []
    this.ready = true

    const rl = readline.createInterface({ input: this.proc.stdout })

    rl.on('line', (line) => {
      const trimmed = line.trim()
      if (!trimmed) return
      if (this.queue.length > 0) {
        const { resolve } = this.queue.shift()
        resolve(trimmed)
      }
    })

    // Swallow C++ debug logs from stderr
    this.proc.stderr.on('data', () => {})

    this.proc.on('close', (code) => {
      console.error(`[Engine] Process exited with code ${code}`)
      this.ready = false
    })

    this.proc.on('error', (err) => {
      console.error(`[Engine] Failed to start: ${err.message}`)
      console.error(`[Engine] Make sure hnsw_engine.exe exists at: ${ENGINE_PATH}`)
      this.ready = false
    })
  }

  send(command) {
    return new Promise((resolve, reject) => {
      if (!this.ready) {
        return reject(new Error('Engine process is not running'))
      }
      const timeout = setTimeout(() => {
        reject(new Error(`Engine timeout on command: ${command.split(' ')[0]}`))
      }, 10000)

      this.queue.push({
        resolve: (val) => { clearTimeout(timeout); resolve(val) },
        reject:  (err) => { clearTimeout(timeout); reject(err) }
      })

      this.proc.stdin.write(command + '\n')
    })
  }

  async insert(id, vector) {
    const result = await this.send(`INSERT ${id} ${vector.join(' ')}`)
    return result === 'OK'
  }

  // Returns [{ id, score }, ...]  sorted by score ascending (lower = more similar)
  async search(vector, k = 5) {
    const result = await this.send(`SEARCH ${k} ${vector.join(' ')}`)
    if (result === 'EMPTY') return []

    // Engine output format: "3:0.12 1:0.45 2:0.89"
    return result.split(' ').map(token => {
      const [id, score] = token.split(':')
      return { id: parseInt(id), score: parseFloat(score) }
    }).filter(r => !isNaN(r.id) && !isNaN(r.score))
  }

  async remove(id) {
    const result = await this.send(`DELETE ${id}`)
    return result === 'OK'
  }

  async size() {
    const result = await this.send('SIZE')
    return parseInt(result)
  }
}

// Single persistent instance — engine stays alive for the lifetime of the server
const engine = new HNSWEngine()
module.exports = engine
