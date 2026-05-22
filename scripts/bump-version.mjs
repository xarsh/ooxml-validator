#!/usr/bin/env node
//
// Bump the version of the root package and all 6 platform sub-packages in lock-step.
//
// Usage:
//   node scripts/bump-version.mjs 0.3.0
//
// Updates:
//   - package.json: .version + .optionalDependencies[*] values
//   - npm/<rid>/package.json: .version (× 6)
//
// Does NOT touch package-lock.json — the new sub-package versions don't exist on
// npm yet at bump time, so a strict `npm install` would fail. Run `npm install`
// locally after the release publishes if you want the lock back in sync.
//
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

const RIDS = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-arm64', 'win32-x64']
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/

const newVersion = process.argv[2]
if (!newVersion || !SEMVER.test(newVersion)) {
	console.error('Usage: node scripts/bump-version.mjs <X.Y.Z[-prerelease]>')
	process.exit(1)
}

function rewriteJson(path, mutate) {
	const original = readFileSync(path, 'utf8')
	const data = JSON.parse(original)
	mutate(data)
	const trailingNewline = original.endsWith('\n') ? '\n' : ''
	writeFileSync(path, `${JSON.stringify(data, null, '\t')}${trailingNewline}`)
}

const rootPath = join(repoRoot, 'package.json')
rewriteJson(rootPath, (pkg) => {
	pkg.version = newVersion
	for (const rid of RIDS) {
		const dep = `@xarsh/ooxml-validator-${rid}`
		if (!(dep in pkg.optionalDependencies)) {
			throw new Error(`Missing optionalDependency entry for ${dep} in root package.json`)
		}
		pkg.optionalDependencies[dep] = newVersion
	}
})
console.log(`✓ package.json → ${newVersion}`)

for (const rid of RIDS) {
	const path = join(repoRoot, 'npm', rid, 'package.json')
	rewriteJson(path, (pkg) => {
		pkg.version = newVersion
	})
	console.log(`✓ npm/${rid}/package.json → ${newVersion}`)
}

console.log(`\nNext steps:`)
console.log(`  git add -A && git commit -m "${newVersion}"`)
console.log(`  git tag -a v${newVersion} -m "${newVersion}"`)
console.log(`  git push --follow-tags`)
