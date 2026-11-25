import {useState} from 'react'

const storageKey = 'admitflow-theme'
const modes = ['system', 'light', 'dark'] as const
type Mode = typeof modes[number]

export function ThemeControl() {
  const [mode, setMode] = useState<Mode>(() => {
    const current = document.documentElement.dataset.theme
    return current === 'light' || current === 'dark' ? current : 'system'
  })

  return <label className="theme-control">
    <span className="sr-only">Appearance</span>
    <select value={mode} onChange={event => {
      const next = event.currentTarget.value as Mode
      setMode(next)
      document.documentElement.dataset.theme = next
      try { localStorage.setItem(storageKey, next) } catch { /* The choice still applies for this visit. */ }
    }}>
      {modes.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
    </select>
  </label>
}
