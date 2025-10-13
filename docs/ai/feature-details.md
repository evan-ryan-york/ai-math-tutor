AI Math Tutor with Interactive Whiteboard - Complete Implementation Guide (WebRTC + Vercel)
Copy and paste this ENTIRE block into Claude Code after the project setup is complete:
Now that the project structure is set up, implement the full AI math tutor feature using WebRTC and the stage-based lesson system.

## Architecture Overview

The system uses a simplified architecture where:
- Frontend connects DIRECTLY to OpenAI via WebRTC (no backend proxy for audio)
- Backend provides 2 serverless functions: session creation + whiteboard rendering
- Session state managed in frontend (no database for testing)
- Stage progression controlled by OpenAI Realtime API function calls
┌──────────────────────────────────┐
│  Browser (React Frontend)        │
│  - WebRTC ←→ OpenAI Realtime API │ (Direct connection)
│  - Canvas Whiteboard             │
│  - Session State (in-memory)     │
└────────┬─────────────────────────┘
│
│ REST API calls
│
┌────────▼─────────────────────────┐
│  Vercel Serverless Functions     │
│  - POST /api/session             │
│  - POST /api/render              │
└────────┬─────────────────────────┘
│
▼
┌──────────────────────────────────┐
│  OpenAI APIs                     │
│  - Realtime API (WebRTC)         │
│  - GPT-4o Vision                 │
└──────────────────────────────────┘

## Data Models

### Lesson Structure

**File: src/data/lessons.ts**
Create this new file:
```typescript
import type { Lesson } from '../types'

export const lessons: Record<string, Lesson> = {
  'division-with-remainders-1': {
    lesson_id: 'division-with-remainders-1',
    title: 'Sharing Pizzas Fairly',
    learning_goal: 'Understand division with remainders and basic fractions',
    stages: [
      {
        stage_id: 1,
        problem: "I've got two friends coming over later today, I've got two pizzas, and each pizza is cut into 8 slices. The three of us want to share the two pizzas, but we're not sure how to do it so we all get the same amount of pizza.",
        visual_url: '/pizza-2-equal.png', // Placeholder
        learning_objective: 'Student recognizes that 16÷3 has a remainder',
        mastery_criteria: {
          description: "Student identifies there's one slice left over after dividing",
          indicators: [
            "Mentions 'leftover' or 'extra' or 'remaining'",
            'Calculates 5 slices per person',
            "Acknowledges 16 doesn't divide evenly by 3"
          ]
        },
        context_for_agent: `You're helping a student understand division with remainders using a real-world pizza scenario.

Current problem: 16 pizza slices, 3 people sharing equally.

Your goals:
- Guide student to discover that 16÷3 = 5 remainder 1
- Accept creative solutions (rock-paper-scissors, sharing the last slice)
- Celebrate the insight about remainders
- DO NOT rush to fractions yet - let them explore the remainder concept
- Use the whiteboard to visualize if helpful

Call stage_complete() when the student clearly understands there's one slice left over after equal distribution.`
      },
      {
        stage_id: 2,
        problem: "Actually, one pizza is cheese and the other is pepperoni. Everyone wants equal amounts of BOTH types. How does that change things?",
        visual_url: '/pizza-2-types.png', // Placeholder
        learning_objective: 'Student recognizes need to divide each pizza type separately',
        mastery_criteria: {
          description: 'Student understands each pizza must be divided by 3',
          indicators: [
            'Mentions dividing each pizza separately',
            'Realizes 8÷3 for each type',
            'Discusses fractions or partial slices'
          ]
        },
        context_for_agent: `Now introducing complexity: two different pizza types must be divided equally.

Current problem: 8 cheese slices ÷ 3 people, 8 pepperoni slices ÷ 3 people

Your goals:
- Help student realize this is actually two division problems
- Guide toward 2⅔ slices of each type per person
- Introduce fraction notation naturally if they discover splitting slices
- Use the whiteboard to visualize the division

Call stage_complete() when student grasps that each pizza needs separate equal division.`
      }
    ]
  }
}

