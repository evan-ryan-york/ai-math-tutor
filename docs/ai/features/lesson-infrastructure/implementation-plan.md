# AI Math Tutor - Step-by-Step Implementation Plan

## Overview
This document provides a detailed, sequential implementation plan for building the AI Math Tutor with Interactive Whiteboard feature. Follow these steps in order to ensure all dependencies are properly handled.

## Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] OpenAI API key with Realtime API access
- [ ] Git repository initialized
- [ ] Project dependencies installed (`npm install`)
- [ ] `.env.local` configured with `OPENAI_API_KEY`

---

## Phase 1: Core Data Models & Type Definitions

### Step 1.1: Update Type Definitions
**File:** `src/types/index.ts`

**Objective:** Add SessionState and ConversationEvent interfaces

**Actions:**
1. Open `src/types/index.ts`
2. Add the following interfaces after existing types:
   ```typescript
   export interface SessionState {
     session_id: string
     lesson_id: string
     current_stage: number
     stage_start_time: Date
     whiteboard_image_url?: string
     peer_connection: RTCPeerConnection | null
     data_channel: RTCDataChannel | null
   }

   export interface ConversationEvent {
     type: string
     timestamp: Date
     data: any
   }
   ```

**Verification:**
- [ ] No TypeScript errors in types file
- [ ] Run `npm run build` to verify types compile

**Estimated Time:** 5 minutes

---

### Step 1.2: Create Lesson Data Structure
**File:** `src/data/lessons.ts` (NEW)

**Objective:** Define the lesson content and structure

**Actions:**
1. Create new directory: `src/data/`
2. Create new file: `src/data/lessons.ts`
3. Import Lesson type from types
4. Define lessons object with 'division-with-remainders-1' lesson
5. Create two stages with detailed context_for_agent instructions
6. Export getLesson helper function

**Code Template:**
```typescript
import type { Lesson } from '../types'

export const lessons: Record<string, Lesson> = {
  'division-with-remainders-1': {
    lesson_id: 'division-with-remainders-1',
    title: 'Sharing Pizzas Fairly',
    learning_goal: 'Understand division with remainders and basic fractions',
    stages: [
      // Stage 1: Basic division with remainder
      {
        stage_id: 1,
        problem: "I've got two friends coming over...",
        // ... (see feature-details.md lines 49-73)
      },
      // Stage 2: Division with two types
      {
        stage_id: 2,
        problem: "Actually, one pizza is cheese...",
        // ... (see feature-details.md lines 75-98)
      }
    ]
  }
}

export function getLesson(lessonId: string): Lesson | null {
  return lessons[lessonId] || null
}
```

**Verification:**
- [ ] File imports without errors
- [ ] getLesson function returns correct lesson
- [ ] Test: `getLesson('division-with-remainders-1')` returns lesson object

**Estimated Time:** 15 minutes

---

## Phase 2: Session & Stage Management (App.tsx)

### Step 2.1: Update App.tsx - State Management
**File:** `src/App.tsx`

**Objective:** Replace basic state with full session management

**Actions:**
1. Import new dependencies:
   - `useRef` from React
   - `getLesson` from './data/lessons'
   - `SessionState` from './types'

2. Replace state variables:
   ```typescript
   const [sessionState, setSessionState] = useState<SessionState | null>(null)
   const [currentStage, setCurrentStage] = useState<Stage | null>(null)
   const [isVoiceActive, setIsVoiceActive] = useState(false)
   const [conversationLog, setConversationLog] = useState<string[]>([])
   const whiteboardImageRef = useRef<string>('')
   ```

**Verification:**
- [ ] No TypeScript errors
- [ ] State types are correct
- [ ] App still compiles

**Estimated Time:** 10 minutes

---

### Step 2.2: Implement Lesson Initialization
**File:** `src/App.tsx`

**Objective:** Handle lesson start and session creation

**Actions:**
1. Update `handleStartLesson` function:
   - Call `getLesson('division-with-remainders-1')`
   - Create SessionState object with generated session_id
   - Set currentStage to first stage
   - Log session creation

