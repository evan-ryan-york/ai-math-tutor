# AI Math Tutor - Architecture Overview

## System Description

The AI Math Tutor is an interactive educational application that uses AI agents to guide students through stage-based math lessons via voice conversations and an interactive whiteboard. The system employs a **dual-agent architecture** where a realtime conversational agent interacts with the student, and an orchestrator agent manages lesson flow and rendering tasks.

## High-Level Architecture

### The Two Agent System

#### 1. **Realtime Agent** (OpenAI Realtime API)
- **Model**: `gpt-4o-realtime-preview-2024-10`
- **Primary Role**: Direct voice conversation with the student
- **Connection**: WebRTC (low-latency audio streaming)
- **Lifecycle**: Starts and ends with each lesson stage

**Capabilities:**
- Speaks and listens to the student via WebRTC audio
- Sees the whiteboard through image snapshots sent by the orchestrator
- Calls two tool functions:
  - `stage_complete(reasoning)` - Signals mastery and readiness to advance
  - `update_whiteboard(action, description)` - Requests drawings with semantic descriptions
- Receives stage-specific context and instructions from the orchestrator

**What it CANNOT do:**
- Draw on the whiteboard (produces only semantic descriptions)
- Load lesson stages or manage progression
- Execute rendering commands

#### 2. **Orchestrator Agent** (Frontend Application Logic)
- **Implementation**: React application (`App.tsx`)
- **Primary Role**: Manages lesson flow and executes rendering tasks
- **Lifecycle**: Runs continuously throughout the entire lesson

**Responsibilities:**
- Loads lesson stages with images and context
- Configures the realtime agent with stage-specific instructions
- Listens for `stage_complete` function calls and advances stages
- Receives `update_whiteboard` function calls with semantic descriptions
- Converts semantic descriptions to visual rendering commands (via `/api/render`)
- Executes drawing commands on the canvas
- Captures and sends whiteboard snapshots to the realtime agent

**What it CANNOT do:**
- Have voice conversations with the student (delegates to realtime agent)
- Make real-time teaching decisions (delegates to realtime agent)

## Lesson Structure

Each lesson consists of multiple **stages**, where each stage contains:

1. **Image**: A visual representation of the problem (e.g., pizza illustration)
2. **Problem/Question**: Text presented to the student describing the challenge
3. **Interactive Whiteboard**: A shared canvas where both student and AI can draw
4. **Learning Objective**: What concept the student should master
5. **Mastery Criteria**: Indicators that the student is ready to advance
6. **Context for Agent**: Instructions that guide the realtime agent's teaching behavior

## Component Interaction Flow

### Lesson Initialization

```
User clicks "Start Lesson"
  ↓
Orchestrator loads lesson data from lessons.ts
  ↓
Orchestrator displays Stage 1 (problem + image)
  ↓
User clicks "Start Voice Session"
  ↓
Orchestrator creates WebRTC connection to OpenAI
  ↓
Orchestrator sends stage context to Realtime Agent
  ↓
Realtime Agent begins conversation with student
```

### Whiteboard Drawing by Student (Debounced Image Capture)

The realtime agent needs to see what the student is drawing to discuss their work. This is achieved through debounced image capture:

```
Student draws on whiteboard
  ↓
Drawing events occur (mousemove, pen input, etc.)
  ↓
Student stops drawing for 1 second (debounce timer)
  ↓
Orchestrator captures canvas as image (data URL)
  ↓
Orchestrator sends image to Realtime Agent via data channel
  ↓
Realtime Agent can now "see" the drawing
  ↓
Realtime Agent references drawing in conversation
  ("I see you've drawn three circles...")
```

**Why Debouncing?**
- Prevents sending images on every single stroke
- Waits for student to complete a thought/drawing
- Reduces API calls and improves performance
- 1-second delay balances responsiveness with efficiency

### Whiteboard Drawing by AI

