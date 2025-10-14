/**
 * Test the WebRTC connection to OpenAI
 */
export async function testWebRTCConnection(): Promise<boolean> {
  try {
    console.log('Testing WebRTC connection...')

    // Check if browser supports WebRTC
    if (!window.RTCPeerConnection) {
      console.error('WebRTC not supported in this browser')
      return false
    }

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia not supported in this browser')
      return false
    }

    console.log('✓ WebRTC APIs available')
    return true
  } catch (error) {
    console.error('WebRTC test failed:', error)
    return false
  }
}

/**
 * Test the backend API endpoints
 */
export async function testBackendAPIs(): Promise<{
  session: boolean
  render: boolean
}> {
  const results = {
    session: false,
    render: false
  }

  // Test session endpoint
  try {
    const testSDP = 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: testSDP
    })

    results.session = response.status !== 404
    console.log('Session endpoint test:', results.session ? '✓' : '✗')
  } catch (error) {
    console.error('Session endpoint test failed:', error)
  }

  // Test render endpoint
  try {
    const testPayload = {
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      action: 'test',
      description: 'test'
    }

    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    })

    results.render = response.status !== 404
    console.log('Render endpoint test:', results.render ? '✓' : '✗')
  } catch (error) {
    console.error('Render endpoint test failed:', error)
  }

  return results
}

/**
 * Log system information
 */
export function logSystemInfo() {
  console.log('=== System Information ===')
  console.log('Browser:', navigator.userAgent)
  console.log('WebRTC Support:', !!window.RTCPeerConnection)
  console.log('getUserMedia Support:', !!(navigator.mediaDevices?.getUserMedia))
  console.log('========================')
}
