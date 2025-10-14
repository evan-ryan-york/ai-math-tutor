import { useRef, useEffect, useState } from 'react'
import type { DrawingCommand } from '../types'

interface WhiteboardProps {
  onUpdate: (imageDataUrl: string) => void
}

export default function Whiteboard({ onUpdate }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [updateTimeout, setUpdateTimeout] = useState<NodeJS.Timeout | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

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

  const captureAndSendImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const imageDataUrl = canvas.toDataURL('image/png')
    onUpdate(imageDataUrl)
    console.log('Whiteboard image captured and sent')
  }

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

    // Don't send the initial blank canvas to AI

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = contextRef.current
    if (!canvas || !ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    captureAndSendImage()
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
