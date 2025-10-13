# AI Math Tutor

An interactive AI-powered math tutoring application using OpenAI's Realtime API with WebRTC for voice conversations and GPT-4o Vision for interactive whiteboard rendering.

## Features

- Real-time voice tutoring using OpenAI Realtime API
- Interactive whiteboard with AI-generated visualizations
- Stage-based lesson progression
- Direct WebRTC connection (low latency)

## Prerequisites

- Node.js 18+
- OpenAI API key with Realtime API access
- Modern web browser with WebRTC support (Chrome, Edge, Safari, Firefox)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and add your OpenAI API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
ai-math-tutor/
├── src/                    # Frontend React application
│   ├── components/        # React components
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── App.tsx           # Main application component
├── api/                   # Vercel Serverless Functions
│   ├── session.ts        # WebRTC session creation
│   └── render.ts         # Whiteboard rendering
└── public/               # Static assets
```

## Deployment to Vercel

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
vercel
```

### 3. Add Environment Variable

In Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `OPENAI_API_KEY` with your API key
4. Redeploy

Or via CLI:
```bash
vercel env add OPENAI_API_KEY
```

### 4. Production Deployment

```bash
vercel --prod
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Vercel Serverless Functions
- **AI**: OpenAI Realtime API (WebRTC), GPT-4o Vision
- **Canvas**: HTML5 Canvas API

## How It Works

1. **Session Creation**: Browser requests WebRTC session from backend
2. **Backend Proxy**: Backend forwards request to OpenAI with API key
3. **WebRTC Connection**: Browser establishes direct WebRTC connection to OpenAI
4. **Voice Streaming**: Audio streams bidirectionally via WebRTC
5. **Whiteboard**: Student draws, snapshot sent to backend for AI rendering
6. **AI Drawing**: Backend calls GPT-4o Vision, returns drawing commands
7. **Rendering**: Frontend executes drawing commands on canvas

## Development Notes

- This is the project setup phase
- Core lesson orchestration logic will be added in next phase
- Current implementation includes basic scaffolding and working WebRTC connection
- Whiteboard rendering endpoint is functional but not yet integrated with realtime session

## Troubleshooting

### "Failed to create session" error
- Check that OPENAI_API_KEY is set correctly in .env.local
- Verify API key has Realtime API access
- Check browser console for detailed error messages

### No audio playback
- Ensure microphone permissions are granted
- Check browser WebRTC support
- Verify audio elements are not muted

### Canvas not rendering
- Check browser console for errors
- Verify /api/render endpoint is responding
- Test with simpler drawing commands

## Next Steps

After project setup is complete:
1. Implement lesson data structure
2. Add stage progression logic
3. Integrate whiteboard with realtime session
4. Add function calling for stage_complete
5. Add conversation history tracking

## License

MIT
