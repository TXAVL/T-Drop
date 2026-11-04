// Entry point for scripts/i18n-sync.ts (bundled on the fly with esbuild, no extra dependency).
const path = require('node:path')
const fs = require('node:fs')
const esbuild = require('esbuild')

const root = path.join(__dirname, '..')
// inside the project (out/ is gitignored) so the bundle can resolve node_modules
fs.mkdirSync(path.join(root, 'out'), { recursive: true })
const outfile = path.join(root, 'out', 'i18n-sync.cjs')
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'i18n-sync.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  absWorkingDir: root,
  logLevel: 'error'
})
require(outfile)
