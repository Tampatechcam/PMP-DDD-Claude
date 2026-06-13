// Intentionally empty.
//
// The mobile top bar is no longer a standalone component — the Shell
// component (./Shell.tsx) renders the responsive top bar + drawer
// directly. Keeping this file as a placeholder so the import graph
// has somewhere to point if a future feature wants to lift the bar
// out again, and so a stale local clone of the repo doesn't break.
export {}
