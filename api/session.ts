import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sdp = req.body

    const sessionConfig = JSON.stringify({
      type: 'realtime',
      model: 'gpt-realtime',
      audio: {
        output: {
          voice: 'alloy'
        }
      }
    })

    const fd = new FormData()
    fd.set('sdp', sdp)
    fd.set('session', sessionConfig)

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: fd,
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const answerSdp = await response.text()

    res.setHeader('Content-Type', 'application/sdp')
    return res.status(200).send(answerSdp)
  } catch (error) {
    console.error('Session creation error:', error)
    return res.status(500).json({
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
