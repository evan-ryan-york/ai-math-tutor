# AI Math Tutor

An interactive AI-powered math tutoring application that uses real-time voice conversations and an intelligent whiteboard to teach mathematical concepts through engaging, stage-based lessons.

## Overview

The AI Math Tutor provides personalized, voice-based math instruction with visual aids. Students interact naturally through speech while drawing solutions on an interactive whiteboard. The AI tutor sees student work in real-time, provides guidance, and adapts instruction based on demonstrated mastery of learning objectives.

### Key Features

- **Real-time Voice Tutoring**: Natural speech-to-speech conversations using OpenAI's Realtime API with WebRTC (low latency ~300-500ms)
- **Interactive Whiteboard**: Students draw solutions; AI can see drawings and add visual annotations
- **Stage-Based Learning**: Structured lessons with progressive complexity and mastery-based advancement
- **Intelligent Orchestration**: AI determines when students are ready to advance based on learning objectives
- **Visual Rendering**: Google Gemini 2.5 Flash analyzes whiteboard state and generates drawing commands

### Current Implementation

This application features a complete division-with-remainders lesson using a pizza-sharing scenario:
- **Stage 1**: Understanding remainders (16 slices ÷ 3 people)
- **Stage 2**: Multiple constraints (separate cheese and pepperoni pizzas)
- Voice interaction with adaptive tutoring
- Real-time whiteboard collaboration
- Automatic stage progression when mastery criteria are met

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18 + TypeScript + Vite | Interactive user interface |
| **Voice AI** | OpenAI `gpt-realtime` (Aug 2025) | Real-time voice tutoring |
| **Vision AI** | Google Gemini 2.5 Flash (Sept 2025) | Whiteboard image analysis |
| **Backend** | Vercel Serverless Functions | API proxy and rendering |
| **Connection** | WebRTC | Low-latency audio streaming |
| **Canvas** | HTML5 Canvas API | Drawing and visualization |

## Prerequisites

Before setting up the project, ensure you have:

