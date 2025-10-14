# AI Math Tutor - Testing Checklist

**Date:** October 13, 2025
**Phase:** Phase 5 - QA Testing
**Purpose:** Comprehensive testing guide for local development

---

## Pre-Testing Setup

### 1. Environment Configuration ✓

**Check .env.local exists:**
```bash
ls -la .env.local
```

**Verify OPENAI_API_KEY is set:**
```bash
grep OPENAI_API_KEY .env.local
```

**Expected format:**
```
OPENAI_API_KEY=sk-proj-xxxxx
```

⚠️ **IMPORTANT:** Your OpenAI API key must have access to:
- Realtime API (gpt-4o-realtime-preview-2024-10-01)
- GPT-4o Vision API

### 2. Dependencies Installed ✓

```bash
npm install
```

Expected output: All packages installed without errors

### 3. Build Verification ✓

```bash
npm run build
```

Expected output:
- ✓ TypeScript compilation successful
- ✓ Vite build completes
- ✓ 0 errors, 0 warnings

---

## Testing Phase 1: Application Launch

### Step 1.1: Start Dev Server

```bash
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Checklist:**
- [ ] Server starts without errors
- [ ] Port 5173 is accessible
- [ ] No immediate console errors

### Step 1.2: Open Browser

Navigate to: `http://localhost:5173/`

**Expected UI:**
- [ ] Page loads successfully
- [ ] Header shows "🍕 AI Math Tutor"
- [ ] Welcome screen displays
- [ ] "Start Lesson" button is visible and styled correctly

**Browser Console Check:**
- [ ] No red errors in console
- [ ] No 404 errors
- [ ] React app mounted successfully

### Step 1.3: Verify Static Assets

**Check browser DevTools > Network:**
- [ ] index.html loads (200)
- [ ] CSS file loads (200)
- [ ] JS bundle loads (200)
- [ ] No 404 errors for assets

---

## Testing Phase 2: Lesson Initialization

### Step 2.1: Start Lesson

**Action:** Click "Start Lesson" button

**Expected Behavior:**
- [ ] Welcome screen disappears
- [ ] Stage display appears with:
  - Stage 1 header
  - "IN PROGRESS" badge (blue)
  - Problem text: "I've got two friends coming over..."
  - Learning goal callout (blue box)
- [ ] "Start Voice Session" button appears

**Console Check:**
```
Lesson started: {session_id: "session_xxxx", ...}
```

**Checklist:**
- [ ] Session ID generated
- [ ] Current stage set to 0
- [ ] Stage 1 data loaded correctly
- [ ] No errors in console

### Step 2.2: Verify Stage Data

**Check Stage Display:**
- [ ] Stage number: "Stage 1"
- [ ] Problem text is readable and formatted
- [ ] Learning objective shows: "Student recognizes that 16÷3 has a remainder"
- [ ] No visual glitches or layout issues

---

## Testing Phase 3: Voice Connection

### Step 3.1: Start Voice Session

**Action:** Click "Start Voice Session" button

**Expected Status Updates (in order):**
1. [ ] "Requesting microphone access..."
2. [ ] Browser microphone permission prompt appears
3. [ ] Grant microphone permission
4. [ ] "Creating peer connection..."
5. [ ] "Creating WebRTC offer..."
6. [ ] "Connecting to OpenAI..."
7. [ ] "Establishing connection..."
8. [ ] "Connection established!"
9. [ ] "Connected! Start talking..."

**Checklist:**
- [ ] Button changes to "Connecting..." and disables
- [ ] Status box updates at each step
- [ ] No errors during connection process
- [ ] Microphone permission granted

### Step 3.2: Verify WebRTC Connection

**Console Logs to Check:**
```
Added local audio track
Data channel created
Local description set
Received answer SDP from OpenAI
Remote description set
Data channel opened
Session update sent to OpenAI
```

**Checklist:**
- [ ] All console logs appear in order
- [ ] No WebRTC errors
- [ ] Data channel state: "open"
- [ ] Peer connection state: "connected"

**Check Voice Session Active UI:**
- [ ] Green success box appears: "✓ Voice Session Active - Start talking!"
- [ ] Whiteboard component appears
- [ ] Conversation log section appears (empty initially)

### Step 3.3: Test Audio Playback

**Action:** Wait for AI to speak (should greet you automatically)

**Expected:**
- [ ] Hear AI voice through speakers/headphones
- [ ] Voice is clear and understandable
- [ ] No audio distortion or echo

**If AI doesn't speak:**
- Check browser audio settings
- Check system volume
- Check browser autoplay policy
- Try speaking first to trigger AI response

