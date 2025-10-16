export interface Stage {
  stage_id: number
  image_path?: string
  visual_url?: string // Computed at runtime from image_path
  problem: string
  success_criteria: string
}

export interface Lesson {
  lesson_id: string
  title: string
  learning_goal: string
  stages: Stage[]
}

export interface DrawingCommand {
  type: 'circle' | 'rect' | 'line' | 'arrow' | 'text' | 'path' | 'clear'
  [key: string]: any
}

export interface SessionState {
  session_id: string
  lesson_id: string
  current_stage: number
  stage_start_time: Date
  whiteboard_image_url?: string
  peer_connection: RTCPeerConnection | null
  data_channel: RTCDataChannel | null
}

export interface ConversationEvent {
  type: string
  timestamp: Date
  data: any
}
