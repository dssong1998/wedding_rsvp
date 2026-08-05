import Phaser from 'phaser'
import { LayoutScene } from './LayoutScene'
import type { LayoutDocument } from '../types/layout'

export function createPhaserGame(
  parent: HTMLElement,
  initialLayout: LayoutDocument,
  onSceneReady?: () => void,
): Phaser.Game {
  const width = parent.clientWidth || window.innerWidth
  const height = parent.clientHeight || window.innerHeight

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: '#0f172a',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: LayoutScene,
    callbacks: {
      preBoot: (game) => {
        game.registry.set('initialLayout', initialLayout)
        if (onSceneReady) game.registry.set('onSceneReady', onSceneReady)
      },
    },
  })
}
