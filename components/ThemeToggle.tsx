'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10 text-gray-400 hover:text-white"
    >
      {dark ? (
        /* Sun */
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.78a1 1 0 011.42 1.42l-.7.7a1 1 0 11-1.42-1.42l.7-.7zM18 9a1 1 0 110 2h-1a1 1 0 110-2h1zM4.22 15.78a1 1 0 001.42 1.42l.7-.7a1 1 0 00-1.42-1.42l-.7.7zM10 15a5 5 0 100-10 5 5 0 000 10zm0-8a3 3 0 110 6 3 3 0 010-6zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm12.78 4.22a1 1 0 011.42 0l.7.7a1 1 0 01-1.42 1.42l-.7-.7a1 1 0 010-1.42zM11 17a1 1 0 11-2 0v-1a1 1 0 112 0v1zM5.78 3.78a1 1 0 010 1.42l-.7.7A1 1 0 013.66 4.48l.7-.7a1 1 0 011.42 0z"/>
        </svg>
      ) : (
        /* Moon */
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
        </svg>
      )}
    </button>
  )
}