- **Node.js**: Version 18 or higher
- **pnpm**: Package manager (or npm/yarn)
- **OpenAI API Key**: With Realtime API access ([Get one here](https://platform.openai.com/api-keys))
- **Google AI API Key**: For Gemini API ([Get one here](https://aistudio.google.com/apikey))
- **Modern Browser**: Chrome, Edge, Safari, or Firefox with WebRTC support
- **Vercel CLI**: For local development with serverless functions

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-math-tutor.git
cd ai-math-tutor
```

### 2. Install Dependencies

Using pnpm (recommended):
```bash
pnpm install
```

Or using npm:
```bash
npm install
```

### 3. Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

Or with pnpm:
```bash
pnpm add -g vercel
```

### 4. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
```env
# Required: OpenAI API Key for real-time voice tutoring
OPENAI_API_KEY=sk-proj-your-actual-openai-key-here

# Required: Google AI API Key for whiteboard rendering
GOOGLE_API_KEY=your-actual-google-ai-key-here
```

**Important Notes:**
- Your OpenAI account must have access to the Realtime API (not all keys have this)
- Both API keys are required for full functionality
- Never commit `.env.local` to version control (it's in `.gitignore`)

### 5. Start Development Server

**For full functionality (recommended):**
```bash
pnpm run dev:vercel
```

This runs `vercel dev` which:
- Starts the Vite development server for the frontend
- Runs serverless API functions locally (`/api/session` and `/api/render`)
- Loads environment variables from `.env.local`
- Serves the app at `http://localhost:3000` (default)

**For frontend-only development (no API endpoints):**
```bash
pnpm run dev
```
Note: This starts only the frontend. Voice session will fail with 404 errors without API endpoints.

### 6. Test the Application

1. Open your browser to `http://localhost:3000`
2. Click **"Start Lesson"**
3. Click **"Start Voice Session"** and allow microphone access
4. The AI tutor will begin speaking about the pizza problem
5. Respond naturally by voice
6. Draw on the whiteboard to show your work

## Project Structure

```
ai-math-tutor/
├── api/                      # Vercel Serverless Functions (Backend)
│   ├── session.ts           # WebRTC session creation (OpenAI proxy)
│   ├── render.ts            # Whiteboard rendering (Gemini vision)
│   └── tsconfig.json        # TypeScript config for API functions
│
├── src/                      # React Frontend Application
│   ├── components/          # UI Components
│   │   ├── StageDisplay.tsx      # Shows current lesson stage
│   │   ├── VoiceInterface.tsx    # WebRTC connection & audio
│   │   ├── Whiteboard.tsx        # Interactive drawing canvas
│   │   └── ErrorBoundary.tsx     # Error handling
│   ├── data/                # Data & Content
│   │   └── lessons.ts            # Lesson definitions & stages
│   ├── types/               # TypeScript Definitions
│   │   └── index.ts              # Shared type definitions
│   ├── utils/               # Utilities
│   │   └── testHelpers.ts        # Development testing tools
│   ├── App.tsx              # Main application logic
│   ├── main.tsx             # React entry point
│   └── App.css              # Styles
│
├── docs/                     # Documentation
│   └── ai/                  # AI/Architecture Documentation
│       ├── feature-details.md    # Complete implementation guide
│       ├── model-choices.md      # AI model selection rationale
│       └── ...                   # Additional docs
│
├── public/                   # Static Assets
├── dist/                     # Build output (generated)
│
├── .env.example             # Environment variables template
├── .env.local               # Your local environment (git-ignored)
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
├── vercel.json              # Vercel deployment configuration
└── README.md                # This file
```

## How It Works

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React Frontend)                                    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Voice Interface                                       │  │
│  │  WebRTC ←──────────────────→ OpenAI gpt-realtime     │  │
│  │  • Low latency audio streaming                        │  │
│  │  • Data channel for events                            │  │
│  │  • Stage context via session.update                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Whiteboard Component                                  │  │
│  │  • Student drawing capture                             │  │
│  │  • AI-generated annotations                            │  │
│  │  • Image → Backend API                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ REST API Calls
                  ↓
┌─────────────────────────────────────────────────────────────┐
│  Vercel Serverless Functions                                 │
│                                                               │
│  ┌──────────────────────┐    ┌─────────────────────────┐   │
│  │  /api/session        │    │  /api/render            │   │
│  │  OpenAI Realtime API │    │  Google Gemini API      │   │
│  │  • WebRTC SDP        │    │  • Image analysis       │   │
│  │  • Session config    │    │  • Drawing commands     │   │
│  └──────────────────────┘    └─────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Session Flow

1. **Lesson Start**: User clicks "Start Lesson" → loads lesson data → displays Stage 1
2. **Voice Connection**: User clicks "Start Voice Session" → requests microphone → creates WebRTC connection
3. **Session Creation**: Frontend sends SDP offer to `/api/session` → backend proxies to OpenAI → returns answer
4. **WebRTC Established**: Direct browser ↔ OpenAI connection for audio streaming
5. **AI Introduction**: AI tutor presents the problem using stage context
6. **Student Interaction**: Student speaks and draws on whiteboard
7. **Whiteboard Sync**: Canvas snapshots sent to AI via data channel for context
8. **Stage Progression**: AI calls `stage_complete()` when mastery criteria met → app loads next stage
9. **Lesson Complete**: Final stage completed → celebration message

### Voice Activity Detection (VAD)

The application uses OpenAI's server-side VAD with tuned settings to prevent false positives:

- **Threshold**: `0.6` (higher = less sensitive, prevents AI's own voice from triggering)
- **Silence Duration**: `1000ms` (waits 1 second of silence before considering turn complete)
- **Prefix Padding**: `300ms` (captures audio before speech detection for natural onset)

These settings were optimized to prevent the AI from interrupting itself while maintaining natural conversation flow.

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev:vercel` | **Recommended:** Start Vercel dev server (frontend + API functions) |
| `pnpm run dev` | Start Vite only (frontend-only, no API endpoints) |
| `pnpm run build` | Build production bundle (TypeScript check + Vite build) |
| `pnpm run preview` | Preview production build locally |
| `pnpm run lint` | Run ESLint on TypeScript/React files |

### Adding New Lessons

Edit `src/data/lessons.ts`:

```typescript
export const lessons: Record<string, Lesson> = {
  'your-lesson-id': {
    lesson_id: 'your-lesson-id',
    title: 'Your Lesson Title',
    learning_goal: 'What students will learn',
    stages: [
      {
        stage_id: 1,
        problem: 'Present the problem...',
        learning_objective: 'What this stage teaches',
        mastery_criteria: {
          description: 'How to know student is ready',
          indicators: ['Signal 1', 'Signal 2']
        },
        context_for_agent: 'Instructions for AI tutor...'
      }
      // More stages...
    ]
  }
}
```

### Customizing AI Behavior

Voice AI settings are in `src/App.tsx` in the `sendSessionUpdate()` function:

```typescript
turn_detection: {
  type: 'server_vad',
  threshold: 0.6,           // Adjust sensitivity (0.0-1.0)
  prefix_padding_ms: 300,   // Audio capture before speech
  silence_duration_ms: 1000 // Wait time before turn ends
}
```

## Deployment to Vercel

### Option 1: Deploy via CLI

```bash
# Login to Vercel (first time only)
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Option 2: Deploy via GitHub Integration

1. Push your code to GitHub
2. Visit [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `OPENAI_API_KEY`
   - `GOOGLE_API_KEY`
6. Click "Deploy"

### Adding Environment Variables via CLI

```bash
vercel env add OPENAI_API_KEY production
vercel env add GOOGLE_API_KEY production
```

Or via Vercel Dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add each variable for Production, Preview, and Development

## Troubleshooting

### API Endpoints Return 404

**Symptom**: Voice session fails with "Failed to create session"

**Solution**: You must use the Vercel dev server, not plain Vite:
```bash
pnpm run dev:vercel  # ✓ Correct - runs vercel dev with API endpoints
pnpm run dev         # ✗ Wrong - only frontend, API endpoints won't work
```

### AI Keeps Interrupting Itself

**Symptom**: AI starts speaking but cuts itself off repeatedly

**Solution**: Adjust VAD threshold in `src/App.tsx`:
```typescript
threshold: 0.7,  // Increase for noisier environments
silence_duration_ms: 1200  // Increase for more patience
```

### No Audio Playback

**Causes & Solutions**:
- Microphone not permitted → Check browser permissions
- Audio element muted → Check browser audio settings
- Wrong browser → Use Chrome/Edge (best WebRTC support)
- Autoplay blocked → User gesture required (button click already present)

### "OPENAI_API_KEY not configured"

**Causes & Solutions**:
- `.env.local` not created → Run `cp .env.example .env.local`
- Wrong key format → Check for extra spaces or quotes
- Key doesn't have Realtime API access → Contact OpenAI support
- Using `vite` instead of `vercel dev` → Environment not loaded

### Whiteboard Not Rendering AI Drawings

**Causes & Solutions**:
- Missing `GOOGLE_API_KEY` → Add to `.env.local`
- API rate limit exceeded → Check Google AI Console
- Console errors → Check Network tab for `/api/render` response
- Drawing commands malformed → Check backend logs

### Build Errors

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check TypeScript errors
pnpm run build
```

## Cost Estimates

### Per 10-Minute Session

- **Voice (OpenAI gpt-realtime)**: ~$1.44
  - Input: ~15,000 tokens × $32/1M = $0.48
  - Output: ~15,000 tokens × $64/1M = $0.96
- **Whiteboard (Gemini 2.5 Flash)**: ~$0.01
  - ~5 render requests per session
  - Very low cost due to Flash variant

**Total: ~$1.45 per 10-minute session**

### Cost Optimization Tips

- Use prompt caching for repeated instructions (98.75% discount)
- Consider `gpt-realtime-mini` for simpler lessons (70% cheaper)
- Batch whiteboard updates
- Implement session time limits

## Documentation

- **[Feature Details](./docs/ai/feature-details.md)**: Complete implementation guide
- **[Model Choices](./docs/ai/model-choices.md)**: AI model selection rationale and alternatives
- **[Testing Checklist](./docs/ai/testing-checklist.md)**: QA checklist for deployments

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m "Description"`
4. Push to your fork: `git push origin feature-name`
5. Open a Pull Request

## Future Enhancements

- [ ] Multi-lesson support with lesson selection UI
- [ ] Student progress tracking and analytics
- [ ] Session history with replay capability
- [ ] Mobile/tablet optimization
- [ ] Text-based fallback for students without microphones
- [ ] Multi-language support
- [ ] Teacher dashboard for monitoring student progress
- [ ] Supabase integration for persistent data
- [ ] Authentication and user accounts

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review troubleshooting section above

## Acknowledgments

Built with:
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Vercel](https://vercel.com/)

---

**Made with ❤️ for math education**
