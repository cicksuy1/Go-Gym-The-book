// Minimal state-based router: Dashboard ↔ Session(slug). The celebration
// overlay is persistent; module_complete fires it, then returns to Dashboard.

import { useEffect, useState } from 'react'
import { Dashboard } from './pages/Dashboard'
import { Session } from './pages/Session'
import { Celebration } from './components/Celebration'
import { TutorProvider, useTutor } from './lib/TutorContext'
import { api } from './lib/api'

type Route =
  | { name: 'dashboard' }
  | { name: 'session'; slug: string; title: string }

function Shell() {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' })
  const { celebrate, clearCelebrate, resetTranscript, onModuleComplete } =
    useTutor()

  const openModule = (slug: string, title: string): void => {
    resetTranscript()
    void api.sessionStart(slug)
    setRoute({ name: 'session', slug, title })
  }

  // When the conductor marks a module ✅, celebrate then drop back to the map.
  useEffect(
    () =>
      onModuleComplete(() => {
        // Celebration is already triggered by the celebrate event; once the
        // learner dismisses it (or it times out) we return to the dashboard.
        setRoute({ name: 'dashboard' })
      }),
    [onModuleComplete],
  )

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200">
      {route.name === 'dashboard' ? (
        <div className="h-full overflow-y-auto">
          <Dashboard onOpenModule={openModule} />
        </div>
      ) : (
        <Session
          slug={route.slug}
          title={route.title}
          onBack={() => setRoute({ name: 'dashboard' })}
        />
      )}

      {celebrate && <Celebration reason={celebrate} onDone={clearCelebrate} />}
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
