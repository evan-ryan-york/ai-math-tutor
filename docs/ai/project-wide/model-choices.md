# AI Math Tutor - Model Selection & Rationale

**Date:** October 13, 2025
**Last Updated:** October 13, 2025
**Status:** Production-Ready

---

## Executive Summary

This document explains the AI model choices for the AI Math Tutor application, based on research conducted in October 2025 of the latest models from OpenAI, Google Gemini, and Anthropic Claude.

### Selected Models

| Use Case | Provider | Model | Version | Purpose |
|----------|----------|-------|---------|---------|
| **Realtime Voice Tutoring** | OpenAI | `gpt-realtime` | Aug 2025 | Student-tutor voice interaction |
| **Whiteboard Rendering** | Google | `gemini-2.5-flash` | Sept 2025 | Image analysis & drawing commands |

---

## 1. Realtime Voice Tutoring: OpenAI gpt-realtime

### Model Details

- **Model Name:** `gpt-realtime`
- **Release Date:** August 28, 2025
- **Status:** General Availability (GA)
- **API:** OpenAI Realtime API
- **Connection:** WebRTC (direct browser-to-API)

### Why OpenAI for Realtime Voice?

#### ✅ Native Speech-to-Speech Architecture
- Direct audio input → audio output pipeline
- No intermediate transcription step
- Lowest possible latency for natural conversation

#### ✅ Production-Ready WebRTC Support
- Built specifically for WebRTC connections
- Direct browser integration
- Handles audio streaming natively
- Session Initiation Protocol (SIP) support for phone calling

#### ✅ Superior Instruction Following
Per OpenAI's August 2025 announcement:
- Better at interpreting system messages and developer prompts
- Can read disclaimer scripts word-for-word
- Repeats back alphanumerics accurately
- Switches seamlessly between languages mid-sentence

#### ✅ Natural Expressiveness
- Adapts tone based on context
- Captures non-verbal cues (laughs, pauses)
- Two new exclusive voices: Cedar and Marin
- More natural and expressive than previous models

#### ✅ Cost-Effective
- **20% cheaper** than gpt-4o-realtime-preview
- Pricing: $32/1M audio input tokens, $64/1M audio output tokens
- Cached input: $0.40/1M tokens (98.75% discount)

#### ✅ Educational Use Case Optimized
Perfect for tutoring because:
- Can adapt tone (encouraging, patient, celebratory)
- Follows complex instructions (stage-specific contexts)
- Natural conversational flow
- Can handle math terminology accurately

### Alternatives Considered

#### Gemini 2.0 Multimodal Live API
**Pros:**
- Supports multimodal (video + audio)
- Real-time streaming

**Cons:**
- ❌ Focused on multimodal, not pure voice
- ❌ More complex setup for voice-only use case
- ❌ No WebRTC documentation as clear as OpenAI
- ❌ Less mature for production voice apps

**Decision:** OpenAI's purpose-built voice API is better suited

#### Anthropic Claude
**Pros:**
- Excellent at reasoning and instruction following
- Strong at educational content

**Cons:**
- ❌ No realtime voice API available (as of Oct 2025)
- ❌ Would require custom voice synthesis
- ❌ Higher latency with text-based approach

**Decision:** Not feasible for realtime voice interaction

### Implementation Details

**File:** `api/session.ts`

```typescript
const sessionConfig = {
  type: 'realtime',
  model: 'gpt-realtime',  // Latest GA model
  audio: {
    output: {
      voice: 'cedar'  // New expressive voice
    }
  }
}
```

**Stage Context Delivery:**
- Sent via data channel as `session.update` events
- Includes full stage instructions, learning objectives, and mastery criteria
- Updated dynamically when stages advance

**Function Tools:**
- `stage_complete(reasoning)` - AI calls when student demonstrates mastery
- `update_whiteboard(action, description)` - AI requests whiteboard annotations

---

## 2. Whiteboard Rendering: Google Gemini 2.5 Flash

### Model Details

- **Model Name:** `gemini-2.5-flash`
- **Release Date:** September 2025 (latest update)
- **Status:** Production
- **API:** Google AI Generative AI API
- **Access:** Google AI Studio, Vertex AI

### Why Gemini for Orchestration?

#### ✅ Superior Multimodal Reasoning
Per Google's September 2025 update:
- **Stronger image understanding** (specifically improved in Sept update)
- Better at analyzing hand-drawn content
- Excellent at interpreting visual layouts
- Can understand whiteboard context spatially

#### ✅ Fast Response Times
- **Flash variant** optimized for speed
- Lower latency than Pro variants
- Suitable for real-time drawing command generation
- Faster than GPT-4o for vision tasks

