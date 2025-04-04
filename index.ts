import readline from 'readline'

// const SERVER_URL = 'https://chat-mate-prod.azurewebsites.net'
const SERVER_URL = 'http://localhost:3010'

const ZONOS_URL = 'http://localhost:8001'

const ZONOS_MODEL = 'Zyphra/Zonos-v0.1-transformer'
// const ZONOS_MODEL = 'Zyphra/Zonos-v0.1-hybrid'

const AUDIO_VOLUME = 100 // between 0 and 100

const WEBSOCKET_URL = `${SERVER_URL.replace('http', 'ws')}/ws`

const socket = new WebSocket(WEBSOCKET_URL)

socket.addEventListener("message", async event => {
  const msg = JSON.parse(event.data.toString())

  if (msg.type === 'event' && msg.data.topic === 'streamerChat') {
    const messageParts = msg.data.data.messageParts as any[]
    console.log(messageParts)

    const stringifiedParts = messageParts.map(part => part.type === 'text' ? part.textData.text : part.type === 'emoji' ? part.emojiData.name : part.type === 'customEmoji' ? part.customEmojiData.textData?.text ?? '' : '')
    const text = stringifiedParts.join(' ')

    try {
      await playAudioFromText(text)
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
})

socket.addEventListener("error", event => {
  console.log('error:', event)
})

async function playAudioFromText (str: string) {
  const file = await generateSpeech(str)

  Bun.spawn({
    cmd: ['ffplay', '-nodisp', '-autoexit', `-volume`, `${AUDIO_VOLUME}`, `${file.name!}`],
    stdout: 'ignore',
    stderr: 'ignore',
    onExit: () => file.delete().catch(e => console.error('Unable to delete file:', e))
  })
}

// outputs the file name
async function generateSpeech (str: string): Promise<Bun.BunFile> {
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
    response_format: 'mp3',
    // prefix_audio: 'voice_id',
    // top_k: 1, // Top-K sampling: Limits selection to K most likely tokens
    // top_p: 1, // Top-P (nucleus) sampling: Dynamically limits token selection
    // min_p: 0.15 // Min-P sampling: Excludes tokens below probability threshold
  })})

  if (!response.ok) {
    throw new Error(`Failed to generate speech. Code ${response.status}: ${await response.text()}`)
  }

  const file = Bun.file(`speech_${Date.now()}.mp3`)
  await Bun.write(file, response)
  return file
}

// Create an interface for reading input from stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function getInput () {
  rl.question('', (input: string) => {
    playAudioFromText(input)
    getInput()
  })
}

getInput()
