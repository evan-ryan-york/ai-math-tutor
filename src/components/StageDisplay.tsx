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
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Problem Image */}
      {stage.visual_url && (
        <div style={{
          backgroundColor: '#fff',
          padding: '15px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #e9ecef'
        }}>
          <img
            src={stage.visual_url}
            alt="Stage visual"
            style={{
              width: '100%',
              borderRadius: '8px'
            }}
            onError={(e) => {
              // Hide image if it fails to load (placeholder)
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      {/* Problem Text */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '2px solid #e9ecef'
      }}>
        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          margin: 0,
          color: '#212529'
        }}>
          {stage.problem}
        </p>
      </div>
    </div>
  )
}
