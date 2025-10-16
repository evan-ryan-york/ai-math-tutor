import type { Lesson } from '../types'

// Import lesson JSON files dynamically
import divisionWithRemainders1 from './lessons/division-with-remainders-1/lesson.json'

// Import images for division-with-remainders-1
import twoPizzasImg from './lessons/division-with-remainders-1/images/2-pizzas.jpg'
import browniePanImg from './lessons/division-with-remainders-1/images/brownie-pan.jpg'

// Cache for loaded lessons with processed image paths
const lessonsCache: Record<string, Lesson> = {}

// Map of lesson images
const lessonImages: Record<string, Record<string, string>> = {
  'division-with-remainders-1': {
    './images/2-pizzas.jpg': twoPizzasImg,
    './images/brownie-pan.jpg': browniePanImg
  }
}

/**
 * Loads a lesson by ID from JSON files.
 * Converts relative image_path to visual_url for runtime use.
 */
export function getLesson(lessonId: string): Lesson | null {
  // Check cache first
  if (lessonsCache[lessonId]) {
    return lessonsCache[lessonId]
  }

  // Map lesson IDs to imported JSON
  const lessonData: Record<string, any> = {
    'division-with-remainders-1': divisionWithRemainders1
  }

  const rawLesson = lessonData[lessonId]
  if (!rawLesson) {
    console.error(`Lesson not found: ${lessonId}`)
    return null
  }

  // Get image mappings for this lesson
  const imageMap = lessonImages[lessonId] || {}

  // Process the lesson: convert image_path to visual_url
  const processedLesson: Lesson = {
    ...rawLesson,
    stages: rawLesson.stages.map((stage: any) => ({
      ...stage,
      // Look up the imported image URL from the map
      visual_url: stage.image_path && imageMap[stage.image_path]
        ? imageMap[stage.image_path]
        : undefined
    }))
  }

  // Cache the processed lesson
  lessonsCache[lessonId] = processedLesson

  return processedLesson
}