### Step 3.4: Test Microphone Input

**Action:** Speak clearly: "Hello, can you hear me?"

**Expected:**
- [ ] AI responds to your speech
- [ ] Response is contextually appropriate
- [ ] Conversation log updates with:
  - "Student: Hello, can you hear me?"
  - "AI: [AI's response]"

**Console Check:**
```
Server event: conversation.item.input_audio_transcription.completed
Student: Hello, can you hear me?
AI: [AI's response]
```

---

## Testing Phase 4: Whiteboard Functionality

### Step 4.1: Student Drawing

**Action:** Draw on the whiteboard canvas with mouse

**Expected:**
- [ ] Canvas accepts mouse input
- [ ] Drawing appears as you move mouse
- [ ] Lines are smooth and continuous
- [ ] Drawing color is black
- [ ] Cursor changes to crosshair over canvas

**Test Drawing:**
1. [ ] Draw a circle
2. [ ] Draw a line
3. [ ] Draw numbers or text (freehand)
4. [ ] Release mouse

**After 1 second of no drawing:**
```console
Whiteboard image captured and sent
```

### Step 4.2: Clear Whiteboard

**Action:** Click "Clear Whiteboard" button

**Expected:**
- [ ] Canvas clears to white background
- [ ] No artifacts remain
- [ ] Image capture triggered
- [ ] Console: "Whiteboard image captured and sent"

### Step 4.3: AI Drawing Commands (Manual Test)

**Note:** AI drawing requires AI to call update_whiteboard function. This may not happen automatically in Stage 1.

**To trigger manually (for testing):**

Open browser console and run:
```javascript
window.dispatchEvent(new CustomEvent('whiteboard-draw', {
  detail: [
    {
      type: 'circle',
      x: 200,
      y: 200,
      radius: 50,
      fill: '#ffcccc',
      stroke: '#ff0000',
      strokeWidth: 3
    },
    {
      type: 'text',
      x: 170,
      y: 210,
      content: 'Test',
      fontSize: 20,
      fill: '#000000'
    }
  ]
}))
```

**Expected:**
- [ ] Red circle appears on canvas
- [ ] "Test" text appears inside circle
- [ ] Console: "Executing drawing commands: [...]"
- [ ] Console: "Whiteboard image captured and sent"

### Step 4.4: Arrow Drawing Test

**Manual test for arrow support:**

```javascript
window.dispatchEvent(new CustomEvent('whiteboard-draw', {
  detail: [
    {
      type: 'arrow',
      x1: 100,
      y1: 100,
      x2: 300,
      y2: 200,
      stroke: '#0000ff',
      strokeWidth: 3,
      headSize: 15
    }
  ]
}))
```

**Expected:**
- [ ] Blue arrow appears from (100,100) to (300,200)
- [ ] Arrowhead is visible and properly oriented
- [ ] No console errors

---

## Testing Phase 5: Stage Progression

### Step 5.1: Natural Stage Completion

**Action:** Engage with AI tutor on the pizza problem

**Example conversation:**
1. Speak: "So we have 16 slices total, right?"
2. Speak: "If we divide 16 by 3 people, each person gets 5 slices"
3. Speak: "But that leaves 1 slice left over as a remainder"

**Expected AI Behavior:**
- [ ] AI acknowledges your understanding
- [ ] AI confirms the remainder concept
- [ ] AI calls stage_complete() function

**Console Check:**
```
Function called: stage_complete {reasoning: "..."}
Stage complete: [reasoning]
[Stage 1 completed: ...]
```

**Expected UI Changes:**
- [ ] Alert appears: "Great work! Moving to Stage 2"
- [ ] Stage display updates to Stage 2
- [ ] Badge still shows "IN PROGRESS"
- [ ] Problem text updates to: "Actually, one pizza is cheese..."
- [ ] Learning objective updates

### Step 5.2: Verify New Stage Context

**Console Check:**
```
Session update sent to OpenAI
```

**AI Behavior:**
- [ ] AI references the new problem (two pizza types)
- [ ] AI asks questions appropriate for Stage 2
- [ ] AI no longer talks about Stage 1 concepts

### Step 5.3: Complete Stage 2

**Continue conversation about dividing each pizza type:**
1. Speak: "We need to divide the cheese pizza by 3"
2. Speak: "And divide the pepperoni pizza by 3"
3. Speak: "So each person gets 2 and 2/3 slices of each type"

**Expected:**
- [ ] AI recognizes understanding of separate divisions
- [ ] AI acknowledges fraction notation
- [ ] Alert: "Congratulations! You completed the entire lesson!"
- [ ] Console: "Lesson completed"

