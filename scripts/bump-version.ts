#!/usr/bin/env tsx
// Bump version in root package.json (+ its 6 optionalDependencies values),
// the 6 sub-package package.json files, and the root package-lock.json so that
// `npm ci` stays valid after the bump. Usage:
//   tsx scripts/bump-version.ts 0.3.0
import { readFileSync, writeFileSync } from 'node:fs'

type PackageJson = {
	version: string
	optionalDependencies?: Record<string, string>
}

type PackageLock = {
	version: string
	packages: Record<string, { version?: string; optionalDependencies?: Record<string, string> }>
}

const v = process.argv[2]
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v ?? '')) {
	console.error('Usage: tsx scripts/bump-version.ts <X.Y.Z>')
	process.exit(1)
}

const rids = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-arm64', 'win32-x64']
const files = ['package.json', ...rids.map((r) => `npm/${r}/package.json`)]

for (const file of files) {
	const pkg = JSON.parse(readFileSync(file, 'utf8')) as PackageJson
	pkg.version = v
	if (pkg.optionalDependencies) {
		for (const k of Object.keys(pkg.optionalDependencies)) pkg.optionalDependencies[k] = v
	}
	writeFileSync(file, `${JSON.stringify(pkg, null, '\t')}\n`)
}

const lockPath = 'package-lock.json'
const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as PackageLock
lock.version = v
const root = lock.packages['']
if (root) {
	root.version = v
	if (root.optionalDependencies) {
		for (const k of Object.keys(root.optionalDependencies)) root.optionalDependencies[k] = v
	}
}
writeFileSync(lockPath, `${JSON.stringify(lock, null, '\t')}\n`)

console.log(`Bumped to ${v}`)
