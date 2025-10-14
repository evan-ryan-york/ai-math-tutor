import { useState, useRef } from 'react'

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

      setStatus('Sending SDP to server...')

      // 1. Define the request options - wrap SDP in JSON for reliable parsing
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sdp: offer.sdp }),
      }

      // 2. Log the entire request object before sending
      console.log('--- FRONTEND: Sending Request ---')
      console.log('URL: /api/session')
      console.log('Headers:', requestOptions.headers)
      console.log(`Body Length: ${requestOptions.body.length}`)
      console.log(`SDP Length: ${offer.sdp?.length}`)
      console.log('-----------------------------')

      // 3. Make the fetch call
      const response = await fetch('/api/session', requestOptions)

      if (!response.ok) {
        // 4. Log the full error response from our own API
        const errorBody = await response.text()
        console.error('--- FRONTEND: Received Error Response ---')
        console.error(`Status: ${response.status}`)
        console.error('Body:', errorBody)
        console.error('------------------------------------')
        throw new Error(`Session creation failed: ${response.status} - ${errorBody}`)
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
        {isConnecting ? 'Connecting...' : 'Start Voice Session'}
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
