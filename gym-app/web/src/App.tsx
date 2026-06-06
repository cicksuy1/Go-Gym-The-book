// Minimal state-based router: Dashboard ↔ Lesson(slug). The TutorPanel and the
// celebration overlay are persistent across both views.

import { useState } from 'react'
import { Dashboard } from './pages/Dashboard'
import { Lesson } from './pages/Lesson'
import { TutorPanel } from './components/TutorPanel'
import { Celebration } from './components/Celebration'
import { TutorProvider, useTutor } from './lib/TutorContext'

type Route = { name: 'dashboard' } | { name: 'lesson'; slug: string }

function Shell() {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' })
  const { celebrate, clearCelebrate } = useTutor()

  const activeSlug = route.name === 'lesson' ? route.slug : null

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200">
      <div className="min-w-0 flex-1 overflow-hidden">
        {route.name === 'dashboard' ? (
          <div className="h-full overflow-y-auto">
            <Dashboard
              onOpenLesson={(slug) => setRoute({ name: 'lesson', slug })}
            />
          </div>
        ) : (
          <Lesson
            slug={route.slug}
            onBack={() => setRoute({ name: 'dashboard' })}
            onCompleted={() => setRoute({ name: 'dashboard' })}
          />
        )}
      </div>

      <TutorPanel slug={activeSlug} />

      {celebrate && (
        <Celebration reason={celebrate} onDone={clearCelebrate} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <TutorProvider>
      <Shell />
    </TutorProvider>
  )
}
