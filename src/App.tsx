import { useState, useRef } from 'react'
import StageDisplay from './components/StageDisplay'
import Whiteboard from './components/Whiteboard'
import VoiceInterface from './components/VoiceInterface'
import Transcript, { type TranscriptEntry } from './components/Transcript'
import { getLesson } from './data/lessons'
import type { Stage, SessionState } from './types'
import './App.css'

function App() {
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const whiteboardImageRef = useRef<string>('')
  const processedItemIds = useRef(new Set<string>())

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

  // Utility functions
  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substring(2, 15)
  }

  const addToTranscript = (speaker: 'ai' | 'student', text: string) => {
    setTranscript(prev => [...prev, {
      speaker,
      text,
      timestamp: new Date()
    }])
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
      console.log('Data channel opened - session already configured via /calls endpoint')

      // The session is already configured via the FormData sent to /calls
      // Just trigger the AI to start speaking
      const responseCreateEvent = {
        type: 'response.create'
      }

      console.log('=== TRIGGERING INITIAL AI RESPONSE ===')
      console.log('Event:', JSON.stringify(responseCreateEvent, null, 2))
      console.log('======================================')

      dc.send(JSON.stringify(responseCreateEvent))
    })

    setIsVoiceActive(true)
  }

  // Send session update to OpenAI Realtime API
  const sendSessionUpdate = (dc: RTCDataChannel, stage: Stage) => {
    const updateEvent = {
      type: 'session.update',
      session: {
        instructions: `You are a friendly math tutor helping a 10-year-old student. Use age-appropriate language and keep your responses short and conversational.

Current Problem: ${stage.problem}

Success Criteria: ${stage.success_criteria}

CRITICAL RULES:
- NEVER give away answers or do calculations for the student
- NEVER say the numbers from calculations (let them figure it out)
- NEVER tell them what operation to use (like "divide" or "multiply")
- Ask ONE simple question at a time that helps them think through the next small step
- If they're stuck, ask about what they already know
- Build on their ideas, even if imperfect - guide them gently from where they are
- Keep responses to 1-2 short sentences maximum
- When the student meets the success criteria, call stage_complete()

Start by greeting them warmly and asking what they notice about the problem.`,
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.6,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000,
          create_response: true,
          interrupt_response: false
        },
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
        ]
      }
    }

    console.log('=== SENDING SESSION UPDATE ===')
    console.log('Event type:', updateEvent.type)
    console.log('Session keys:', Object.keys(updateEvent.session))
    console.log('Full payload:', JSON.stringify(updateEvent, null, 2))
    console.log('==============================')

    dc.send(JSON.stringify(updateEvent))

    // Now trigger a response from the AI
    const responseCreateEvent = {
      type: 'response.create'
    }

    console.log('=== TRIGGERING AI RESPONSE ===')
    console.log('Event:', JSON.stringify(responseCreateEvent, null, 2))
    console.log('==============================')

    dc.send(JSON.stringify(responseCreateEvent))
  }

  // Handle server events from OpenAI
  const handleServerEvent = async (event: any) => {
    // Log errors and important events with more detail
    if (event.type === 'error') {
      console.error('=== OPENAI ERROR EVENT ===')
      console.error('Error type:', event.error?.type)
      console.error('Error code:', event.error?.code)
      console.error('Error message:', event.error?.message)
      console.error('Error param:', event.error?.param)
      console.error('Full error object:', JSON.stringify(event, null, 2))
      console.error('==========================')
    } else if (event.type.includes('session')) {
      console.log('=== SESSION EVENT ===')
      console.log('Event type:', event.type)
      console.log('Full event:', JSON.stringify(event, null, 2))
      console.log('====================')
    } else {
      console.log('Server event:', event.type)
    }

    switch (event.type) {
      case 'response.function_call_arguments.done':
        handleFunctionCall(event)
        break

      case 'response.output_audio_transcript.done':
        // AI speech transcript - correct event type for output audio
        if (event.transcript && event.item_id) {
          // Prevent duplicate transcripts using item_id tracking
          if (processedItemIds.current.has(event.item_id)) {
            console.log('Skipping duplicate AI transcript for item:', event.item_id)
            break
          }

          processedItemIds.current.add(event.item_id)
          console.log('AI transcript (done):', event.transcript)
          addToTranscript('ai', event.transcript)
        }
        break

      case 'response.output_audio_transcript.delta':
        // AI speech transcript delta - streaming updates (logged but not added to transcript yet)
        console.log('AI transcript delta:', event.delta)
        break

      case 'conversation.item.input_audio_transcription.completed':
        // Student speech transcript - asynchronous, arrives without guaranteed timing
        if (event.transcript && event.item_id) {
          // Prevent duplicate transcripts using item_id tracking
          if (processedItemIds.current.has(event.item_id)) {
            console.log('Skipping duplicate student transcript for item:', event.item_id)
            break
          }

          processedItemIds.current.add(event.item_id)
          console.log('Student transcript:', event.transcript)
          addToTranscript('student', event.transcript)
        }
        break

      case 'conversation.item.input_audio_transcription.delta':
        // Student speech transcript delta - streaming updates (logged but not added yet)
        console.log('Student transcript delta:', event.delta)
        break

      case 'error':
        console.error('OpenAI error:', event.error)
        break

      default:
        // Log any transcript-related events we might be missing
        if (event.type.includes('transcript') || event.type.includes('audio')) {
          console.log('Unhandled audio/transcript event:', event.type, event)
        }
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

    // Show "Correct!" alert
    alert('Correct!')

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍕 AI Math Tutor</h1>
        {currentStage && (
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            Stage {currentStage.stage_id}
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
          <div style={{
            display: 'flex',
            gap: '20px',
            height: 'calc(100vh - 80px)',
            padding: '20px 80px'
          }}>
            {/* Left column: Problem image and text (25%) */}
            <div style={{
              flex: '0 0 25%',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflow: 'auto'
            }}>
              <StageDisplay stage={currentStage} />
            </div>

            {/* Middle column: Whiteboard (50%) */}
            <div style={{
              flex: '0 0 50%',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflow: 'auto'
            }}>
              {isVoiceActive ? (
                <>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#d4edda',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <span style={{ color: '#155724', fontWeight: 'bold' }}>
                      ✓ Voice Session Active - Start talking!
                    </span>
                  </div>

                  <Whiteboard onUpdate={handleWhiteboardImageUpdate} />
                </>
              ) : (
                <VoiceInterface stage={currentStage} onSessionCreate={handleSessionCreate} />
              )}
            </div>

            {/* Right column: Transcript (25%) */}
            <div style={{
              flex: '0 0 25%'
            }}>
              <Transcript entries={transcript} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
