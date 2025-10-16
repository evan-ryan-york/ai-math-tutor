import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

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
    const { imageDataUrl, action = 'draw', description } = req.body

    if (!imageDataUrl || !description) {
      return res.status(400).json({
        error: 'Missing required fields: imageDataUrl, description'
      })
    }

    const prompt = `You are a whiteboard rendering assistant for an educational math application.

Current whiteboard state: [See attached image]

Request: ${description}
${action !== 'draw' ? `Action type: ${action}` : ''}

Generate canvas drawing commands to fulfill this request. Return JSON with an array of drawing primitives.

Available primitives:
- circle: {type: "circle", x, y, radius, fill, stroke, strokeWidth, opacity}
- rectangle: {type: "rect", x, y, width, height, fill, stroke, strokeWidth, opacity}
- line: {type: "line", x1, y1, x2, y2, stroke, strokeWidth}
- arrow: {type: "arrow", x1, y1, x2, y2, stroke, strokeWidth, headSize}
- text: {type: "text", x, y, content, fontSize, fill, font}
- path: {type: "path", d: "SVG path string", fill, stroke, strokeWidth}

Return ONLY valid JSON: {"commands": [...]}`

    // Convert base64 data URL to format Gemini expects
    const base64Data = imageDataUrl.split(',')[1]
    const mimeType = imageDataUrl.split(';')[0].split(':')[1]

    // Use Gemini 2.5 Flash - best for multimodal reasoning and image understanding
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    })

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      },
      prompt
    ])

    const response = await result.response
    const text = response.text()
    const drawingCommands = JSON.parse(text || '{"commands":[]}')

    return res.status(200).json(drawingCommands)
  } catch (error) {
    console.error('Render error:', error)
    return res.status(500).json({
      error: 'Failed to generate drawing commands',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