#### ✅ Better Translation Capabilities
From Sept 2025 update:
- More accurate transcription (helps with understanding drawn text/numbers)
- Better image understanding (improved specifically)
- Enhanced multimodal capabilities

#### ✅ Cost-Effective for Frequent Calls
- Flash models priced for high-volume use
- More economical than GPT-4o for repeated vision API calls
- Pay-per-use pricing model

#### ✅ Structured Output Support
- Native JSON mode (`responseMimeType: 'application/json'`)
- Reliable for generating drawing command arrays
- Consistent schema adherence

#### ✅ Educational Content Strength
- Excellent at understanding math notation
- Good at interpreting diagrams and visual explanations
- Can generate appropriate visual representations

### Alternatives Considered

#### GPT-4o Vision
**Pros:**
- Very good vision capabilities
- Strong at following instructions
- Reliable structured output

**Cons:**
- ❌ More expensive for frequent API calls
- ❌ Slower than Gemini Flash
- ❌ Gemini has better updated image understanding (Sept 2025)

**Decision:** Gemini Flash offers better speed/cost ratio for this use case

#### Claude Sonnet 4.5
**Pros:**
- Excellent at reasoning and coding
- Best model for complex agents
- Strong instruction following

**Cons:**
- ❌ More expensive than Gemini Flash
- ❌ Gemini has superior multimodal/vision capabilities
- ❌ Optimized for coding, not visual reasoning

**Decision:** Gemini's vision capabilities are better suited for whiteboard analysis

### Implementation Details

**File:** `api/render.ts`

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.7,
    maxOutputTokens: 1000
  }
})
```

**Input:**
- Base64-encoded whiteboard image (PNG)
- Action type (draw, highlight, label, clear)
- Natural language description

**Output:**
- JSON array of drawing commands
- Canvas primitives (circle, rect, line, arrow, text, path)
- Coordinates and styling information

**Example Flow:**
1. AI tutor calls `update_whiteboard("draw", "draw 16 pizza slices arranged in 2 rows")`
2. Backend sends whiteboard screenshot + prompt to Gemini
3. Gemini analyzes current whiteboard state
4. Gemini generates structured drawing commands
5. Frontend executes commands on canvas

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React Frontend)                                    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Voice Interface                                       │  │
│  │  WebRTC ←──────────────────→ OpenAI gpt-realtime     │  │
│  │  • Low latency audio streaming                        │  │
│  │  • Data channel for events                            │  │
│  │  • Stage context via session.update                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Whiteboard Component                                  │  │
│  │  • Student drawing capture                             │  │
│  │  • AI-generated annotations                            │  │
│  │  • Image → Backend API                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ REST API Calls
                  ↓
┌─────────────────────────────────────────────────────────────┐
│  Vercel Serverless Functions                                 │
│                                                               │
│  ┌──────────────────────┐    ┌─────────────────────────┐   │
│  │  /api/session        │    │  /api/render            │   │
│  │  OpenAI Realtime API │    │  Google Gemini API      │   │
│  │  • WebRTC SDP        │    │  • Image analysis       │   │
│  │  • Session config    │    │  • Drawing commands     │   │
│  └──────────────────────┘    └─────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Characteristics

### Realtime Voice (OpenAI gpt-realtime)

| Metric | Value | Notes |
|--------|-------|-------|
| **Latency** | ~300-500ms | Voice input → audio response |
| **Audio Quality** | Excellent | Cedar/Marin voices, natural prosody |
| **Reliability** | GA | Production-ready, 99.9% uptime SLA |
| **Cost** | $32/$64 per 1M tokens | Input/output audio tokens |
| **Max Session** | Hours | Limited by connection stability |

### Whiteboard Rendering (Gemini 2.5 Flash)

| Metric | Value | Notes |
|--------|-------|-------|
| **Latency** | ~1-2 seconds | Image analysis → JSON response |
| **Accuracy** | High | Sept 2025 improvements to image understanding |
| **Cost** | Lower than GPT-4o | Flash variant optimized for speed/cost |
| **JSON Reliability** | Excellent | Native JSON mode, consistent schema |
| **Max Image Size** | Up to 20MB | More than enough for canvas screenshots |

---

## Environment Configuration

### Required API Keys

```bash
# .env.local

# OpenAI API Key - Required for realtime voice tutoring
# Get your key at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxxx

