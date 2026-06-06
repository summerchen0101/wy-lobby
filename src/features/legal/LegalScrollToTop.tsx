import { ArrowUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const SHOW_AFTER_SCROLL_PX = 240
const SCROLL_DURATION_MS = 260

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3
}

export function LegalScrollToTop() {
  const [visible, setVisible] = useState(false)
  const scrollFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_SCROLL_PX)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
    }
  }, [])

  const scrollToTop = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current)
    }

    const startY = window.scrollY
    if (startY <= 0) return

    const startTime = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / SCROLL_DURATION_MS, 1)
      const nextY = startY * (1 - easeOutCubic(progress))
      window.scrollTo(0, nextY)

      if (progress < 1) {
        scrollFrameRef.current = requestAnimationFrame(step)
      } else {
        scrollFrameRef.current = null
      }
    }

    scrollFrameRef.current = requestAnimationFrame(step)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      className="legal-page__scroll-top"
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <ArrowUp className="legal-page__scroll-top-icon" aria-hidden />
    </button>
  )
}
