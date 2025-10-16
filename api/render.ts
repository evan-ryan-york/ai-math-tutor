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

    const prompt = `You are a whiteboard rendering assistant for an educational math tutoring application.

Current whiteboard state: See the attached image (the whiteboard may be blank or have student drawings)

Task: ${description}

Generate canvas drawing commands to visualize this request on the whiteboard.

IMPORTANT RULES:
1. The canvas is approximately 800x600 pixels
2. Draw clearly with good spacing - make it easy for a 10-year-old to see
3. Use colors to make it engaging (oranges/reds for pizza, etc.)
4. Return ONLY valid JSON with the exact format shown below
5. If drawing circles (like pizza slices), space them out nicely in a grid

Available drawing primitives:
- circle: {type: "circle", x: number, y: number, radius: number, fill: "color", stroke: "color", strokeWidth: number}
- rect: {type: "rect", x: number, y: number, width: number, height: number, fill: "color", stroke: "color", strokeWidth: number}
- line: {type: "line", x1: number, y1: number, x2: number, y2: number, stroke: "color", strokeWidth: number}
- text: {type: "text", x: number, y: number, content: "string", fontSize: number, fill: "color", font: "Arial"}

Example output for "Draw 2 pizzas with 8 slices each":
{
  "commands": [
    {"type": "circle", "x": 200, "y": 300, "radius": 80, "fill": "#FFD700", "stroke": "#FF8C00", "strokeWidth": 3},
    {"type": "line", "x1": 200, "y1": 220, "x2": 200, "y2": 380, "stroke": "#FF8C00", "strokeWidth": 2},
    {"type": "line", "x1": 120, "y1": 300, "x2": 280, "y2": 300, "stroke": "#FF8C00", "strokeWidth": 2}
  ]
}

Return ONLY the JSON object with "commands" array:`

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

    console.log('=== GEMINI RENDER RESPONSE ===')
    console.log('Description:', description)
    console.log('Response text:', text)
    console.log('=============================')

    const drawingCommands = JSON.parse(text || '{"commands":[]}')

    if (!drawingCommands.commands || drawingCommands.commands.length === 0) {
      console.warn('WARNING: Gemini returned empty commands array')
    }

    return res.status(200).json(drawingCommands)
  } catch (error) {
    console.error('Render error:', error)
    return res.status(500).json({
      error: 'Failed to generate drawing commands',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