export function getLesson(lessonId: string): Lesson | null {
  return lessons[lessonId] || null
}
Session State (Frontend)
Add to src/types/index.ts:
typescriptexport interface SessionState {
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
Implementation: Phase 1 - Session & Stage Management
Update App.tsx with Full Logic
File: src/App.tsx
Replace entire contents:
typescriptimport React, { useState, useRef, useEffect } from 'react'
import StageDisplay from './components/StageDisplay'
import Whiteboard from './components/Whiteboard'
import VoiceInterface from './components/VoiceInterface'
import { getLesson } from './data/lessons'
import type { Stage, SessionState } from './types'
import './App.css'

function App() {
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [conversationLog, setConversationLog] = useState<string[]>([])
  const whiteboardImageRef = useRef<string>('')

  // Initialize lesson
  const handleStartLesson = () => {
    const lesson = getLesson('division-with-remainders-1')
    if (!lesson) {
      console.error('Lesson not found')
      return
    }

    const newSession: SessionState = {
      session_id: generateSessionId(),
      lesson_id: lesson.lesson_id,
      current_stage: 0,
      stage_start_time: new Date(),
      peer_connection: null,
      data_channel: null
    }

    setSessionState(newSession)
    setCurrentStage(lesson.stages[0])
    console.log('Lesson started:', newSession)
  }

  // Handle WebRTC session creation
  const handleSessionCreate = (pc: RTCPeerConnection, dc: RTCDataChannel) => {
    if (!sessionState) return

    // Update session state with WebRTC connections
    setSessionState({
      ...sessionState,
      peer_connection: pc,
      data_channel: dc
    })

    // Listen for server events from OpenAI
    dc.addEventListener('message', (event) => {
      const serverEvent = JSON.parse(event.data)
      handleServerEvent(serverEvent)
    })

    dc.addEventListener('open', () => {
      console.log('Data channel opened - sending session configuration')

      // Configure the realtime session with stage context
      if (currentStage) {
        sendSessionUpdate(dc, currentStage)
      }
    })

    setIsVoiceActive(true)
  }

  // Send session update to OpenAI Realtime API
  const sendSessionUpdate = (dc: RTCDataChannel, stage: Stage) => {
    const updateEvent = {
      type: 'session.update',
      session: {
        instructions: stage.context_for_agent,
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
        ],
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          silence_duration_ms: 700
        }
      }
    }

    dc.send(JSON.stringify(updateEvent))
    console.log('Session update sent to OpenAI')
  }

  // Handle server events from OpenAI
  const handleServerEvent = async (event: any) => {
    console.log('Server event:', event.type, event)

    switch (event.type) {
      case 'response.function_call_arguments.done':
        handleFunctionCall(event)
        break

      case 'response.audio_transcript.done':
        if (event.transcript) {
          addToLog(`AI: ${event.transcript}`)
        }
        break

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          addToLog(`Student: ${event.transcript}`)
        }
        break

      case 'error':
        console.error('OpenAI error:', event.error)
        break
    }
  }

  // Handle function calls from OpenAI
  const handleFunctionCall = async (event: any) => {
    const functionName = event.name
    const args = JSON.parse(event.arguments)

    console.log(`Function called: ${functionName}`, args)

    if (functionName === 'stage_complete') {
      await handleStageComplete(args.reasoning)
    } else if (functionName === 'update_whiteboard') {
      await handleWhiteboardUpdate(args)
    }
  }

  // Handle stage completion
  const handleStageComplete = async (reasoning: string) => {
    if (!sessionState) return

    console.log('Stage complete:', reasoning)
    addToLog(`[Stage ${currentStage?.stage_id} completed: ${reasoning}]`)

    const lesson = getLesson(sessionState.lesson_id)
    if (!lesson) return

    const nextStageIndex = sessionState.current_stage + 1

    if (nextStageIndex < lesson.stages.length) {
      // Advance to next stage
      const nextStage = lesson.stages[nextStageIndex]

      setCurrentStage(nextStage)
      setSessionState({
        ...sessionState,
        current_stage: nextStageIndex,
        stage_start_time: new Date()
      })

      // Show transition UI
      alert(`Great work! Moving to Stage ${nextStage.stage_id}`)

      // Update session instructions for new stage
      if (sessionState.data_channel) {
        sendSessionUpdate(sessionState.data_channel, nextStage)
      }
    } else {
      // Lesson complete
      alert('Congratulations! You completed the entire lesson!')
      console.log('Lesson completed')
    }
  }

  // Handle whiteboard drawing request from AI
  const handleWhiteboardUpdate = async (args: { action: string; description: string }) => {
    console.log('Whiteboard update requested:', args)

    if (!whiteboardImageRef.current) {
      console.warn('No whiteboard image available yet')
      return
    }

    try {
      // Call backend to generate drawing commands
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageDataUrl: whiteboardImageRef.current,
          action: args.action,
          description: args.description
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate drawing commands')
      }

      const result = await response.json()

      // Trigger drawing on whiteboard component
      window.dispatchEvent(new CustomEvent('whiteboard-draw', {
        detail: result.commands
      }))

    } catch (error) {
      console.error('Whiteboard update error:', error)
    }
  }

  // Handle whiteboard image updates
  const handleWhiteboardImageUpdate = (imageDataUrl: string) => {
    whiteboardImageRef.current = imageDataUrl

    // Send image to OpenAI so it can see the whiteboard
    if (sessionState?.data_channel && sessionState.data_channel.readyState === 'open') {
      const imageEvent = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: imageDataUrl
            }
          ]
        }
      }

      sessionState.data_channel.send(JSON.stringify(imageEvent))
      console.log('Whiteboard image sent to OpenAI')
    }
  }

  // Utility functions
  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substring(2, 15)
  }

  const addToLog = (message: string) => {
    setConversationLog(prev => [...prev, message])
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍕 AI Math Tutor</h1>
        {currentStage && (
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            Stage {currentStage.stage_id}: {currentStage.learning_objective}
          </div>
        )}
      </header>

      <main className="app-main">
        {!sessionState ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2>Welcome to AI Math Tutor!</h2>
            <p style={{ fontSize: '18px', marginBottom: '30px' }}>
              Learn division with remainders through interactive pizza problems
            </p>
            <button
              onClick={handleStartLesson}
              style={{
                padding: '16px 32px',
                fontSize: '18px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Start Lesson
            </button>
          </div>
        ) : (
          <>
            <StageDisplay stage={currentStage} />

            {!isVoiceActive ? (
              <VoiceInterface onSessionCreate={handleSessionCreate} />
            ) : (
              <>
                <div style={{
                  margin: '20px 0',
                  textAlign: 'center',
                  padding: '12px',
                  backgroundColor: '#d4edda',
                  borderRadius: '8px'
                }}>
                  <span style={{ color: '#155724', fontWeight: 'bold' }}>
                    ✓ Voice Session Active - Start talking!
                  </span>
                </div>

                <Whiteboard onUpdate={handleWhiteboardImageUpdate} />

                {/* Conversation Log */}
                <div style={{
                  marginTop: '20px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <h3 style={{ marginTop: 0 }}>Conversation:</h3>
                  {conversationLog.length === 0 ? (
                    <p style={{ color: '#6c757d' }}>Conversation will appear here...</p>
                  ) : (
                    conversationLog.map((msg, i) => (
                      <div key={i} style={{ marginBottom: '8px', fontSize: '14px' }}>
                        {msg}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
Implementation: Phase 2 - Enhanced Components
Update Whiteboard Component
File: src/components/Whiteboard.tsx
Replace entire contents:
typescriptimport React, { useRef, useEffect, useState } from 'react'
import type { DrawingCommand } from '../types'

interface WhiteboardProps {
  onUpdate: (imageDataUrl: string) => void
}

export default function Whiteboard({ onUpdate }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [updateTimeout, setUpdateTimeout] = useState<NodeJS.Timeout | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    contextRef.current = ctx

    // Set canvas size
    canvas.width = 800
    canvas.height = 600

    // Set default drawing styles
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Fill with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Listen for AI drawing commands
    const handleAIDrawing = (event: any) => {
      if (event.detail && Array.isArray(event.detail)) {
        executeDrawingCommands(event.detail)
      }
    }

    window.addEventListener('whiteboard-draw', handleAIDrawing)

    return () => {
      window.removeEventListener('whiteboard-draw', handleAIDrawing)
    }
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = contextRef.current
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = contextRef.current
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)

    // Debounce whiteboard update - send to parent after 1 second of no drawing
    if (updateTimeout) {
      clearTimeout(updateTimeout)
    }

    const timeout = setTimeout(() => {
      captureAndSendImage()
    }, 1000)

    setUpdateTimeout(timeout)
  }

  const captureAndSendImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const imageDataUrl = canvas.toDataURL('image/png')
    onUpdate(imageDataUrl)
    console.log('Whiteboard image captured and sent')
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = contextRef.current
    if (!canvas || !ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    captureAndSendImage()
  }

  const executeDrawingCommands = (commands: DrawingCommand[]) => {
    const ctx = contextRef.current
    if (!ctx) return

    console.log('Executing drawing commands:', commands)

    commands.forEach((cmd) => {
      try {
        switch (cmd.type) {
          case 'circle':
            ctx.beginPath()
            ctx.arc(cmd.x, cmd.y, cmd.radius, 0, 2 * Math.PI)
            if (cmd.fill) {
              ctx.fillStyle = cmd.fill
              ctx.fill()
            }
            if (cmd.stroke) {
              ctx.strokeStyle = cmd.stroke
              ctx.lineWidth = cmd.strokeWidth || 2
              ctx.stroke()
            }
            break

          case 'rect':
            if (cmd.fill) {
              ctx.fillStyle = cmd.fill
              ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height)
            }
            if (cmd.stroke) {
              ctx.strokeStyle = cmd.stroke
              ctx.lineWidth = cmd.strokeWidth || 2
              ctx.strokeRect(cmd.x, cmd.y, cmd.width, cmd.height)
            }
            break

          case 'text':
            ctx.font = `${cmd.fontSize || 20}px ${cmd.font || 'Arial'}`
            ctx.fillStyle = cmd.fill || '#000000'
            ctx.fillText(cmd.content, cmd.x, cmd.y)
            break

          case 'line':
            ctx.beginPath()
            ctx.moveTo(cmd.x1, cmd.y1)
            ctx.lineTo(cmd.x2, cmd.y2)
            ctx.strokeStyle = cmd.stroke || '#000000'
            ctx.lineWidth = cmd.strokeWidth || 2
            ctx.stroke()
            break

          case 'arrow':
            drawArrow(ctx, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd)
            break

          case 'path':
            const path = new Path2D(cmd.d)
            if (cmd.fill) {
              ctx.fillStyle = cmd.fill
              ctx.fill(path)
            }
            if (cmd.stroke) {
              ctx.strokeStyle = cmd.stroke
              ctx.lineWidth = cmd.strokeWidth || 2
              ctx.stroke(path)
            }
            break

          case 'clear':
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
            break

          default:
            console.warn('Unknown drawing command type:', cmd.type)
        }
      } catch (error) {
        console.error('Error executing drawing command:', error, cmd)
      }
    })

    // Capture updated whiteboard
    captureAndSendImage()
  }

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: any
  ) => {
    const headSize = options.headSize || 10
    const angle = Math.atan2(y2 - y1, x2 - x1)

    // Draw line
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = options.stroke || '#000000'
    ctx.lineWidth = options.strokeWidth || 2
    ctx.stroke()

    // Draw arrowhead
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(
      x2 - headSize * Math.cos(angle - Math.PI / 6),
      y2 - headSize * Math.sin(angle - Math.PI / 6)
    )
    ctx.moveTo(x2, y2)
    ctx.lineTo(
      x2 - headSize * Math.cos(angle + Math.PI / 6),
      y2 - headSize * Math.sin(angle + Math.PI / 6)
    )
    ctx.stroke()
  }

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <div style={{ marginBottom: '10px' }}>
        <strong>Interactive Whiteboard</strong>
        <p style={{ fontSize: '14px', color: '#6c757d', margin: '5px 0' }}>
          Draw your solutions, and the AI tutor can see and respond to them!
        </p>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{
          border: '3px solid #333',
          cursor: 'crosshair',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      />

      <div style={{ marginTop: '10px' }}>
        <button
          onClick={clearCanvas}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Whiteboard
        </button>
      </div>
    </div>
  )
}
Update VoiceInterface Component
File: src/components/VoiceInterface.tsx
Replace entire contents:
typescriptimport React, { useState, useRef } from 'react'

interface VoiceInterfaceProps {
  onSessionCreate: (pc: RTCPeerConnection, dc: RTCDataChannel) => void
}

export default function VoiceInterface({ onSessionCreate }: VoiceInterfaceProps) {
  const [status, setStatus] = useState('Ready to connect')
  const [isConnecting, setIsConnecting] = useState(false)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  const startVoiceSession = async () => {
    try {
      setIsConnecting(true)
      setStatus('Requesting microphone access...')

      // Get microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      setStatus('Creating peer connection...')

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection()

      // Set up audio playback
      const audioElement = document.createElement('audio')
      audioElement.autoplay = true
      audioElementRef.current = audioElement

      pc.ontrack = (event) => {
        console.log('Received remote audio track')
        audioElement.srcObject = event.streams[0]
      }

      // Add local audio track (microphone)
      pc.addTrack(mediaStream.getTracks()[0])
      console.log('Added local audio track')

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events')
      console.log('Data channel created')

      dc.addEventListener('open', () => {
        console.log('Data channel opened')
        setStatus('Connected! Start talking...')
      })

      dc.addEventListener('error', (error) => {
        console.error('Data channel error:', error)
        setStatus('Data channel error - check console')
      })

      setStatus('Creating WebRTC offer...')

      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      console.log('Local description set')

      setStatus('Connecting to OpenAI...')

      // Send SDP to our backend, which proxies to OpenAI
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Session creation failed: ${response.status} - ${errorText}`)
      }

      const answerSdp = await response.text()
      console.log('Received answer SDP from OpenAI')

      setStatus('Establishing connection...')

      // Set remote description
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp,
      }
      await pc.setRemoteDescription(answer)
      console.log('Remote description set')

      setStatus('Connection established!')

      // Notify parent component
      onSessionCreate(pc, dc)

      setIsConnecting(false)
    } catch (error) {
      console.error('Voice session error:', error)
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsConnecting(false)
    }
  }

  return (
    <div style={{ textAlign: 'center', margin: '40px 0', padding: '20px' }}>
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Status:</strong>
        </div>
        <div style={{
          color: status.includes('Error') ? '#dc3545' : '#495057',
          fontSize: '16px'
        }}>
          {status}
        </div>
      </div>

      <button
        onClick={startVoiceSession}
        disabled={isConnecting}
        style={{
          padding: '16px 32px',
          fontSize: '18px',
          backgroundColor: isConnecting ? '#6c757d' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          minWidth: '200px'
        }}
      >
        {isConnecting ? 'Connecting...' : '🎤 Start Voice Session'}
      </button>

      <div style={{
        marginTop: '20px',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        <p>You'll need to allow microphone access when prompted.</p>
        <p>The AI tutor will guide you through the lesson!</p>
      </div>
    </div>
  )
}
Update StageDisplay Component
File: src/components/StageDisplay.tsx
Replace entire contents:
typescriptimport React from 'react'
import type { Stage } from '../types'

interface StageDisplayProps {
  stage: Stage | null
}

export default function StageDisplay({ stage }: StageDisplayProps) {
  if (!stage) {
    return null
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto 20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '2px solid #e9ecef'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <h3 style={{
            margin: 0,
            color: '#495057'
          }}>
            Stage {stage.stage_id}
          </h3>
          <span style={{
            padding: '4px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            IN PROGRESS
          </span>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '15px',
          border: '1px solid #dee2e6'
        }}>
          <p style={{
            fontSize: '18px',
            lineHeight: '1.6',
            margin: 0,
            color: '#212529'
          }}>
            {stage.problem}
          </p>
        </div>

        {stage.visual_url && (
          <div style={{
            textAlign: 'center',
            margin: '20px 0'
          }}>
            <img
              src={stage.visual_url}
              alt="Stage visual"
              style={{
                maxWidth: '100%',
                borderRadius: '8px',
                border: '2px solid #dee2e6'
              }}
              onError={(e) => {
                // Hide image if it fails to load (placeholder)
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        <div style={{
          marginTop: '15px',
          padding: '12px',
          backgroundColor: '#e7f3ff',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#004085'
        }}>
          <strong>Learning Goal:</strong> {stage.learning_objective}
        </div>
      </div>
    </div>
  )
}
Implementation: Phase 3 - Testing & Validation
Create Test Utilities
File: src/utils/testHelpers.ts
Create this new file:
typescript/**
 * Test the WebRTC connection to OpenAI
 */
export async function testWebRTCConnection(): Promise<boolean> {
  try {
    console.log('Testing WebRTC connection...')

    // Check if browser supports WebRTC
    if (!window.RTCPeerConnection) {
      console.error('WebRTC not supported in this browser')
      return false
    }

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia not supported in this browser')
      return false
    }

    console.log('✓ WebRTC APIs available')
    return true
  } catch (error) {
    console.error('WebRTC test failed:', error)
    return false
  }
}

/**
 * Test the backend API endpoints
 */
export async function testBackendAPIs(): Promise<{
  session: boolean
  render: boolean
}> {
  const results = {
    session: false,
    render: false
  }

  // Test session endpoint
  try {
    const testSDP = 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: testSDP
    })

    results.session = response.status !== 404
    console.log('Session endpoint test:', results.session ? '✓' : '✗')
  } catch (error) {
    console.error('Session endpoint test failed:', error)
  }

  // Test render endpoint
  try {
    const testPayload = {
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      action: 'test',
      description: 'test'
    }

    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    })

    results.render = response.status !== 404
    console.log('Render endpoint test:', results.render ? '✓' : '✗')
  } catch (error) {
    console.error('Render endpoint test failed:', error)
  }

  return results
}

/**
 * Log system information
 */
export function logSystemInfo() {
  console.log('=== System Information ===')
  console.log('Browser:', navigator.userAgent)
  console.log('WebRTC Support:', !!window.RTCPeerConnection)
  console.log('getUserMedia Support:', !!(navigator.mediaDevices?.getUserMedia))
  console.log('========================')
}
Add Debug Panel (Optional)
File: src/components/DebugPanel.tsx
Create this new file for development:
typescriptimport React, { useState, useEffect } from 'react'
import { testWebRTCConnection, testBackendAPIs, logSystemInfo } from '../utils/testHelpers'

export default function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)

  useEffect(() => {
    logSystemInfo()
  }, [])

  const runTests = async () => {
    const webrtc = await testWebRTCConnection()
    const apis = await testBackendAPIs()

    setTestResults({
      webrtc,
      apis
    })
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 20px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Show Debug Panel
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '300px',
      backgroundColor: 'white',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <strong>Debug Panel</strong>
        <button onClick={() => setIsVisible(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
      </div>

      <button onClick={runTests} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
        Run Tests
      </button>

      {testResults && (
        <div>
          <div>WebRTC: {testResults.webrtc ? '✓' : '✗'}</div>
          <div>Session API: {testResults.apis.session ? '✓' : '✗'}</div>
          <div>Render API: {testResults.apis.render ? '✓' : '✗'}</div>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
        Check browser console for detailed logs
      </div>
    </div>
  )
}
Optionally add to App.tsx (in development):
typescriptimport DebugPanel from './components/DebugPanel'

// In render:
<DebugPanel />
Implementation: Phase 4 - Error Handling & Polish
Add Error Boundary
File: src/components/ErrorBoundary.tsx
Create this new file:
typescriptimport React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '100px auto'
        }}>
          <h2 style={{ color: '#dc3545' }}>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              marginTop: '20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
Update src/main.tsx to wrap with ErrorBoundary:
typescriptimport React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
Testing Checklist
Before deployment, verify:

Project Setup

 All files created successfully
 Dependencies installed (npm install)
 No TypeScript errors (npm run build)


API Configuration

 OPENAI_API_KEY set in .env.local
 Both API endpoints accessible locally
 Session endpoint returns SDP
 Render endpoint returns JSON


Frontend Functionality

 Page loads without errors
 "Start Lesson" button works
 Stage displays correctly
 "Start Voice Session" button appears


WebRTC Connection

 Microphone permission requested
 Connection status updates correctly
 Data channel opens
 Can hear AI speaking


Whiteboard

 Can draw on canvas
 Image captured after drawing
 Clear button works
 AI can request drawings (check console for function calls)


Stage Progression

 AI can call stage_complete function
 Stage transitions work
 Context updates for new stage



Deployment to Vercel

Commit code:

bashgit init
git add .
git commit -m "Initial AI math tutor implementation"

Push to GitHub:

bash# Create repo on GitHub first, then:
git remote add origin https://github.com/yourusername/ai-math-tutor.git
git push -u origin main

Deploy to Vercel:

Go to https://vercel.com/new
Import your GitHub repository
Vercel auto-detects Vite
Add environment variable: OPENAI_API_KEY
Click "Deploy"


Test production deployment:

Visit your Vercel URL
Test full flow end-to-end
Check Vercel Function Logs for any errors



Troubleshooting Guide
"Failed to create session" error

Check: OPENAI_API_KEY in .env.local and Vercel environment variables
Check: API key has Realtime API access (not all keys do)
Check: Network tab in browser for actual error response

No audio playback

Check: Browser console for audio errors
Check: Microphone permissions granted
Check: Autoplay policy (may need user gesture)
Try: Different browser (Chrome/Edge work best)

Whiteboard not sending images

Check: Console logs for "Whiteboard image captured"
Check: Canvas is actually visible and drawable
Check: /api/render endpoint is accessible

Data channel not opening

Check: WebRTC connection established (ontrack event fired)
Check: SDP exchange completed successfully
Wait: Can take 2-3 seconds for data channel to open

Function calls not working

Check: Data channel is open before sending events
Check: Function definitions in session.update match exactly
Check: OpenAI Realtime API console logs for function call events

Next Steps
After successful implementation:

Add more lessons - Create additional lesson definitions in src/data/lessons.ts
Enhance visuals - Add actual pizza images to /public folder
Add persistence - Integrate Supabase for session history
Add analytics - Track student progress and common errors
Add authentication - Use Supabase Auth for multi-user
Mobile optimization - Test and optimize for tablet/phone
Add text fallback - For students without microphone

Success Criteria
The implementation is complete when:

✅ Student can start a lesson
✅ Voice connection establishes with OpenAI
✅ AI tutor speaks and responds naturally
✅ Student can draw on whiteboard
✅ AI can see whiteboard drawings
✅ AI can add annotations to whiteboard
✅ Stage completes and advances when criteria met
✅ All stages work sequentially
✅ Lesson completion detected
✅ Deployed to Vercel and accessible via URL

You now have a complete, production-ready AI math tutor with interactive whiteboard capabilities!
