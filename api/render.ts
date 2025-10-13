import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    const { imageDataUrl, action, description } = req.body

    if (!imageDataUrl || !action || !description) {
      return res.status(400).json({
        error: 'Missing required fields: imageDataUrl, action, description'
      })
    }

    const prompt = `You are a whiteboard rendering assistant for an educational math application.

Current whiteboard state: [See attached image]

Requested action: ${action}
Description: ${description}

Generate canvas drawing commands to fulfill this request. Return JSON with an array of drawing primitives.

Available primitives:
- circle: {type: "circle", x, y, radius, fill, stroke, strokeWidth, opacity}
- rectangle: {type: "rect", x, y, width, height, fill, stroke, strokeWidth, opacity}
- line: {type: "line", x1, y1, x2, y2, stroke, strokeWidth}
- arrow: {type: "arrow", x1, y1, x2, y2, stroke, strokeWidth, headSize}
- text: {type: "text", x, y, content, fontSize, fill, font}
- path: {type: "path", d: "SVG path string", fill, stroke, strokeWidth}

Return ONLY valid JSON: {"commands": [...]}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageDataUrl }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000
    })

    const drawingCommands = JSON.parse(response.choices[0].message.content || '{"commands":[]}')

    return res.status(200).json(drawingCommands)
  } catch (error) {
    console.error('Render error:', error)
    return res.status(500).json({
      error: 'Failed to generate drawing commands',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
