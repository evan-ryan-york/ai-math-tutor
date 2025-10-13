import React from 'react'
import type { Stage } from '../types'

interface StageDisplayProps {
  stage: Stage | null
  onReady?: () => void
}

export default function StageDisplay({ stage, onReady }: StageDisplayProps) {
  if (!stage) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Welcome to AI Math Tutor</h2>
        <p>Click the button below to start your lesson.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3>Stage {stage.stage_id}</h3>
        <div
          style={{
            backgroundColor: '#f5f5f5',
            padding: '20px',
            borderRadius: '8px',
            marginTop: '10px',
          }}
        >
          <p style={{ fontSize: '18px', lineHeight: '1.6' }}>{stage.problem}</p>
        </div>
      </div>

      {stage.visual_url && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <img
            src={stage.visual_url}
            alt="Stage visual"
            style={{ maxWidth: '100%', borderRadius: '8px' }}
          />
        </div>
      )}

      {onReady && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={onReady}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            I'm Ready
          </button>
        </div>
      )}
    </div>
  )
}