When the AI tutor wants to visualize a concept, it produces a semantic description that the orchestrator renders:

```
Realtime Agent calls update_whiteboard("draw", "three circles in a row")
  ↓
Orchestrator receives function call via data channel
  ↓
Orchestrator sends request to /api/render endpoint
  - Current whiteboard image (data URL)
  - Action type ("draw")
  - Semantic description ("three circles in a row")
  ↓
Backend uses Gemini 2.5 Flash to analyze image
  ↓
Gemini generates canvas drawing commands (JSON)
  [
    { type: 'circle', x: 100, y: 200, radius: 50, stroke: '#000' },
    { type: 'circle', x: 250, y: 200, radius: 50, stroke: '#000' },
    { type: 'circle', x: 400, y: 200, radius: 50, stroke: '#000' }
  ]
  ↓
Orchestrator receives drawing commands
  ↓
Orchestrator dispatches 'whiteboard-draw' event
  ↓
Whiteboard component executes commands on canvas
  ↓
Canvas is updated with AI's drawing
  ↓
After 1-second debounce, new image sent to Realtime Agent
  ↓
Realtime Agent sees its own drawing and continues teaching
```

### Stage Progression

```
Realtime Agent determines student has mastered objective
  ↓
Realtime Agent calls stage_complete("Student understands remainders")
  ↓
Orchestrator receives function call via data channel
  ↓
Orchestrator validates progression
  ↓
Orchestrator loads next stage from lessons.ts
  ↓
Orchestrator updates UI with new problem and image
  ↓
Orchestrator sends new stage context to Realtime Agent
  ↓
Realtime Agent adapts to new stage instructions
  ↓
Realtime Agent continues conversation with new focus
```

## Technical Architecture

### Frontend (React + TypeScript)

**Key Files:**
- `src/App.tsx` - Orchestrator agent implementation
- `src/components/Whiteboard.tsx` - Canvas drawing and rendering
- `src/components/VoiceInterface.tsx` - WebRTC connection setup
- `src/components/StageDisplay.tsx` - Stage UI presentation
- `src/data/lessons.ts` - Lesson and stage definitions

**State Management:**
- `SessionState` - Tracks current lesson, stage, WebRTC connections
- `currentStage` - Active stage data (problem, context, objectives)
- `conversationLog` - Transcript of AI and student messages
- `whiteboardImageRef` - Current whiteboard snapshot

### Backend (Vercel Serverless Functions)

**Endpoints:**

1. **POST /api/session** (WebRTC Session Creation)
   - Accepts SDP offer from frontend
   - Proxies to OpenAI Realtime API with API key
   - Configures initial session parameters
   - Returns SDP answer for WebRTC connection

2. **POST /api/render** (Whiteboard Rendering)
   - Accepts: whiteboard image (base64), action type, semantic description
   - Uses: Google Gemini 2.5 Flash for vision analysis
   - Returns: JSON array of canvas drawing primitives
   - Enables: AI to "draw" on whiteboard through orchestrator

### Communication Protocols

#### WebRTC Data Channel (Frontend ↔ OpenAI)

**Purpose:** Bidirectional communication for events and function calls

**Frontend → Realtime Agent:**
- `session.update` - Send stage context and tool definitions
- `conversation.item.create` - Send whiteboard images
- `response.create` - Request AI to speak

**Realtime Agent → Frontend:**
- `response.function_call_arguments.done` - Function call completed
- `response.audio_transcript.done` - AI's spoken text
- `conversation.item.input_audio_transcription.completed` - Student's spoken text
- `error` - Error events

#### REST API (Frontend ↔ Backend)