# Google AI API Key - Required for whiteboard rendering
# Get your key at: https://aistudio.google.com/apikey
GOOGLE_API_KEY=xxxxx
```

### API Access Requirements

#### OpenAI Account
- ✅ Active OpenAI account with payment method
- ✅ Access to Realtime API (gpt-realtime model)
- ✅ Sufficient credits/quota for development/testing
- 📍 Check access at: https://platform.openai.com/api-keys

#### Google AI Account
- ✅ Google account
- ✅ Access to Google AI Studio
- ✅ Gemini API enabled
- ✅ API key generated
- 📍 Create key at: https://aistudio.google.com/apikey

---

## Cost Analysis

### Per-Session Cost Estimates

#### Typical 10-Minute Tutoring Session

**Voice Interaction (OpenAI gpt-realtime):**
- Average: ~15,000 audio tokens (5 min student speech, 5 min AI response)
- Input cost: 15,000 * $32 / 1,000,000 = **$0.48**
- Output cost: 15,000 * $64 / 1,000,000 = **$0.96**
- **Total voice:** ~$1.44 per 10-minute session

**Whiteboard Rendering (Gemini 2.5 Flash):**
- Average: 5 rendering requests per session
- Per request: ~200 input tokens, 400 output tokens
- Cost per request: ~$0.001 (flash pricing)
- **Total whiteboard:** ~$0.005 per session

**Combined Cost per Session: ~$1.45**

### Monthly Cost Projections

| Usage Level | Sessions/Month | Monthly Cost |
|-------------|----------------|--------------|
| Light (50 sessions) | 50 | ~$72 |
| Medium (200 sessions) | 200 | ~$290 |
| Heavy (1000 sessions) | 1000 | ~$1,450 |
| Enterprise (10,000 sessions) | 10,000 | ~$14,500 |

**Note:** Costs can be reduced by:
- Using prompt caching (98.75% discount on repeated prompts)
- Optimizing session lengths
- Batching whiteboard updates
- Using gpt-realtime-mini for less complex interactions (70% cheaper)

---

## Future Model Considerations

### Potential Upgrades

#### When Gemini 2.5 Pro Becomes Available
- Consider for more complex whiteboard reasoning
- Trade-off: Higher cost vs. better accuracy
- **Recommendation:** A/B test against Flash

#### If Anthropic Releases Voice API
- Evaluate latency and quality vs. OpenAI
- Claude's instruction following is excellent
- **Recommendation:** Monitor for release announcements

#### GPT-5 (When Released)
- Likely improvements to reasoning and instruction following
- May offer better educational tutoring capabilities
- **Recommendation:** Evaluate upon release

### Alternative Voice Model

#### OpenAI gpt-realtime-mini
- **70% cheaper** than gpt-realtime
- Same voice quality and expressiveness
- Trade-off: Potentially less advanced reasoning
- **Use case:** Cost-sensitive deployments
- **Recommendation:** Test for non-complex lesson stages

---

## Monitoring & Observability

### Key Metrics to Track

#### Voice Quality (gpt-realtime)
- Average session duration
- Voice latency (time to first audio)
- Audio quality issues/errors
- Student satisfaction with AI responses
- Stage completion rates

#### Whiteboard Accuracy (gemini-2.5-flash)
- Drawing command generation time
- Command execution success rate
- Visual accuracy (human review)
- Student interaction with AI-generated content

#### Cost Monitoring
- Daily/monthly API spend by endpoint
- Cost per session
- Cost per student
- Optimization opportunities

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| Oct 13, 2025 | Initial model selection | Research of latest 2025 models |
| Oct 13, 2025 | Selected gpt-realtime | Best for low-latency voice interaction |
| Oct 13, 2025 | Selected gemini-2.5-flash | Best multimodal reasoning + cost |
| Oct 13, 2025 | Changed voice to 'cedar' | New expressive voice from Aug 2025 |

---

## References

### OpenAI Documentation
- [Introducing gpt-realtime (Aug 2025)](https://openai.com/index/introducing-gpt-realtime/)
- [Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Models Overview](https://platform.openai.com/docs/models)

### Google Gemini Documentation
- [Gemini 2.5 Flash Update (Sept 2025)](https://developers.googleblog.com/en/continuing-to-bring-you-our-latest-models-with-an-improved-gemini-2-5-flash-and-flash-lite-release/)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs/models)
- [Multimodal Capabilities](https://ai.google.dev/gemini-api/docs/vision)

### Research Conducted
- OpenAI models: October 13, 2025
- Google Gemini models: October 13, 2025
- Anthropic Claude models: October 13, 2025

---

**Document Owner:** AI Math Tutor Development Team
**Last Review:** October 13, 2025
**Next Review:** Quarterly or upon major model releases