2. Add utility function:
   ```typescript
   const generateSessionId = () => {
     return 'session_' + Math.random().toString(36).substring(2, 15)
   }
   ```

**Verification:**
- [ ] Clicking "Start Lesson" creates session
- [ ] Console shows session object
- [ ] Current stage displays in UI

**Estimated Time:** 10 minutes

---

### Step 2.3: Implement WebRTC Session Handler
**File:** `src/App.tsx`

**Objective:** Handle WebRTC connection and data channel setup

**Actions:**
1. Update `handleSessionCreate` function to:
   - Store peer connection and data channel in sessionState
   - Add data channel 'message' event listener → `handleServerEvent`
   - Add data channel 'open' event listener → `sendSessionUpdate`
   - Set isVoiceActive to true

2. Implement `sendSessionUpdate` function:
   - Create session.update event with stage context
   - Define tools: `stage_complete` and `update_whiteboard`
   - Configure turn_detection settings
   - Send via data channel

**Key Configuration:**
```typescript
tools: [
  {
    type: 'function',
    name: 'stage_complete',
    description: 'Call this when the student has demonstrated mastery',
    parameters: { /* ... */ }
  },
  {
    type: 'function',
    name: 'update_whiteboard',
    description: 'Add or modify content on the interactive whiteboard',
    parameters: { /* ... */ }
  }
]
```

**Verification:**
- [ ] Data channel opens successfully
- [ ] Console shows "Data channel opened - sending session configuration"
- [ ] Console shows "Session update sent to OpenAI"
- [ ] No connection errors

**Estimated Time:** 20 minutes

---

### Step 2.4: Implement Event Handling
**File:** `src/App.tsx`

**Objective:** Process events from OpenAI Realtime API

**Actions:**
1. Implement `handleServerEvent` function with switch statement:
   - `response.function_call_arguments.done` → call `handleFunctionCall`
   - `response.audio_transcript.done` → add to conversation log
   - `conversation.item.input_audio_transcription.completed` → add to log
   - `error` → log error to console

2. Implement `handleFunctionCall` function:
   - Parse function name and arguments
   - Route to `handleStageComplete` or `handleWhiteboardUpdate`

3. Add `addToLog` utility function:
   ```typescript
   const addToLog = (message: string) => {
     setConversationLog(prev => [...prev, message])
   }
   ```

**Verification:**
- [ ] Events logged to console
- [ ] Transcripts appear in conversation log
- [ ] Function calls detected

**Estimated Time:** 15 minutes

---

### Step 2.5: Implement Stage Progression
**File:** `src/App.tsx`

**Objective:** Handle stage completion and advancement

**Actions:**
1. Implement `handleStageComplete` function:
   - Get current lesson from sessionState
   - Calculate next stage index
   - If more stages exist:
     - Update currentStage state
     - Update sessionState with new stage index and timestamp
     - Show alert notification
     - Send session update with new stage context
   - If lesson complete:
     - Show congratulations alert
     - Log completion

**Logic Flow:**
```
stage_complete called
  ↓
Get next stage
  ↓
If exists → Update UI + Send new context
  ↓
If last → Show completion message
```

**Verification:**
- [ ] Stage transitions work
- [ ] Alert shows stage number
- [ ] New stage displays in UI
- [ ] AI receives new context

**Estimated Time:** 15 minutes

---

### Step 2.6: Implement Whiteboard Integration
**File:** `src/App.tsx`

**Objective:** Handle AI whiteboard requests and student drawings

**Actions:**
1. Implement `handleWhiteboardUpdate` function:
   - Check if whiteboard image exists
   - POST to `/api/render` with image, action, description
   - Parse response commands
   - Dispatch 'whiteboard-draw' custom event

2. Implement `handleWhiteboardImageUpdate` function:
   - Store image in ref
   - Create conversation.item.create event with image
   - Send to OpenAI via data channel

