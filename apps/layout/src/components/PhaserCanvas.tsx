import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createPhaserGame } from '../phaser/createGame'
import type { LayoutDocument } from '../types/layout'

type Props = {
  initialLayout: LayoutDocument
  onReady?: () => void
}

export function PhaserCanvas({ initialLayout, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const initialRef = useRef(initialLayout)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const container = containerRef.current
    if (!container || gameRef.current) return

    gameRef.current = createPhaserGame(container, initialRef.current)
    onReadyRef.current?.()

    const ro = new ResizeObserver(() => {
      const game = gameRef.current
      if (!game || !containerRef.current) return
      game.scale.resize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight,
      )
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="phaser-host" aria-label="Hall layout canvas" />
}
