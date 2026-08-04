import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

type VenueId =
  | 'side_garden'
  | 'main_building_1f'
  | 'main_garden'
  | 'w_house'
  | 'campus_map'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PRESET_FILE: Record<VenueId, string> = {
  side_garden: 'side_garden.json',
  main_building_1f: 'main_building_1f.json',
  main_garden: 'main_garden.json',
  w_house: 'w_house.json',
  campus_map: 'campus_map.json',
}

function savePresetPlugin(): Plugin {
  return {
    name: 'save-preset',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/save-preset' || req.method !== 'POST') {
          next()
          return
        }
        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString()
        })
        req.on('end', () => {
          try {
            const { venueId, content } = JSON.parse(body) as {
              venueId: VenueId
              content: string
            }
            const file = PRESET_FILE[venueId]
            if (!file || typeof content !== 'string') {
              throw new Error('Invalid preset payload')
            }
            writeFileSync(resolve(__dirname, 'src/data/presets', file), content)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, file }))
          } catch (err) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // layout.dae-da.com 서브도메인 루트 배포 (경로 prefix 없음)
  base: '/',
  appType: 'spa',
  plugins: [react(), ...(mode === 'development' ? [savePresetPlugin()] : [])],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
}))
