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
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null)
  const openHandlerRef = useRef<(() => void) | null>(null)

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

    // Clear transcript when starting a new stage
    if (sessionState.current_stage > 0) {
      setTranscript([])
      // Clear processed item IDs to allow fresh transcripts
      processedItemIds.current.clear()
    }

    // Update session state with WebRTC connections
    setSessionState({
      ...sessionState,
      peer_connection: pc,
      data_channel: dc
    })

    // Flag to track if we've sent the initial response
    let initialResponseSent = false

    // Create message handler
    const messageHandler = (event: MessageEvent) => {
      const serverEvent = JSON.parse(event.data)
      handleServerEvent(serverEvent)

      // Wait for session.updated event before triggering AI response
      if (serverEvent.type === 'session.updated' && !initialResponseSent) {
        initialResponseSent = true

        const responseCreateEvent = {
          type: 'response.create'
        }

        console.log('=== TRIGGERING INITIAL AI RESPONSE (after session.updated) ===')
        console.log('Event:', JSON.stringify(responseCreateEvent, null, 2))
        console.log('===============================================================')

        dc.send(JSON.stringify(responseCreateEvent))
      }
    }

    // Create open handler
    const openHandler = () => {
      console.log('Data channel opened - waiting for session.updated before triggering AI')
    }

    // Store handlers in refs so we can remove them later
    messageHandlerRef.current = messageHandler
    openHandlerRef.current = openHandler

    // Listen for server events from OpenAI
    dc.addEventListener('message', messageHandler)
    dc.addEventListener('open', openHandler)

    setIsVoiceActive(true)
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
        console.log('=== FUNCTION CALL ARGUMENTS DONE ===')
        console.log('Full event:', JSON.stringify(event, null, 2))
        console.log('====================================')
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

    console.log('=== FUNCTION CALL RECEIVED ===')
    console.log('Function name:', functionName)
    console.log('Arguments:', args)
    console.log('Event:', event)
    console.log('==============================')

    if (functionName === 'stage_complete') {
      await handleStageComplete(args.reasoning)
    } else if (functionName === 'update_whiteboard') {
      await handleWhiteboardUpdate(args)
    } else {
      console.warn('Unknown function called:', functionName)
    }
  }

  // Handle stage completion
  const handleStageComplete = async (reasoning: string) => {
    if (!sessionState) return

    console.log('Stage complete:', reasoning)

    // Close WebRTC connections properly
    if (sessionState.data_channel) {
      console.log('Closing data channel for stage', sessionState.current_stage)
      // Remove event listeners that we added
      const dc = sessionState.data_channel
      if (messageHandlerRef.current) {
        dc.removeEventListener('message', messageHandlerRef.current)
        messageHandlerRef.current = null
      }
      if (openHandlerRef.current) {
        dc.removeEventListener('open', openHandlerRef.current)
        openHandlerRef.current = null
      }
      // Clear other event handlers
      dc.onopen = null
      dc.onclose = null
      dc.onerror = null
      dc.onmessage = null
      dc.close()
    }
    if (sessionState.peer_connection) {
      console.log('Closing peer connection for stage', sessionState.current_stage)
      const pc = sessionState.peer_connection
      // Stop all tracks
      pc.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop()
        }
      })
      pc.getReceivers().forEach(receiver => {
        if (receiver.track) {
          receiver.track.stop()
        }
      })
      // Remove all event listeners
      pc.ontrack = null
      pc.onicecandidate = null
      pc.oniceconnectionstatechange = null
      pc.onconnectionstatechange = null
      pc.close()
    }

    // Update state to show we're no longer in voice session
    setIsVoiceActive(false)

    // Show "Correct!" alert
    alert('Correct!')

    const lesson = getLesson(sessionState.lesson_id)
    if (!lesson) return

    const nextStageIndex = sessionState.current_stage + 1

    if (nextStageIndex < lesson.stages.length) {
      // Advance to next stage (but don't start voice yet)
      const nextStage = lesson.stages[nextStageIndex]

      setCurrentStage(nextStage)
      setSessionState({
        ...sessionState,
        current_stage: nextStageIndex,
        stage_start_time: new Date(),
        peer_connection: null,
        data_channel: null
      })

      // Don't send session update - wait for user to click "Start Next Stage"
    } else {
      // Lesson complete
      alert('Congratulations! You completed the entire lesson!')
      console.log('Lesson completed')
      setCurrentStage(null)
    }
  }

  // Handle whiteboard drawing request from AI
  const handleWhiteboardUpdate = async (args: { description: string }) => {
    console.log('=== WHITEBOARD UPDATE REQUESTED ===')
    console.log('Description:', args.description)
    console.log('Has whiteboard image:', !!whiteboardImageRef.current)
    console.log('===================================')

    if (!whiteboardImageRef.current) {
      console.warn('No whiteboard image available yet - cannot draw')
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
          description: args.description
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate drawing commands')
      }

      const result = await response.json()

      console.log('Drawing commands generated:', result)

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

                  <Whiteboard
                    key={`whiteboard-stage-${sessionState.current_stage}`}
                    onUpdate={handleWhiteboardImageUpdate}
                  />
                </>
              ) : (
                <>
                  {sessionState.current_stage > 0 && (
                    <div style={{
                      padding: '20px',
                      backgroundColor: '#fff3cd',
                      borderRadius: '12px',
                      border: '2px solid #ffc107',
                      textAlign: 'center',
                      marginBottom: '20px'
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#856404'
                      }}>
                        🎉 Great job! Ready for the next stage?
                      </p>
                      <p style={{
                        margin: '0',
                        fontSize: '14px',
                        color: '#856404'
                      }}>
                        Click below to start a new voice session for Stage {currentStage?.stage_id}
                      </p>
                    </div>
                  )}
                  <VoiceInterface
                    stage={currentStage}
                    onSessionCreate={handleSessionCreate}
                    isNextStage={sessionState.current_stage > 0}
                  />
                </>
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
