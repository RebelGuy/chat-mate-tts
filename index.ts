import readline from 'readline'

const SERVER_URL = 'https://chat-mate-prod.azurewebsites.net'
// const SERVER_URL = 'http://localhost:3010'

const COQUI_URL = 'http://localhost:5002'

// const COQUI_SPEAKER_ID = 'p263'
const COQUI_SPEAKER_IDS = ["ED","p225","p226","p227","p228","p229","p230","p231","p232","p233","p234","p236","p237","p238","p239","p240","p241","p243","p244","p245","p246","p247","p248","p249","p250","p251","p252","p253","p254","p255","p256","p257","p258","p259","p260","p261","p262","p263","p264","p265","p266","p267","p268","p269","p270","p271","p272","p273","p274","p275","p276","p277","p278","p279","p280","p281","p282","p283","p284","p285","p286","p287","p288","p292","p293","p294","p295","p297","p298","p299","p300","p301","p302","p303","p304","p305","p306","p307","p308","p310","p311","p312","p313","p314","p316","p317","p318","p323","p326","p329","p330","p333","p334","p335","p336","p339","p340","p341","p343","p345","p347","p351","p360","p361","p362","p363","p364","p374","p376"]

const WEBSOCKET_URL = `${SERVER_URL.replace('http', 'ws')}/ws`

const PING_INTERVAL = 10_000

function connectToWebsocket() {
  let interval: NodeJS.Timeout | null = null
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
    interval = setInterval(() => socket.ping(), PING_INTERVAL)

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
    
    if (interval != null) {
      clearInterval(interval)
    }

    connectToWebsocket()
  })

  socket.addEventListener("error", event => {
    console.log('error:', event)
  })
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
  const speaker = COQUI_SPEAKER_IDS[Math.floor(Math.random() * COQUI_SPEAKER_IDS.length)]
  const response = await fetch(`${COQUI_URL}/api/tts?text=${encodeURI(str)}&speaker_id=${speaker}`, { method: 'GET' })

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