**API Request Format:**
```typescript
{
  imageDataUrl: string,  // base64 PNG
  action: string,        // 'draw' | 'highlight' | 'label' | 'clear'
  description: string    // Natural language description
}
```

**Verification:**
- [ ] Whiteboard captures send to OpenAI
- [ ] AI can "see" drawings
- [ ] AI drawing commands execute on canvas

**Estimated Time:** 20 minutes

---

### Step 2.7: Update App UI
**File:** `src/App.tsx`

**Objective:** Add conversation log and update layout

**Actions:**
1. Update header to show current stage info
2. Add conversation log section after whiteboard:
   ```tsx
   <div style={{ /* conversation log styles */ }}>
     <h3>Conversation:</h3>
     {conversationLog.map((msg, i) => (
       <div key={i}>{msg}</div>
     ))}
   </div>
   ```

3. Update welcome screen text
4. Update session active indicator

**Verification:**
- [ ] Conversation log displays messages
- [ ] Stage info shows in header
- [ ] UI updates match design

**Estimated Time:** 10 minutes

---

## Phase 3: Enhanced Components

### Step 3.1: Update Whiteboard Component
**File:** `src/components/Whiteboard.tsx`

**Objective:** Add AI drawing capabilities and improved rendering

**Actions:**
1. Add `contextRef` to store canvas context
2. Initialize white background on mount
3. Add event listener for 'whiteboard-draw' custom events
4. Implement `executeDrawingCommands` function with support for:
   - circle, rect, text, line, arrow, path, clear
5. Implement `drawArrow` helper function
6. Update `captureAndSendImage` to send after AI drawings
7. Add descriptive text above canvas

**Key Features:**
- White background initialization
- Arrow drawing with proper arrowhead
- Path2D support for complex shapes
- Error handling per command
- Auto-capture after AI draws

**Verification:**
- [ ] Student can draw on canvas
- [ ] Canvas has white background
- [ ] Clear button resets to white
- [ ] AI drawings appear correctly
- [ ] Image captures trigger

**Estimated Time:** 30 minutes

---

### Step 3.2: Update VoiceInterface Component
**File:** `src/components/VoiceInterface.tsx`

**Objective:** Improve connection flow and error handling

**Actions:**
1. Add detailed status messages at each step:
   - "Requesting microphone access..."
   - "Creating peer connection..."
   - "Creating WebRTC offer..."
   - "Connecting to OpenAI..."
   - "Establishing connection..."
   - "Connected! Start talking..."

2. Add error handling with descriptive messages
3. Improve audio configuration:
   ```typescript
   audio: {
     echoCancellation: true,
     noiseSuppression: true,
     autoGainControl: true,
   }
   ```

4. Update UI styling for better status display
5. Add loading state with disabled button

**Verification:**
- [ ] Status updates at each step
- [ ] Microphone permission prompt appears
- [ ] Errors show helpful messages
- [ ] Button disables during connection
- [ ] Audio quality is good

**Estimated Time:** 20 minutes

---

### Step 3.3: Update StageDisplay Component
**File:** `src/components/StageDisplay.tsx`

**Objective:** Improve visual presentation of stages

**Actions:**
1. Remove `onReady` prop (no longer needed)
2. Update layout with:
   - Stage number header with "IN PROGRESS" badge
   - Better styled problem container
   - Learning goal callout box
   - Improved spacing and colors

3. Add image error handling (hide if fails to load)
4. Update styling to match design system

**Verification:**
- [ ] Stage displays clearly
- [ ] Badge shows "IN PROGRESS"
- [ ] Learning goal is highlighted
- [ ] Layout looks professional

**Estimated Time:** 15 minutes

---

## Phase 4: Testing & Validation

### Step 4.1: Create Test Utilities
**File:** `src/utils/testHelpers.ts` (NEW)

**Objective:** Add testing functions for debugging

**Actions:**
1. Create `src/utils/testHelpers.ts`
2. Implement three functions:
   - `testWebRTCConnection()` - Check browser support
   - `testBackendAPIs()` - Test /api/session and /api/render
   - `logSystemInfo()` - Log browser and WebRTC capabilities