**POST /api/render:**
```json
Request:
{
  "imageDataUrl": "data:image/png;base64,...",
  "action": "draw",
  "description": "three circles representing pizza slices"
}

Response:
{
  "commands": [
    { "type": "circle", "x": 100, "y": 200, "radius": 50, ... },
    { "type": "text", "x": 100, "y": 300, "content": "Slice 1", ... }
  ]
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR AGENT                        │
│                      (React App - App.tsx)                       │
│                                                                   │
│  - Loads lesson stages from lessons.ts                           │
│  - Manages stage progression                                     │
│  - Configures Realtime Agent with stage context                  │
│  - Executes whiteboard rendering commands                        │
│  - Captures and sends whiteboard snapshots                       │
└────────┬─────────────────────────────────────┬──────────────────┘
         │                                     │
         │ WebRTC                              │ REST API
         │ (Audio + Data Channel)              │ (Render requests)
         │                                     │
         ▼                                     ▼
┌──────────────────────────────┐    ┌────────────────────────────┐
│    REALTIME AGENT             │    │   RENDERING SERVICE        │
│  (OpenAI Realtime API)        │    │    (/api/render)           │
│                               │    │                            │
│  - Voice conversation         │    │  - Gemini 2.5 Flash        │
│  - Sees whiteboard images     │    │  - Analyzes image          │
│  - Calls tool functions:      │    │  - Generates canvas cmds   │
│    • stage_complete()         │    └────────────────────────────┘
│    • update_whiteboard()      │
└───────────────────────────────┘

         ↕
    Student interaction
    (voice + drawing)
```

## Key Design Decisions

### Why Two Agents?

**Separation of Concerns:**
- **Realtime Agent**: Optimized for conversational AI and low-latency voice
- **Orchestrator**: Optimized for application logic and UI state management

**Scalability:**
- Realtime agent restarts with each stage (fresh context, no conversation drift)
- Orchestrator maintains lesson-wide state and history

**Cost Efficiency:**
- Realtime API charged per audio duration
- Vision API (Gemini) charged separately for rendering
- Using specialized models for specialized tasks optimizes cost

### Why Semantic Descriptions Instead of Direct Drawing?

The realtime agent produces **semantic descriptions** (e.g., "draw three circles in a row") rather than exact coordinates for several reasons:

1. **Natural Language Strength**: GPT models excel at natural language generation
2. **Context Awareness**: Gemini vision can analyze the existing whiteboard and place elements intelligently
3. **Flexibility**: Semantic descriptions adapt to different canvas sizes and layouts
4. **Simplicity**: Realtime agent doesn't need to understand pixel coordinates or canvas APIs

### Why Debounce Whiteboard Captures?

**Without debouncing**: Every pen stroke would send an image to the AI
- 100+ API calls per drawing
- Expensive and slow
- AI overwhelmed with partial work

**With 1-second debounce**: Image sent after student pauses
- ~5 API calls per session
- Captures complete thoughts
- AI sees meaningful work

## Stage-Based Learning Flow

### Stage Anatomy

Each stage is a self-contained learning unit with:

```typescript
{
  stage_id: 1,
  problem: "I've got two pizzas with 8 slices each...",
  visual_url: '/pizza-2-equal.png',
  learning_objective: 'Student recognizes that 16÷3 has a remainder',
  mastery_criteria: {
    description: "Student identifies there's one slice left over",
    indicators: [
      "Mentions 'leftover' or 'extra'",
      "Calculates 5 slices per person",
      "Acknowledges remainder"
    ]
  },
  context_for_agent: `You're helping a student understand division...
    Call stage_complete() when student clearly understands remainders.`
}
```

### Progression Logic

**Orchestrator decides WHEN to advance** (on `stage_complete` call)

**Realtime Agent decides IF student is ready** (based on mastery criteria)

This separation ensures:
- Teaching decisions made by conversational AI
- Structural decisions made by orchestrator
- No ambiguity about who controls what

## Tool Functions

### `stage_complete(reasoning: string)`

**Called by:** Realtime Agent
**Handled by:** Orchestrator

**Purpose:** Signal that student has demonstrated mastery

