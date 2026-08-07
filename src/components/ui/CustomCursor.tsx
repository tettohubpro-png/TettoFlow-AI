import { useEffect, useRef } from 'react'

/** Cursor custom estilo Yelu — só em ponteiro fino (desktop) */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    if (!fine) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let x = 0
    let y = 0
    let rx = 0
    let ry = 0
    let visible = false
    let raf = 0

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      if (!visible) {
        visible = true
        dot.style.opacity = '1'
        ring.style.opacity = '1'
      }
    }

    const onLeave = () => {
      visible = false
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }

    const tick = () => {
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      dot.style.transform = `translate(${x - 2.5}px, ${y - 2.5}px)`
      ring.style.transform = `translate(${rx - 11}px, ${ry - 11}px)`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="tf-cursor-dot" aria-hidden />
      <div ref={ringRef} className="tf-cursor-ring" aria-hidden />
    </>
  )
}
