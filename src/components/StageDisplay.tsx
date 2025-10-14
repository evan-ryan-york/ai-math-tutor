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