**Flow:**
1. Realtime Agent evaluates student responses against mastery criteria
2. When criteria met, calls `stage_complete("Student understands X")`
3. Orchestrator receives call via data channel
4. Orchestrator logs reasoning
5. Orchestrator advances to next stage (or completes lesson)
6. Orchestrator sends new stage context to Realtime Agent

### `update_whiteboard(action: string, description: string)`

**Called by:** Realtime Agent
**Handled by:** Orchestrator

**Purpose:** Request visual annotations on the whiteboard

**Parameters:**
- `action`: "draw" | "highlight" | "label" | "clear"
- `description`: Natural language description of what to draw

**Flow:**
1. Realtime Agent determines visualization would help
2. Calls `update_whiteboard("draw", "three groups of 5 circles")`
3. Orchestrator receives call via data channel
4. Orchestrator sends image + description to `/api/render`
5. Gemini analyzes and generates drawing commands
6. Orchestrator executes commands on canvas
7. After debounce, updated image sent to Realtime Agent

## Error Handling

### Realtime Agent Errors
- VAD threshold tuned to prevent AI self-interruption (0.6)
- Silence duration prevents premature cutoff (1000ms)
- Session updates logged for debugging

### Orchestrator Errors
- Error boundary catches React errors
- Failed whiteboard renders logged but don't crash
- Missing lesson stages handled gracefully

### Network Errors
- WebRTC connection failures display helpful messages
- API endpoint errors logged with full details
- User can retry without losing progress

## Performance Characteristics

### Latency
- **Voice response**: ~200-500ms (WebRTC + GPT-4o Realtime)
- **Whiteboard capture**: 1000ms debounce + capture time
- **AI drawing**: 1-3 seconds (API call + rendering)

### Cost per 10-minute Session
- **Voice AI**: ~$1.44 (OpenAI Realtime API)
- **Whiteboard rendering**: ~$0.01 (Gemini Flash, ~5 requests)
- **Total**: ~$1.45 per session

### Scalability
- Serverless architecture scales automatically
- No state stored on backend (except environment variables)
- Each session is independent
- WebRTC handles audio streaming at edge

## Future Considerations

### Potential Enhancements

1. **Multi-modal Orchestrator**
   - Text-based fallback when voice unavailable
   - Screen reader support for accessibility

2. **Persistent State**
   - Save session history to database
   - Resume interrupted lessons
   - Track long-term student progress

3. **Advanced Rendering**
   - Animations on whiteboard
   - Student/AI drawing layers
   - Undo/redo functionality

4. **Analytics Agent**
   - Third agent analyzes session transcripts
   - Identifies learning patterns
   - Suggests curriculum improvements

5. **Adaptive Context**
   - Orchestrator adjusts context based on student performance
   - Personalized difficulty scaling
   - Dynamic mastery criteria

## Development Guidelines

### When to Modify Orchestrator
- Adding new lesson stages
- Changing progression logic
- Updating UI/UX
- Adding new backend endpoints
- Implementing analytics

### When to Modify Realtime Agent Configuration
- Adjusting teaching style
- Changing VAD settings
- Adding new tool functions
- Updating system instructions

### When to Modify Lessons
- Creating new educational content
- Adjusting difficulty levels
- Updating mastery criteria
- Changing learning objectives

## Summary

The AI Math Tutor uses a **dual-agent architecture** where:

1. **Realtime Agent** handles direct student interaction through voice and sees whiteboard snapshots
2. **Orchestrator Agent** manages lesson flow, stage progression, and rendering execution

The system combines:
- Stage-based lessons with distinct learning objectives
- Interactive whiteboard for visual learning
- Debounced image capture (1 second after drawing stops)
- Semantic drawing descriptions converted to rendering commands
- Tool-based function calls for coordination between agents

This architecture enables natural conversational tutoring while maintaining structured lesson progression and responsive visual interaction.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-15
**Status:** Current implementation (production-ready)
