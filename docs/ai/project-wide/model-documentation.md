# OpenAI Realtime API - Critical Documentation & Lessons Learned

**Date:** October 14, 2025
**Status:** Working Implementation
**Purpose:** Prevent future pain by documenting exactly how the Realtime API works

---

## Table of Contents

1. [Critical Success Factors](#critical-success-factors)
2. [Official Documentation Sources](#official-documentation-sources)
3. [Architecture Overview](#architecture-overview)
4. [The Unified Interface (What We Use)](#the-unified-interface-what-we-use)
5. [Common Pitfalls & How to Avoid Them](#common-pitfalls--how-to-avoid-them)
6. [Working Code Patterns](#working-code-patterns)
7. [Debugging Guide](#debugging-guide)

---

## Critical Success Factors

### ✅ What Finally Worked

1. **Use the Unified Interface** - Send FormData directly to `/v1/realtime/calls` with your main API key
2. **Flat Session Config** - Do NOT nest session config in a `session: {}` wrapper for the unified interface
3. **Minimal Config** - Only include fields that are actually supported by the unified interface
4. **No Initial session.update** - Session is fully configured at creation; don't send updates on data channel open
5. **Read the Official Docs** - NOT outdated blog posts, NOT beta documentation, NOT assumptions

### ❌ What Caused Hours of Pain

1. Mixing the unified interface with the ephemeral key approach
2. Adding unsupported fields like `input_audio_transcription` and `turn_detection` to unified interface config
3. Wrapping the session config in `{ session: {...} }` for the unified interface (only needed for ephemeral keys)
4. Trying to send `session.update` events immediately after connection
5. Not reading the actual documentation and making assumptions based on outdated examples

---

## Official Documentation Sources

### PRIMARY SOURCES (Use These Only)

1. **Main Realtime API Guide**
   https://platform.openai.com/docs/guides/realtime
   - Overview of connection methods
   - Links to all sub-guides

2. **WebRTC Connection Guide** (What We Use)
   https://platform.openai.com/docs/guides/realtime-webrtc
   - Unified interface explanation
   - Ephemeral token approach
   - Official code examples

3. **API Reference for Client Events**
   https://platform.openai.com/docs/api-reference/realtime_client_events
   - session.update event structure
   - What fields can be updated after creation

4. **API Reference for Server Events**
   https://platform.openai.com/docs/api-reference/realtime_server_events
   - Understanding events received from OpenAI

### IGNORE THESE

- ❌ Beta API documentation (uses old endpoints and structure)
- ❌ Blog posts from 2024 (API changed significantly in GA release)
- ❌ GitHub issues and discussions (often outdated or mixing approaches)
- ❌ Stack Overflow answers (usually for beta API)
- ❌ Any examples using `wss://api.openai.com/v1/realtime` WebSocket URLs (different approach)

---

## Architecture Overview

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ 1. Create WebRTC offer (SDP)
       │ 2. Send SDP to our backend
       ▼
┌─────────────────────┐
│  Our Backend Server │
│   (Vercel Function) │
└──────┬──────────────┘
       │ 3. Create FormData with:
       │    - sdp: clientSdp
       │    - session: JSON config
       │ 4. POST to /v1/realtime/calls
       │    with main API key
       ▼
┌──────────────────┐
│  OpenAI Realtime │
│       API        │
└──────┬───────────┘
       │ 5. Returns answer SDP
       ▼
┌─────────────────────┐
│  Our Backend Server │
└──────┬──────────────┘
       │ 6. Forwards SDP to browser
       ▼
┌─────────────┐
│   Browser   │
│ (Completes  │
│  WebRTC     │
│ connection) │
└─────────────┘
```

**Key Points:**
- Browser never talks directly to OpenAI during initialization
- Main API key stays on server (never exposed to client)
- Session is fully configured during the `/v1/realtime/calls` request
- After WebRTC connection is established, browser communicates with OpenAI directly via data channel

---

## The Unified Interface (What We Use)

### Backend Code (api/session.ts)

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Session configuration for the unified interface
// CRITICAL: This is a FLAT object, NOT nested in { session: {...} }
const sessionConfig = JSON.stringify({
  type: 'realtime',
  model: 'gpt-realtime',
  audio: {
    output: { voice: 'alloy' }
  },
  instructions: `Your system instructions here...`,
  tools: [
    {
      type: 'function',
      name: 'your_function',
      description: 'What it does',
      parameters: { /* JSON schema */ }
    }
  ]
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  try {
    // 1. Get SDP from client
    const { sdp: clientSdp } = req.body

    if (!clientSdp || typeof clientSdp !== 'string' || !clientSdp.trim()) {
      return res.status(400).json({ error: 'Invalid SDP' })
    }

    // 2. Create FormData with SDP and session config
    const fd = new FormData()
    fd.set('sdp', clientSdp)
    fd.set('session', sessionConfig)

    // 3. POST to unified interface endpoint
    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: fd
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI error: ${response.status} - ${errorText}`)
    }

    // 4. Return answer SDP to client
    const answerSdp = await response.text()
    res.setHeader('Content-Type', 'application/sdp')
    return res.status(200).send(answerSdp)

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Session creation error:', message)
    return res.status(500).json({ error: 'Failed to create session', details: message })
  }
}
```

### Frontend Code (VoiceInterface.tsx)

```typescript
// 1. Create WebRTC peer connection
const pc = new RTCPeerConnection()

// 2. Set up audio playback
const audioElement = document.createElement('audio')
audioElement.autoplay = true
pc.ontrack = (e) => (audioElement.srcObject = e.streams[0])

// 3. Add microphone input
const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
pc.addTrack(ms.getTracks()[0])

// 4. Create data channel
const dc = pc.createDataChannel('oai-events')

// 5. Create and set local SDP offer
const offer = await pc.createOffer()
await pc.setLocalDescription(offer)

// 6. Send SDP to our backend (as JSON)
const response = await fetch('/api/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ sdp: offer.sdp })
})

// 7. Set remote SDP answer
const answerSdp = await response.text()
await pc.setRemoteDescription({
  type: 'answer',
  sdp: answerSdp
})
```

### Data Channel Event Handling

```typescript
// Listen for server events
dc.addEventListener('message', (event) => {
  const serverEvent = JSON.parse(event.data)
  handleServerEvent(serverEvent)
})

// When data channel opens, DO NOT send session.update
// Session is already fully configured!
dc.addEventListener('open', () => {
  console.log('Data channel opened')

  // Just trigger AI to start speaking (optional)
  dc.send(JSON.stringify({
    type: 'response.create'
  }))
})

// Send client events
dc.send(JSON.stringify({
  type: 'conversation.item.create',
  item: {
    type: 'message',
    role: 'user',
    content: [{ type: 'input_text', text: 'Hello!' }]
  }
}))
```

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: Wrapping Session Config Incorrectly

❌ **WRONG (for unified interface):**
```javascript
const sessionConfig = JSON.stringify({
  session: {  // ❌ DON'T wrap in session object!
    type: 'realtime',
    model: 'gpt-realtime'
  }
})
```

✅ **CORRECT (for unified interface):**
```javascript
const sessionConfig = JSON.stringify({
  type: 'realtime',  // ✅ Flat structure
  model: 'gpt-realtime'
})
```

📝 **Note:** The `{ session: {...} }` wrapper is ONLY for the ephemeral key approach when calling `/v1/realtime/client_secrets`

---

### Pitfall 2: Including Unsupported Fields

❌ **WRONG:**
```javascript
const sessionConfig = JSON.stringify({
  type: 'realtime',
  model: 'gpt-realtime',
  audio: { output: { voice: 'alloy' } },
  input_audio_transcription: { model: 'whisper-1' },  // ❌ Not supported in unified interface
  turn_detection: { type: 'server_vad' },  // ❌ Not supported in unified interface
  modalities: ['text', 'audio']  // ❌ Not supported in unified interface
})
```

✅ **CORRECT:**
```javascript
const sessionConfig = JSON.stringify({
  type: 'realtime',
  model: 'gpt-realtime',
  audio: { output: { voice: 'alloy' } },
  instructions: 'Your instructions here',
  tools: [ /* your function definitions */ ]
})
```

**Supported Fields (Unified Interface):**
- ✅ `type` (always 'realtime')
- ✅ `model` (e.g., 'gpt-realtime')
- ✅ `audio` (voice configuration)
- ✅ `instructions` (system prompt)
- ✅ `tools` (function definitions)

**NOT Supported (Unified Interface):**
- ❌ `input_audio_transcription`
- ❌ `turn_detection`
- ❌ `modalities`
- ❌ `voice` (use `audio.output.voice` instead)

---

### Pitfall 3: Sending session.update on Connection

❌ **WRONG:**
```typescript
dc.addEventListener('open', () => {
  // ❌ DON'T send session.update immediately!
  dc.send(JSON.stringify({
    type: 'session.update',
    session: { instructions: '...' }
  }))
})
```

✅ **CORRECT:**
```typescript
dc.addEventListener('open', () => {
  // ✅ Session already configured via /v1/realtime/calls
  // Just trigger a response if needed
  dc.send(JSON.stringify({
    type: 'response.create'
  }))
})
```

**When to Use session.update:**
- ✅ When changing instructions mid-conversation (e.g., advancing to next stage)
- ✅ When adding/removing tools dynamically
- ❌ NOT immediately after connection (session already configured)

---

### Pitfall 4: Using Wrong Error Message Format

When OpenAI returns errors, they might say "Missing required parameter: 'session.type'" even though your config is correct. This is because:

1. The API expects different formats for different endpoints
2. The unified interface vs ephemeral key approach have different requirements
3. Error messages can be misleading (e.g., asking for `session.type` when using flat structure)

**Solution:** Always validate against the official docs example for YOUR chosen approach, not the error message.

---

## Working Code Patterns

### Pattern 1: Sending Function Calls from AI

The AI will call functions you define in `tools`. Handle them like this:

```typescript
dc.addEventListener('message', (event) => {
  const serverEvent = JSON.parse(event.data)

  if (serverEvent.type === 'response.function_call_arguments.done') {
    const functionName = serverEvent.name
    const args = JSON.parse(serverEvent.arguments)

    // Handle the function call
    if (functionName === 'stage_complete') {
      handleStageComplete(args.reasoning)
    }
  }
})
```

### Pattern 2: Sending Images to AI

```typescript
const imageEvent = {
  type: 'conversation.item.create',
  item: {
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'input_image',
        image_url: 'data:image/png;base64,...'  // Base64 data URL
      }
    ]
  }
}

