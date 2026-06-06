// Lesson page: rendered lesson markdown (left, readable column) + the docked
// Rep panel (right). Opens the recall Quiz modal when requested.

import { useState } from 'react'
import { Markdown } from '../components/Markdown'
import { RepPanel } from '../components/RepPanel'
import { Quiz } from '../components/Quiz'
import { useLesson } from '../lib/useGymData'

interface LessonProps {
  slug: string
  onBack: () => void
  /** Called after the module-complete gate passes (return to dashboard). */
  onCompleted: () => void
}

export function Lesson({ slug, onBack, onCompleted }: LessonProps) {
  const { lesson, loading, error } = useLesson(slug)
  const [quizOpen, setQuizOpen] = useState(false)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-6">
        <main className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-sm text-zinc-400 hover:text-emerald-400"
          >
            ← Back to dashboard
          </button>

          {loading && <p className="text-zinc-400">Loading lesson…</p>}
          {error && <p className="text-rose-400">{error}</p>}
          {lesson && <Markdown>{lesson.markdown}</Markdown>}
        </main>

        {lesson && (
          <aside className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-6">
              <RepPanel
                slug={slug}
                repFiles={lesson.repFiles}
                onStartQuiz={() => setQuizOpen(true)}
              />
            </div>
          </aside>
        )}
      </div>

      {quizOpen && lesson && (
        <Quiz
          slug={slug}
          questions={lesson.recallQuestions}
          onClose={() => setQuizOpen(false)}
          onCompleted={() => {
            setQuizOpen(false)
            onCompleted()
          }}
        />
      )}
    </div>
  )
}
