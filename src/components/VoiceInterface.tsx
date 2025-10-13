import React, { useState } from 'react'

interface VoiceInterfaceProps {
  onSessionCreate: (pc: RTCPeerConnection, dc: RTCDataChannel) => void
}

export default function VoiceInterface({ onSessionCreate }: VoiceInterfaceProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState('Not connected')

  const startSession = async () => {
    try {
      setStatus('Connecting...')

      // Create peer connection
      const pc = new RTCPeerConnection()

      // Set up audio playback
      const audioElement = document.createElement('audio')
      audioElement.autoplay = true
      pc.ontrack = (e) => {
        audioElement.srcObject = e.streams[0]
      }

      // Get microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      pc.addTrack(mediaStream.getTracks()[0])

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events')

      // Create and set local description
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send SDP to backend
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const answerSdp = await response.text()
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp,
      }

      await pc.setRemoteDescription(answer)

      setIsConnected(true)
      setStatus('Connected')

      onSessionCreate(pc, dc)
    } catch (error) {
      console.error('Connection error:', error)
      setStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong> {status}
      </div>
      <button
        onClick={startSession}
        disabled={isConnected}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: isConnected ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isConnected ? 'not-allowed' : 'pointer',
        }}
      >
        {isConnected ? 'Connected' : 'Start Voice Session'}
      </button>
    </div>
  )
}