dc.send(JSON.stringify(imageEvent))
```

### Pattern 3: Getting Transcripts

Listen for transcript events:

```typescript
dc.addEventListener('message', (event) => {
  const serverEvent = JSON.parse(event.data)

  // User speech transcript
  if (serverEvent.type === 'conversation.item.input_audio_transcription.completed') {
    console.log('User said:', serverEvent.transcript)
  }

  // AI speech transcript
  if (serverEvent.type === 'response.audio_transcript.done') {
    console.log('AI said:', serverEvent.transcript)
  }
})
```

### Pattern 4: Updating Session Mid-Conversation

```typescript
// When advancing to a new stage
const updateEvent = {
  type: 'session.update',
  session: {
    instructions: 'New instructions for stage 2...',
    tools: [ /* updated tool definitions */ ]
  }
}

dc.send(JSON.stringify(updateEvent))

// Trigger AI to respond with new instructions
dc.send(JSON.stringify({
  type: 'response.create'
}))
```

---

## Debugging Guide

### Step 1: Comprehensive Logging

Always log at key points:

**Backend:**
```typescript
console.log('=== BACKEND: Received Request ===')
console.log('SDP length:', clientSdp?.length || 0)
console.log('================================')

console.log('=== BACKEND: Response ===')
console.log('Status:', response.status)
console.log('=========================')