**Usage:**
These functions help diagnose issues during development and deployment.

**Verification:**
- [ ] Functions export correctly
- [ ] Can be imported in other files
- [ ] Console logs are helpful

**Estimated Time:** 15 minutes

---

### Step 4.2: Create Debug Panel (Optional)
**File:** `src/components/DebugPanel.tsx` (NEW)

**Objective:** Add development debugging UI

**Actions:**
1. Create fixed-position debug panel component
2. Add "Run Tests" button that calls test utilities
3. Display test results (WebRTC, APIs)
4. Add show/hide toggle
5. Import and add to App.tsx during development

**Note:** This is optional for development but helpful for troubleshooting.

**Verification:**
- [ ] Panel appears in bottom-right
- [ ] Tests run successfully
- [ ] Results display clearly

**Estimated Time:** 20 minutes

---

### Step 4.3: Add Error Boundary
**File:** `src/components/ErrorBoundary.tsx` (NEW)

**Objective:** Catch and handle React errors gracefully

**Actions:**
1. Create error boundary class component
2. Implement `getDerivedStateFromError` and `componentDidCatch`
3. Add error UI with reload button
4. Wrap App in error boundary in `src/main.tsx`

**Verification:**
- [ ] Error boundary wraps app
- [ ] Errors display user-friendly message
- [ ] Reload button works

**Estimated Time:** 15 minutes

---

### Step 4.4: Update main.tsx
**File:** `src/main.tsx`

**Objective:** Add error boundary to app root

**Actions:**
1. Import ErrorBoundary
2. Wrap `<App />` with `<ErrorBoundary>`

**Verification:**
- [ ] App renders correctly
- [ ] Error boundary catches errors
- [ ] No console errors

**Estimated Time:** 5 minutes

---

## Phase 5: Testing & Quality Assurance

### Step 5.1: Local Development Testing

**Actions:**
1. Start dev server: `npm run dev`
2. Test full flow:
   - [ ] Click "Start Lesson"
   - [ ] Stage displays correctly
   - [ ] Click "Start Voice Session"
   - [ ] Microphone permission granted
   - [ ] Connection establishes
   - [ ] Hear AI voice
   - [ ] AI responds to speech
   - [ ] Draw on whiteboard
   - [ ] Whiteboard captures
   - [ ] Clear whiteboard works
   - [ ] Conversation log updates

3. Check browser console for:
   - [ ] No errors
   - [ ] Expected log messages
   - [ ] Data channel opens
   - [ ] Events received

**Verification Checklist:**
- [ ] All TypeScript compiles: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] All features work end-to-end

**Estimated Time:** 30 minutes

---

### Step 5.2: API Endpoint Testing

**Actions:**
1. Test `/api/session`:
   - [ ] Returns SDP answer
   - [ ] Status 200 on success
   - [ ] Proper error messages

2. Test `/api/render`:
   - [ ] Accepts image + action + description
   - [ ] Returns JSON with commands array
   - [ ] Drawing commands are valid

3. Check environment variables:
   - [ ] OPENAI_API_KEY is set
   - [ ] API key has Realtime API access

**Verification:**
- [ ] Both endpoints respond correctly
- [ ] API key works with OpenAI
- [ ] Error messages are helpful

**Estimated Time:** 20 minutes

---

### Step 5.3: Function Calling Testing

**Actions:**
1. Monitor console for function calls from AI
2. Test `stage_complete`:
   - [ ] AI can call the function
   - [ ] Stage advances correctly
   - [ ] Alert displays
   - [ ] New context sent to AI

3. Test `update_whiteboard`:
   - [ ] AI can request drawings
   - [ ] Backend generates commands
   - [ ] Commands execute on canvas

**Debugging Tips:**
- Add `console.log` in `handleFunctionCall`
- Check OpenAI Realtime API logs
- Verify function definitions match exactly

**Verification:**
- [ ] AI calls functions appropriately
- [ ] Functions execute correctly
- [ ] No function calling errors

