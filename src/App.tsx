import React, { useState } from 'react'
import StageDisplay from './components/StageDisplay'
import Whiteboard from './components/Whiteboard'
import VoiceInterface from './components/VoiceInterface'
import type { Stage } from './types'
import './App.css'

function App() {
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null)
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)

  const handleStartLesson = () => {
    // Placeholder - will be implemented in next phase
    const mockStage: Stage = {
      stage_id: 1,
      problem: 'I have 2 pizzas with 8 slices each. If 3 friends want to share them equally, how should we divide them?',
      learning_objective: 'Understand division with remainders',
      mastery_criteria: {
        description: 'Student recognizes remainder',
        indicators: ['Mentions leftover slice', 'Proposes solution']
      },
      context_for_agent: 'Guide student to discover 16÷3 = 5 remainder 1'
    }
    setCurrentStage(mockStage)
  }

  const handleSessionCreate = (pc: RTCPeerConnection, dc: RTCDataChannel) => {
    setPeerConnection(pc)
    setDataChannel(dc)
    setSessionStarted(true)

    // Set up data channel listeners
    dc.addEventListener('message', (event) => {
      const serverEvent = JSON.parse(event.data)
      console.log('Server event:', serverEvent)
      // Handle server events here
    })

    dc.addEventListener('open', () => {
      console.log('Data channel opened')
    })
  }

  const handleWhiteboardUpdate = async (imageDataUrl: string) => {
    console.log('Whiteboard updated')
    // Placeholder for sending image to realtime session
    // Will be implemented in next phase
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Math Tutor</h1>
      </header>

      <main className="app-main">
        {!currentStage ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <StageDisplay stage={null} />
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
                marginTop: '20px',
              }}
            >
              Start Lesson
            </button>
          </div>
        ) : (
          <>
            <StageDisplay stage={currentStage} />

            {!sessionStarted && (
              <VoiceInterface onSessionCreate={handleSessionCreate} />
            )}

            {sessionStarted && (
              <div>
                <div style={{ margin: '20px 0', textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    borderRadius: '4px'
                  }}>
                    ✓ Voice Session Active
                  </span>
                </div>
                <Whiteboard onUpdate={handleWhiteboardUpdate} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
