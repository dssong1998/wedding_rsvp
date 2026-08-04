#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '../src')
const forbidden = [
  /Export JSON/i,
  /Copy share/i,
  /play mode/i,
  /\bTODO\b/,
  /\bFIXME\b/,
  /stamp mode/i,
  /P0\b/,
  /레퍼런스 준비/,
]

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else if (/\.(tsx?|html)$/.test(name)) files.push(p)
  }
  return files
}

let failed = false
for (const file of walk(root)) {
  const text = readFileSync(file, 'utf8')
  for (const re of forbidden) {
    if (re.test(text)) {
      console.error(`FAIL ${file}: matches ${re}`)
      failed = true
    }
  }
}

const html = readFileSync(join(import.meta.dirname, '../index.html'), 'utf8')
if (!html.includes('lang="ko"')) {
  console.error('FAIL index.html: missing lang=ko')
  failed = true
}

if (failed) process.exit(1)
console.log('audit:copy OK')