if (!response.ok) {
  const errorText = await response.text()
  console.error('=== BACKEND: Error ===')
  console.error('Body:', errorText)
  console.error('======================')
}
```

**Frontend:**
```typescript
console.log('=== SENDING CLIENT EVENT ===')
console.log('Event type:', event.type)
console.log('Full payload:', JSON.stringify(event, null, 2))
console.log('============================')

dc.addEventListener('message', (event) => {
  const serverEvent = JSON.parse(event.data)

  if (serverEvent.type === 'error') {
    console.error('=== OPENAI ERROR EVENT ===')
    console.error('Error type:', serverEvent.error?.type)
    console.error('Error code:', serverEvent.error?.code)
    console.error('Error message:', serverEvent.error?.message)
    console.error('Error param:', serverEvent.error?.param)
    console.error('Full error:', JSON.stringify(serverEvent, null, 2))
    console.error('==========================')
  }
})
```

### Step 2: Verify Environment Variables

```bash
# Check .env file exists
ls -la .env

# Verify API key is set (first 10 chars)
grep "^OPENAI_API_KEY=" .env | sed 's/OPENAI_API_KEY=//' | head -c 20
```

### Step 3: Test API Key Directly

```bash
# Test if API key works
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Step 4: Check Server Restarts

**CRITICAL:** Vercel dev only reads `.env` on startup!

