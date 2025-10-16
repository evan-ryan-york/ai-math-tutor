import { useEffect, useRef } from 'react'

interface TranscriptEntry {
  speaker: 'ai' | 'student'
  text: string
  timestamp: Date
}

interface TranscriptProps {
  entries: TranscriptEntry[]
}

export default function Transcript({ entries }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '2px solid #e9ecef',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '2px solid #e9ecef',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#495057' }}>
          Transcript
        </h3>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {entries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#6c757d',
            padding: '40px 20px',
            fontSize: '14px'
          }}>
            Conversation transcript will appear here...
          </div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: entry.speaker === 'ai' ? '#e7f3ff' : '#f0f0f0',
                borderLeft: `4px solid ${entry.speaker === 'ai' ? '#007bff' : '#6c757d'}`
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  color: entry.speaker === 'ai' ? '#007bff' : '#495057',
                  textTransform: 'uppercase'
                }}>
                  {entry.speaker === 'ai' ? '🤖 Tutor' : '👤 Student'}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: '#6c757d'
                }}>
                  {entry.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#212529'
              }}>
                {entry.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export type { TranscriptEntry }
