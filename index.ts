import readline from 'readline'
import { spawn } from 'child_process'
import { Readable } from 'stream'
import { rm } from 'fs/promises'

// const SERVER_URL = 'https://chat-mate-prod.azurewebsites.net'
const SERVER_URL = 'http://localhost:3010'

const ZONOS_URL = 'http://localhost:8001'

const COQUI_URL = 'http://localhost:5002'

const ZONOS_MODEL = 'transformer'
// const ZONOS_MODEL = 'hybrid'

const COQUI_SPEAKER_ID = 'p230'

const AUDIO_VOLUME = 100 // between 0 and 100

const WEBSOCKET_URL = `${SERVER_URL.replace('http', 'ws')}/ws`

function connectToWebsocket() {
  const socket = new WebSocket(WEBSOCKET_URL)

  socket.addEventListener("message", async event => {
    const msg = JSON.parse(event.data.toString())

    if (msg.type === 'event' && msg.data.topic === 'streamerChat') {
      const messageParts = msg.data.data.messageParts as any[]
      console.log(messageParts)

      const stringifiedParts = messageParts.map(part => part.type === 'text' ? part.textData.text : part.type === 'emoji' ? part.emojiData.name : part.type === 'customEmoji' ? part.customEmojiData.textData?.text ?? '' : '')
      const text = stringifiedParts.join(' ')

      try {
        await playAudioFromTextQuick(text)
      } catch (e) {
        console.error('Failed to convert chat message to speech:', e)
      }
    }
  })

  socket.addEventListener("open", event => {
    console.log('Connected to websocket')

    socket.send(JSON.stringify({
      type: 'subscribe',
      data: {
        topic: 'streamerChat',
        streamer: 'rebel_guy'
      }
    }))
  })

  socket.addEventListener("close", event => {
    console.log('close:', event.wasClean)

    connectToWebsocket()
  })

  socket.addEventListener("error", event => {
    console.log('error:', event)
  })
}

async function playAudioFromText (...str: string[]) {
  const audioStream = await generateSpeech(...str)

  const readable = Readable.from(audioStream)

  let id = Date.now()
  let i = 0
  let files: string[] = []
  readable.on('data', data => {
    i++
    const fileName = `chunk_${i}`
    Bun.write(`./data/${id}/` + fileName, data)
    files.push(fileName)
  })

  readable.on('end', () => {
    const fileList = `./data/${id}/files.txt`
    Bun.write(fileList, files.map(fileName => `file '${fileName}'`).join('\r\n'))
    const ffmpeg = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', fileList, '-c', 'copy', `./data/${id}/output.wav`])
    
    ffmpeg.on('exit', () => {
      const ffplay = spawn('ffplay', ['-nodisp', '-autoexit', `./data/${id}/output.wav`])
      
      ffplay.on('exit', () => {
        console.log('done')
        rm(`./data/${id}`, { recursive: true, force: true })
      })
    })
  })

  // const ffplayProcess = spawn('ffplay', ['-nodisp', '-autoexit', `-volume`, `${AUDIO_VOLUME}`, '-f', 'wav', '-'], {
  //   stdio: ['pipe', 'inherit', 'inherit']
  // })

  // readable.pipe(ffplayProcess.stdin)
}

// outputs the file name
async function generateSpeech (...str: string[]): Promise<ReadableStream> {
  const response = await Bun.fetch(`${ZONOS_URL}/v1/audio/speech`, { method: 'POST', body: JSON.stringify({
    model: ZONOS_MODEL,
    input: str,
    // voice: 'voice_id',
    // speed: 1, // between 0.5 and 2
    language: 'en-us',
    // emotion: {
    //   happiness: 1,
    //   sadness: 0.05,
    //   disgust: 0.05,
    //   fear: 0.05,
    //   surprise: 0.05,
    //   anger: 0.05,
    //   other: 0.1,
    //   neutral: 0.2
    // },
    response_format: 'wav',
    // prefix_audio: 'voice_id',
    // top_k: 1, // Top-K sampling: Limits selection to K most likely tokens
    // top_p: 1, // Top-P (nucleus) sampling: Dynamically limits token selection
    // min_p: 0.15 // Min-P sampling: Excludes tokens below probability threshold
  })})

  if (!response.ok) {
    throw new Error(`Failed to generate speech. Code ${response.status}: ${await response.text()}`)
  }

  return response.body!
}

async function playAudioFromTextQuick (str: string) {
  const file = await generateSpeechQuick(str)

  const process = Bun.spawn({
    cmd: ['ffplay', '-nodisp', '-autoexit', `-`],
    stdin: 'pipe',
    stdout: 'ignore',
    stderr: 'ignore',
  })

  process.stdin.write(file)
  process.stdin.flush()
  process.stdin.end()
}

// outputs the file name
async function generateSpeechQuick (str: string): Promise<ArrayBuffer> {
  const response = await fetch(`${COQUI_URL}/api/tts?text=${encodeURI(str)}&speaker_id=${COQUI_SPEAKER_ID}`, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Failed to generate speech. Code ${response.status}: ${await response.text()}`)
  }

  return await response.arrayBuffer()
}

// Create an interface for reading input from stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function getInput () {
  rl.question('', (input: string) => {
    playAudioFromTextQuick(input)
    getInput()
  })
}

connectToWebsocket()
getInput()