**Estimated Time:** 30 minutes

---

## Phase 6: Deployment Preparation

### Step 6.1: Build Verification

**Actions:**
1. Run production build: `npm run build`
2. Check for:
   - [ ] No TypeScript errors
   - [ ] No build warnings
   - [ ] Dist folder generated
   - [ ] Assets bundled correctly

3. Test production build locally:
   ```bash
   npm run preview
   ```

**Verification:**
- [ ] Build succeeds
- [ ] Preview works
- [ ] No runtime errors

**Estimated Time:** 15 minutes

---

### Step 6.2: Git Repository Setup

**Actions:**
1. Review `.gitignore`:
   - [ ] `.env.local` is ignored
   - [ ] `node_modules` is ignored
   - [ ] `dist` is ignored

2. Commit all changes:
   ```bash
   git add .
   git commit -m "Implement AI Math Tutor with WebRTC and stage progression"
   ```

3. Create GitHub repository and push:
   ```bash
   git remote add origin https://github.com/username/ai-math-tutor.git
   git push -u origin main
   ```

**Verification:**
- [ ] All files committed
- [ ] Pushed to GitHub
- [ ] No sensitive data in repo

**Estimated Time:** 10 minutes

---

### Step 6.3: Vercel Deployment

**Actions:**
1. Go to https://vercel.com/new
2. Import GitHub repository
3. Configure project:
   - Framework: Vite (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Add environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: [Your API key]

5. Deploy

**Post-Deployment:**
1. Visit deployment URL
2. Test full flow in production
3. Check Vercel Function Logs for errors
4. Test on different browsers

**Verification:**
- [ ] Deployment succeeds
- [ ] App loads correctly
- [ ] WebRTC connection works
- [ ] API endpoints respond
- [ ] No CORS errors
- [ ] Audio works in production

**Estimated Time:** 20 minutes

---

## Phase 7: Production Testing

### Step 7.1: End-to-End Production Test

**Test Scenarios:**
1. **Happy Path:**
   - [ ] Start lesson
   - [ ] Connect voice
   - [ ] Complete stage 1
   - [ ] Advance to stage 2
   - [ ] Complete stage 2
   - [ ] See lesson completion

2. **Whiteboard Interaction:**
   - [ ] Draw shapes
   - [ ] AI sees drawings
   - [ ] AI adds annotations
   - [ ] Clear and redraw

3. **Error Handling:**
   - [ ] Deny microphone permission
   - [ ] Network interruption
   - [ ] Invalid API key
   - [ ] Slow connection

**Verification:**
- [ ] All scenarios work
- [ ] Errors handled gracefully
- [ ] UI updates correctly

**Estimated Time:** 45 minutes

---

### Step 7.2: Browser Compatibility Testing

**Test Browsers:**
- [ ] Chrome (primary)
- [ ] Edge
- [ ] Safari
- [ ] Firefox

**Test Each:**
- [ ] WebRTC connection
- [ ] Audio playback
- [ ] Canvas drawing
- [ ] Responsive layout

**Verification:**
- [ ] Works in all major browsers
- [ ] No browser-specific bugs
- [ ] Audio quality is good

**Estimated Time:** 30 minutes

---

## Success Criteria Checklist

When all these are working, the implementation is complete:

### Core Functionality
- [ ] Student can start a lesson
- [ ] Voice connection establishes with OpenAI
- [ ] AI tutor speaks and responds naturally
- [ ] Student can draw on whiteboard
- [ ] AI can see whiteboard drawings
- [ ] AI can add annotations to whiteboard
- [ ] Stage completes and advances when criteria met
- [ ] All stages work sequentially
- [ ] Lesson completion detected

### Technical Requirements
- [ ] No TypeScript errors
- [ ] No console errors in production
- [ ] Proper error handling
- [ ] Loading states work
- [ ] Responsive design
- [ ] Deployed to Vercel and accessible via URL

### User Experience
- [ ] Clear status messages
- [ ] Intuitive UI flow
- [ ] Conversation log updates
- [ ] Stage progression is clear
- [ ] Error messages are helpful

---

## Troubleshooting Guide

### Common Issues and Solutions

#### "Failed to create session"
**Symptoms:** Connection fails immediately
**Checks:**
- [ ] OPENAI_API_KEY set in Vercel environment variables
- [ ] API key has Realtime API access enabled
- [ ] Check Network tab for actual error response
- [ ] Verify /api/session endpoint is deployed

**Solution:** Verify API key and check Vercel logs

---

#### No audio playback
**Symptoms:** Connection succeeds but no audio
**Checks:**
- [ ] Browser console for audio errors
- [ ] Microphone permissions granted
- [ ] Audio element autoplay working
- [ ] Try different browser (Chrome recommended)

**Solution:** Check browser audio policies and permissions

---

#### Whiteboard not sending images
**Symptoms:** Drawing works but AI doesn't see it
**Checks:**
- [ ] Console logs show "Whiteboard image captured"
- [ ] Canvas is visible and drawable
- [ ] Data channel is open (readyState === 'open')
- [ ] Image data URL is valid base64

**Solution:** Check data channel state and timing

---

#### Data channel not opening
**Symptoms:** Connection established but channel stays closed
**Checks:**
- [ ] WebRTC connection successful (ontrack fired)
- [ ] SDP exchange completed
- [ ] Wait 2-3 seconds for channel to open
- [ ] Check for ICE connection issues

**Solution:** Add logging to track connection state

---

#### Function calls not working
**Symptoms:** AI doesn't call stage_complete
**Checks:**
- [ ] Data channel is open before sending events
- [ ] Function definitions match exactly
- [ ] Tools sent in session.update event
- [ ] Check OpenAI console for function call attempts

**Solution:** Verify function definitions and check AI context

---

## Estimated Total Time

| Phase | Time |
|-------|------|
| Phase 1: Data Models | 20 min |
| Phase 2: Session Management | 110 min |
| Phase 3: Components | 65 min |
| Phase 4: Testing Infrastructure | 55 min |
| Phase 5: QA Testing | 80 min |
| Phase 6: Deployment | 45 min |
| Phase 7: Production Testing | 75 min |
| **Total** | **~7.5 hours** |

This assumes familiarity with React, TypeScript, and WebRTC concepts. Add buffer time for learning or debugging.

---

## Next Steps After Implementation

Once the core feature is working, consider these enhancements:

### Short Term (Week 1-2)
1. Add more lesson content
2. Improve visual design
3. Add loading animations
4. Optimize mobile experience

### Medium Term (Month 1)
1. Add user authentication (Supabase Auth)
2. Persist session history
3. Add progress tracking
4. Create lesson library

### Long Term (Month 2+)
1. Add text-based fallback (no microphone)
2. Multi-language support
3. Analytics dashboard
4. Custom lesson creator
5. Student progress reports

---

## Resources

### Documentation
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Vercel Deployment Docs](https://vercel.com/docs)

### Support
- Project README: See troubleshooting section
- OpenAI Community: https://community.openai.com
- GitHub Issues: Create issues for bugs

---

## Completion Checklist

Use this final checklist before marking the project as complete:

### Code Quality
- [ ] All TypeScript types defined
- [ ] No `any` types (except where necessary)
- [ ] Error handling in all async functions
- [ ] Console logs for debugging events
- [ ] Code formatted and linted

### Functionality
- [ ] All features from feature-details.md implemented
- [ ] Stage progression works
- [ ] Whiteboard integration works
- [ ] Function calling works
- [ ] Conversation logging works

### Deployment
- [ ] Deployed to Vercel
- [ ] Environment variables set
- [ ] Production testing complete
- [ ] No production errors
- [ ] Performance acceptable

### Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] Troubleshooting guide available
- [ ] Setup instructions clear

---

**Congratulations!** When all steps are complete, you'll have a fully functional AI Math Tutor with interactive whiteboard capabilities powered by OpenAI's Realtime API!