---

## Testing Phase 6: Error Handling

### Step 6.1: Test Microphone Denial

**Action:**
1. Reload page
2. Click "Start Lesson"
3. Click "Start Voice Session"
4. **Deny** microphone permission

**Expected:**
- [ ] Status shows error message in red
- [ ] Error message mentions microphone access
- [ ] Button re-enables
- [ ] Console shows error details
- [ ] No app crash

### Step 6.2: Test Connection Failure

**Action:**
1. Stop dev server
2. Try starting voice session

**Expected:**
- [ ] Status shows "Error: Failed to fetch" or similar
- [ ] Error message is user-friendly
- [ ] No app crash
- [ ] ErrorBoundary doesn't trigger (this is a handled error)

### Step 6.3: Test Invalid API Key

**Action:**
1. Edit .env.local with invalid key
2. Restart dev server
3. Try connecting

**Expected:**
- [ ] Connection fails with error message
- [ ] Status shows API error
- [ ] Console shows 401 or 403 error
- [ ] No app crash

---

## Testing Phase 7: API Endpoints

### Step 7.1: Test Session Endpoint

**Manual test (while dev server running):**

```bash
curl -X POST http://localhost:5173/api/session \
  -H "Content-Type: application/sdp" \
  -d "v=0
o=- 0 0 IN IP4 127.0.0.1
s=-
t=0 0"
```

**Expected:**
- [ ] Returns 200 status or connection-related error (expected if not valid SDP)
- [ ] Does not return 404
- [ ] Endpoint is accessible

### Step 7.2: Test Render Endpoint

**Manual test:**

```bash
curl -X POST http://localhost:5173/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "imageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "action": "draw",
    "description": "draw a circle"
  }'
```

**Expected:**
- [ ] Returns JSON with `commands` array
- [ ] Returns 200 status
- [ ] No 404 error

---

## Testing Phase 8: Browser Compatibility

### Supported Browsers

Test in each browser:

#### Chrome/Edge (Primary)
- [ ] All features work
- [ ] Audio quality good
- [ ] No visual glitches
- [ ] WebRTC connection stable

#### Firefox
- [ ] All features work
- [ ] Audio quality acceptable
- [ ] Canvas drawing works
- [ ] WebRTC connection stable

#### Safari
- [ ] All features work
- [ ] Microphone permission works
- [ ] Audio playback works
- [ ] Canvas rendering correct

---

## Common Issues & Solutions

### Issue: "Failed to create session"
**Possible Causes:**
- OPENAI_API_KEY not set or invalid
- API key doesn't have Realtime API access
- Network connectivity issue

**Solutions:**
- Verify .env.local contains valid key
- Check OpenAI dashboard for API access
- Test internet connection

### Issue: No audio playback
**Possible Causes:**
- Browser autoplay policy blocking
- No audio output device
- Volume muted

**Solutions:**
- Check browser audio settings
- Click on page to enable autoplay
- Check system volume
- Try different browser

### Issue: Whiteboard not capturing
**Possible Causes:**
- Canvas not fully initialized
- Data channel not open
- Image encoding issue

**Solutions:**
- Check console for "Data channel opened" message
- Wait 2-3 seconds after connection before drawing
- Check for canvas errors in console

### Issue: AI not advancing stages
**Possible Causes:**
- Function calling not configured
- AI doesn't detect mastery
- Session update not sent

**Solutions:**
- Check console for "Session update sent"
- Verify tools are defined in session.update
- Be more explicit in conversation

---

## Success Criteria

✅ **Phase 5 Complete When:**

- [ ] Application loads without errors
- [ ] Lesson starts successfully
- [ ] Voice connection establishes
- [ ] Can hear AI speaking
- [ ] AI responds to student speech
- [ ] Transcripts appear in conversation log
- [ ] Whiteboard drawing works
- [ ] AI can receive whiteboard images
- [ ] Stage progression works (Stage 1 → Stage 2)
- [ ] Lesson completion detected
- [ ] No critical console errors
- [ ] Error handling works gracefully
- [ ] At least 2 browsers tested successfully

---

## Testing Notes

**Date:** __________
**Tester:** __________
**OpenAI API Key Status:** Valid / Invalid
**Browser Used:** __________

### Observations:

1.

2.

3.

### Issues Found:

1.

2.

3.

### Overall Assessment:

- [ ] Ready for deployment
- [ ] Needs fixes
- [ ] Major issues found

---

**Next Steps After Testing:**
- Document any issues found
- Create GitHub issues for bugs
- Proceed to Phase 6 (Deployment Prep)
