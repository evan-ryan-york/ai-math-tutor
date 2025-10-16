import type { VercelRequest, VercelResponse } from '@vercel/node'

// Generate session config dynamically based on stage data
function generateSessionConfig(problem: string, successCriteria: string) {
  return JSON.stringify({
    type: 'realtime',
    model: 'gpt-realtime',
    audio: {
      input: {
        transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.6,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000,
          create_response: true,
          interrupt_response: false
        }
      },
      output: { voice: 'alloy' }
    },
    instructions: `You are a friendly math tutor helping a 10-year-old student. Use age-appropriate language and keep your responses short and conversational.

Current Problem: ${problem}

Success Criteria: ${successCriteria}

CRITICAL RULES:
- NEVER give away answers or do calculations for the student
- NEVER say the numbers from calculations (let them figure it out)
- NEVER tell them what operation to use (like "divide" or "multiply")
- Ask ONE simple question at a time that helps them think through the next small step
- If they're stuck, ask about what they already know
- Build on their ideas, even if imperfect - guide them gently from where they are
- Keep responses to 1-2 short sentences maximum
- When the student meets the success criteria, call stage_complete()

VISUAL TEACHING:
- When the student asks you to draw something, quietly call update_whiteboard() WITHOUT announcing it
- Do NOT say "I'm drawing" or "Let me draw" - just call the function silently
- If student says "draw", "show me", "can you draw", immediately use update_whiteboard()
- Examples: update_whiteboard({description: "Draw 16 pizza slices in a 4x4 grid"})
- Examples: update_whiteboard({description: "Draw 2 pizzas side by side, each with 8 slices"})
- You can see what's on the whiteboard and what the student has drawn
- Use visuals to reinforce concepts, but let the student do their own work

Start by greeting them warmly and asking what they notice about the problem.`,
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
        description: 'Draw visual elements on the whiteboard to help illustrate mathematical concepts. Use this to show the problem visually, create groupings, label items, or add helpful annotations.',
        parameters: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Natural language description of what to draw. Examples: "Draw 16 pizza slices arranged in a 4x4 grid", "Circle the leftover slice in red", "Draw lines to show 3 equal groups", "Label each group with the number of slices"'
            }
          },
          required: ['description']
        }
      }
    ]
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  try {
    const { sdp: clientSdp, stage } = req.body

    console.log('=== BACKEND: Received Request ===')
    console.log('SDP length:', clientSdp?.length || 0)
    console.log('Stage data:', stage)
    console.log('================================')

    if (!clientSdp || typeof clientSdp !== 'string' || !clientSdp.trim()) {
      return res.status(400).json({ error: 'Invalid or missing SDP in JSON body' })
    }

    if (!stage || !stage.problem || !stage.success_criteria) {
      return res.status(400).json({ error: 'Missing stage data (problem and success_criteria required)' })
    }

    // Generate session config dynamically from stage data
    const sessionConfig = generateSessionConfig(stage.problem, stage.success_criteria)

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
