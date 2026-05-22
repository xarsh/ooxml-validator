#!/usr/bin/env node
// Bump version in root package.json (+ its 6 optionalDependencies values)
// and in the 6 sub-package package.json files. Usage:
//   node scripts/bump-version.mjs 0.3.0
import { readFileSync, writeFileSync } from 'node:fs'

const v = process.argv[2]
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v ?? '')) {
	console.error('Usage: node scripts/bump-version.mjs <X.Y.Z>')
	process.exit(1)
}

const rids = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-arm64', 'win32-x64']
const files = ['package.json', ...rids.map((r) => `npm/${r}/package.json`)]

for (const file of files) {
	const pkg = JSON.parse(readFileSync(file, 'utf8'))
	pkg.version = v
	if (pkg.optionalDependencies) {
		for (const k of Object.keys(pkg.optionalDependencies)) pkg.optionalDependencies[k] = v
	}
	writeFileSync(file, `${JSON.stringify(pkg, null, '\t')}\n`)
}

console.log(`Bumped to ${v}`)
