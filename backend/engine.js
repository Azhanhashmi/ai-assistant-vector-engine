const { rejects } = require('assert')
const {spawn} = require ('child_Process')
const { resolve } = require('dns')
const path = require('path')
const readline = require('readline') //Used to read output line by line from streams, Important because your C++ prints line-based responses
//1. Start C++ engine
//2. Send commands via stdin
//3. Read output via stdout
//4. Match each response to correct request (queue)
const ENGINE_PATH = path.resolve(__dirname,'../cpp-engine/hnsw_engine.exe')

class HSNWEngine { //Purpose: control C++ engine from Node.js
    constructor(){
        this.proc = spawn(ENGINE_PATH,[], {stdio:['pipe','pipe','pipe']}) //'pipe' → connect streams so Node can read/write
        this.queue = [] //Stores pending requests why? You send command → wait → response comes later
        const rl = readline.createInterface({ input: this.proc.stdout })//Connects to C++ output and Splits it into lines
        rl.on('line', (line) => { //This runs every time C++ prints a line.
         if (this.queue.length > 0) { //Checks if any request is waiting
        const { resolve } = this.queue.shift() //Takes first pending request, Extracts its resolve function
        resolve(line.trim())//Sends response back to caller ,trim() removes newline/extra spaces
      }
    })
     //stdin  → you send commands
     //stdout → you receive results
     //stderr → debug logs
    this.proc.stderr.on('data',()=>{}) //Listens for debug/errors from C++
    this.proc.on('close',(code)=>{//Runs when C++ program stops
     console.error('Engine excited with code',code)
    })
}
    send(command){
        return new Promise((resolve,reject)=>{
        this.queue.push({resolve,reject})
        this.proc.stdin.write(command + '\n')
        })
    }

}
