# Contributing to AI Math Tutor

Thank you for your interest in contributing to the AI Math Tutor project! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Read the Documentation**
   - Review [README.md](./README.md) for setup instructions
   - Check [claude.md](./claude.md) for project context
   - Read through [docs/ai/](./docs/ai/) for architecture details

2. **Set Up Your Environment**
   ```bash
   git clone <repository-url>
   cd ai-math-tutor
   pnpm install
   cp .env.example .env.local
   # Add your API keys to .env.local
   pnpm run dev
   ```

3. **Check Node.js Version**
   - This project requires Node.js 18+
   - Use the version specified in `.nvmrc`: `nvm use`

## Development Workflow

### Branch Strategy

- **`main`**: Stable, production-ready code
- **Feature branches**: `feature/your-feature-name`
- **Bug fixes**: `fix/issue-description`
- **Documentation**: `docs/what-you-are-documenting`

### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow existing code style and patterns
   - Add comments for complex logic
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   # Build check
   pnpm run build

   # Lint check
   pnpm run lint

   # Manual testing
   pnpm run dev
   ```

4. **Commit Your Changes**
   - Use clear, descriptive commit messages
   - Follow conventional commits format (recommended):
     ```
     feat: add new lesson for fractions
     fix: resolve VAD sensitivity issue
     docs: update README with deployment steps
     refactor: simplify stage progression logic
     ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any` when possible)
- Export types from `src/types/index.ts`

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use meaningful prop names

### File Organization

```
src/
├── components/      # React UI components
├── data/           # Static data (lessons, etc.)
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── App.tsx         # Main application logic
```

### Naming Conventions

- **Components**: PascalCase (e.g., `VoiceInterface.tsx`)
- **Functions**: camelCase (e.g., `handleStageComplete`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINT`)
- **Types/Interfaces**: PascalCase (e.g., `SessionState`)

## Testing Guidelines

While automated tests are not yet implemented, please manually verify:

1. **Voice Session**
   - Connection establishes successfully
   - AI tutor speaks without interrupting itself
   - User speech is detected correctly
   - Stage transitions work

2. **Whiteboard**
   - Drawing works smoothly
   - Clear button functions
   - AI can see drawings (check console logs)

3. **API Endpoints**
   - `/api/session` returns valid SDP
   - `/api/render` generates drawing commands

4. **Build & Deploy**
   - `pnpm run build` succeeds without errors
   - No TypeScript errors
   - No ESLint warnings

## Adding New Lessons

1. Edit `src/data/lessons.ts`
2. Follow the existing lesson structure:
   ```typescript
   {
     lesson_id: 'unique-id',
     title: 'Lesson Title',
     learning_goal: 'What students learn',
     stages: [
       {
         stage_id: 1,
         problem: 'Problem description',
         learning_objective: 'Stage objective',
         mastery_criteria: {
           description: 'How to assess mastery',
           indicators: ['Signal 1', 'Signal 2']
         },
         context_for_agent: 'AI tutor instructions'
       }
     ]
   }
   ```
3. Test thoroughly with voice interaction
4. Document any special behaviors

## Common Tasks

### Adjusting VAD Settings

Edit `src/App.tsx` around line 92:
```typescript
turn_detection: {
  type: 'server_vad',
  threshold: 0.6,           // 0.0-1.0 (higher = less sensitive)
  prefix_padding_ms: 300,   // Capture before speech
  silence_duration_ms: 1000 // Wait before turn ends
}
```

### Modifying AI Tutor Behavior

- **Global behavior**: Edit system instructions in `src/App.tsx:88`
- **Stage-specific**: Edit `context_for_agent` in lesson definition

### Adding New Function Tools

1. Define function in `sendSessionUpdate()` in `src/App.tsx`
2. Add handler in `handleFunctionCall()`
3. Test via console logs to verify AI calls it correctly

## Pull Request Guidelines

### PR Title Format

- `feat: description` - New feature
- `fix: description` - Bug fix
- `docs: description` - Documentation only
- `refactor: description` - Code refactoring
- `chore: description` - Build/tooling changes

### PR Description Should Include

- **What**: What changes were made
- **Why**: Why these changes are needed
- **Testing**: How you tested the changes
- **Screenshots**: If UI changes are involved
- **Breaking Changes**: If any (and migration steps)

### PR Checklist

- [ ] Code builds without errors (`pnpm run build`)
- [ ] No ESLint warnings
- [ ] Manually tested all affected features
- [ ] Documentation updated (if needed)
- [ ] No secrets or API keys committed
- [ ] `.env.local` not included in commits

## Reporting Issues

When reporting bugs, please include:

1. **Environment**
   - Node.js version
   - Browser and version
   - Operating system

2. **Steps to Reproduce**
   - Exact steps to trigger the issue
   - Expected behavior
   - Actual behavior

3. **Logs**
   - Browser console errors
   - Network tab screenshots (redact API keys!)
   - Relevant code snippets

4. **Additional Context**
   - Screenshots or screen recordings
   - Any workarounds you found

## Code of Conduct

- Be respectful and professional
- Provide constructive feedback
- Help others learn and grow
- Focus on the code, not the person

## Questions?

- Check existing issues and discussions
- Review project documentation
- Ask in PR comments for specific questions
- Reach out to maintainers for broader questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see [LICENSE](./LICENSE)).

---

**Thank you for contributing to AI Math Tutor!** 🎉
