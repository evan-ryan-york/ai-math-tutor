import type { VercelRequest, VercelResponse } from '@vercel/node'

// Session configuration for the unified interface
const sessionConfig = JSON.stringify({
  type: 'realtime',
  model: 'gpt-realtime',
  audio: {
    output: { voice: 'alloy' }
  },
  instructions: `You are a helpful math tutor. You must ALWAYS respond in English only. Never use Spanish or any other language.

The student is working on a pizza division problem: "I've got two friends coming over later today, I've got two pizzas, and each pizza is cut into 8 slices. The three of us want to share the two pizzas, but we're not sure how to do it so we all get the same amount of pizza."

Your goal is to guide the student to discover that 16÷3 = 5 remainder 1. Accept creative solutions. DO NOT rush to fractions yet - let them explore the remainder concept. Use the whiteboard to visualize if helpful. Call stage_complete() when the student clearly understands there's one slice left over after equal distribution.`,
  tools: [
    {
      type: 'function',
      name: 'stage_complete',
      description: 'Call this when the student has demonstrated mastery of the current learning objective',
      parameters: {
        type: 'object',
        properties: {
          reasoning: {
            type: 'string',
            description: 'Brief explanation of why student is ready to advance'
          }
        },
        required: ['reasoning']
      }
    },
    {
      type: 'function',
      name: 'update_whiteboard',
      description: 'Add or modify content on the interactive whiteboard',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['draw', 'highlight', 'label', 'clear'],
            description: 'Type of whiteboard action'
          },
          description: {
            type: 'string',
            description: 'Natural language description of what to draw/modify'
          }
        },
        required: ['action', 'description']
      }
    }
  ]
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  try {
    const { sdp: clientSdp } = req.body

    console.log('=== BACKEND: Received Request ===')
    console.log('SDP length:', clientSdp?.length || 0)
    console.log('================================')

    if (!clientSdp || typeof clientSdp !== 'string' || !clientSdp.trim()) {
      return res.status(400).json({ error: 'Invalid or missing SDP in JSON body' })
    }

    // Use the unified interface - send FormData with SDP and session config
    const fd = new FormData()
    fd.set('sdp', clientSdp)
    fd.set('session', sessionConfig)

    console.log('=== BACKEND: Sending to /v1/realtime/calls (unified interface) ===')
    console.log('Session config:', sessionConfig)
    console.log('===================================================================')

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: fd
    })

    console.log('=== BACKEND: Response ===')
    console.log('Status:', response.status)
    console.log('=========================')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('=== BACKEND: Error ===')
      console.error('Body:', errorText)
      console.error('======================')
      throw new Error(`OpenAI error: ${response.status} - ${errorText}`)
    }

    const answerSdp = await response.text()
    res.setHeader('Content-Type', 'application/sdp')
    return res.status(200).send(answerSdp)

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Session creation error:', message)
    return res.status(500).json({ error: 'Failed to create session', details: message })
  }
}
