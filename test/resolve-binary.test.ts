import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const TSX = fileURLToPath(new URL('../node_modules/.bin/tsx', import.meta.url))
const RESOLVE = fileURLToPath(new URL('../src/resolve-binary.js', import.meta.url))

/** process.platform is read at call time, so pretend to be another platform in a child process. */
async function resolveAs(platform: string, arch: string): Promise<{ path?: string; error?: string }> {
	const script = `
		Object.defineProperty(process, 'platform', { value: ${JSON.stringify(platform)} })
		Object.defineProperty(process, 'arch', { value: ${JSON.stringify(arch)} })
		import(${JSON.stringify(RESOLVE)}).then(({ resolveEmbeddedBinary }) => {
			try {
				console.log(JSON.stringify({ path: resolveEmbeddedBinary() }))
			} catch (e) {
				console.log(JSON.stringify({ error: e.message }))
			}
		})
	`
	const { stdout } = await execFileAsync(TSX, ['--eval', script])
	return JSON.parse(stdout)
}

test('each supported platform maps to its own package and executable name', async () => {
	const expected = [
		['darwin', 'arm64', '@xarsh/ooxml-validator-darwin-arm64/ooxml-validator'],
		['darwin', 'x64', '@xarsh/ooxml-validator-darwin-x64/ooxml-validator'],
		['linux', 'arm64', '@xarsh/ooxml-validator-linux-arm64/ooxml-validator'],
		['linux', 'x64', '@xarsh/ooxml-validator-linux-x64/ooxml-validator'],
		['win32', 'arm64', '@xarsh/ooxml-validator-win32-arm64/ooxml-validator.exe'],
		['win32', 'x64', '@xarsh/ooxml-validator-win32-x64/ooxml-validator.exe'],
	] as const

	for (const [platform, arch, specifier] of expected) {
		const { path, error } = await resolveAs(platform, arch)
		// The package for the host platform is installed; the other five are not. Either way the
		// specifier being resolved has to be the right one.
		assert.ok(path?.endsWith(specifier.replace('@xarsh/', '')) || error?.includes(specifier), `${platform}-${arch}: ${path ?? error}`)
	}
})

test('an unsupported platform says so by name', async () => {
	const { error } = await resolveAs('freebsd', 'ppc64')
	assert.match(String(error), /No embedded OOXML validator binary for platform: freebsd ppc64/)
})
