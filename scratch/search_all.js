import fs from 'fs'
import path from 'path'

const srcDir = './src'
const keywords = ['framer-motion', 'countup', 'react-countup']

function checkFile(filePath) {
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return
  const code = fs.readFileSync(filePath, 'utf-8')
  keywords.forEach(kw => {
    if (code.toLowerCase().includes(kw)) {
      console.log(`FOUND '${kw}' in:`, filePath)
    }
  })
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else checkFile(full)
  }
}

walk(srcDir)
