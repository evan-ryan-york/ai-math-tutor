import type { Lesson } from '../types'

export const lessons: Record<string, Lesson> = {
  'division-with-remainders-1': {
    lesson_id: 'division-with-remainders-1',
    title: 'Sharing Pizzas Fairly',
    learning_goal: 'Understand division with remainders and basic fractions',
    stages: [
      {
        stage_id: 1,
        problem: "I've got two friends coming over later today, I've got two pizzas, and each pizza is cut into 8 slices. The three of us want to share the two pizzas, but we're not sure how to do it so we all get the same amount of pizza.",
        visual_url: '/pizza-2-equal.png', // Placeholder
        learning_objective: 'Student recognizes that 16÷3 has a remainder',
        mastery_criteria: {
          description: "Student identifies there's one slice left over after dividing",
          indicators: [
            "Mentions 'leftover' or 'extra' or 'remaining'",
            'Calculates 5 slices per person',
            "Acknowledges 16 doesn't divide evenly by 3"
          ]
        },
        context_for_agent: `You're helping a student understand division with remainders using a real-world pizza scenario.

Current problem: 16 pizza slices, 3 people sharing equally.

Your goals:
- Guide student to discover that 16÷3 = 5 remainder 1
- Accept creative solutions (rock-paper-scissors, sharing the last slice)
- Celebrate the insight about remainders
- DO NOT rush to fractions yet - let them explore the remainder concept
- Use the whiteboard to visualize if helpful

Call stage_complete() when the student clearly understands there's one slice left over after equal distribution.`
      },
      {
        stage_id: 2,
        problem: "Actually, one pizza is cheese and the other is pepperoni. Everyone wants equal amounts of BOTH types. How does that change things?",
        visual_url: '/pizza-2-types.png', // Placeholder
        learning_objective: 'Student recognizes need to divide each pizza type separately',
        mastery_criteria: {
          description: 'Student understands each pizza must be divided by 3',
          indicators: [
            'Mentions dividing each pizza separately',
            'Realizes 8÷3 for each type',
            'Discusses fractions or partial slices'
          ]
        },
        context_for_agent: `Now introducing complexity: two different pizza types must be divided equally.

Current problem: 8 cheese slices ÷ 3 people, 8 pepperoni slices ÷ 3 people

Your goals:
- Help student realize this is actually two division problems
- Guide toward 2⅔ slices of each type per person
- Introduce fraction notation naturally if they discover splitting slices
- Use the whiteboard to visualize the division

Call stage_complete() when student grasps that each pizza needs separate equal division.`
      }
    ]
  }
}

export function getLesson(lessonId: string): Lesson | null {
  return lessons[lessonId] || null
}
