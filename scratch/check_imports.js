import fs from 'fs'
import path from 'path'
import { transformSync } from 'esbuild'

const srcDir = './src'

function checkFile(filePath) {
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return
  const code = fs.readFileSync(filePath, 'utf-8')
  try {
    transformSync(code, { loader: filePath.endsWith('.jsx') ? 'jsx' : 'js' })
    console.log('✓ OK:', filePath)
  } catch (err) {
    console.error('❌ ERROR in file:', filePath, '\n', err.message)
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else checkFile(full)
  }
}

walk(srcDir)
