import React, { useRef, useEffect, useState } from 'react'
import type { DrawingCommand } from '../types'

interface WhiteboardProps {
  onUpdate: (imageDataUrl: string) => void
}

export default function Whiteboard({ onUpdate }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [updateTimeout, setUpdateTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 800
    canvas.height = 600

    // Set drawing styles
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

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
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)

    // Debounce whiteboard update
    if (updateTimeout) {
      clearTimeout(updateTimeout)
    }

    const timeout = setTimeout(() => {
      const canvas = canvasRef.current
      if (canvas) {
        const imageDataUrl = canvas.toDataURL('image/png')
        onUpdate(imageDataUrl)
      }
    }, 1000)

    setUpdateTimeout(timeout)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const executeDrawingCommands = (commands: DrawingCommand[]) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    commands.forEach((cmd) => {
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
            ctx.lineWidth = cmd.strokeWidth || 1
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
            ctx.lineWidth = cmd.strokeWidth || 1
            ctx.strokeRect(cmd.x, cmd.y, cmd.width, cmd.height)
          }
          break

        case 'text':
          ctx.font = `${cmd.fontSize || 16}px ${cmd.font || 'Arial'}`
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

        case 'clear':
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          break
      }
    })
  }

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        style={{
          border: '2px solid #333',
          cursor: 'crosshair',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
        }}
      />
      <div style={{ marginTop: '10px' }}>
        <button onClick={clearCanvas} style={{ padding: '8px 16px' }}>
          Clear Whiteboard
        </button>
      </div>
    </div>
  )
}