```bash
# Always restart after changing .env
# Stop: Ctrl+C
# Start:
npm run dev
```

### Step 5: Validate Session Config Structure

```typescript
// Add validation logging
console.log('Session config keys:', Object.keys(JSON.parse(sessionConfig)))
console.log('Has session wrapper?', 'session' in JSON.parse(sessionConfig))
```

Expected output for unified interface:
```
Session config keys: ['type', 'model', 'audio', 'instructions', 'tools']
Has session wrapper? false
```

---

## Model Information

### Current Model (October 2025)

- **Model Name:** `gpt-realtime`
- **Release:** August 2025 (GA - Generally Available)
- **Pricing:** $32/1M input tokens, $64/1M output tokens (cached: $0.40/1M input)
- **New Voices:** `cedar`, `marin` (exclusive to Realtime API)
- **Legacy Voices:** `alloy`, `echo`, `shimmer` (also available)

### Model Features

- ✅ Native speech-to-speech (no separate STT/TTS)
- ✅ Function calling support
- ✅ Image inputs (send screenshots/drawings)
- ✅ Text outputs alongside audio
- ✅ Server-side VAD (Voice Activity Detection)
- ✅ Low latency (<1 second typical)

---

## Quick Reference Checklist

Before deploying or debugging:

- [ ] Using unified interface (not ephemeral keys)
- [ ] Session config is flat (no `session: {}` wrapper)
- [ ] Only including supported fields
- [ ] NOT sending `session.update` on initial connection
- [ ] Environment variables set correctly
- [ ] Server restarted after `.env` changes
- [ ] Comprehensive logging in place
- [ ] Reading CURRENT official docs (not beta)
- [ ] Using `application/json` Content-Type for frontend to backend
- [ ] FormData properly constructed on backend
- [ ] Main API key only used on server (never in browser)

---

## Summary: The One True Path

1. **Read the official WebRTC guide** at https://platform.openai.com/docs/guides/realtime-webrtc
2. **Use the unified interface** example code (NOT ephemeral keys)
3. **Session config is flat** - no nesting for unified interface
4. **Only include supported fields** - type, model, audio, instructions, tools
5. **Don't send session.update on open** - session already configured
6. **Log everything** - frontend events, backend requests, API responses
7. **Restart server after env changes** - `.env` only read on startup
8. **When in doubt, check the docs** - not blog posts, not issues, the DOCS

---

**Last Updated:** October 14, 2025
**Status:** Working in production
**Never forget the pain that led to this document.**
