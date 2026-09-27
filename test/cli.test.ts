import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const CLI = fileURLToPath(new URL('../dist/src/cli.js', import.meta.url))
const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url))
const VALID_PPTX = join(FIXTURES, 'minimal.pptx')

async function runCli(args: string[]) {
	try {
		const { stdout, stderr } = await execFileAsync(process.execPath, [CLI, ...args])
		return { stdout, stderr, code: 0 }
	} catch (err) {
		const e = err as { stdout?: string; stderr?: string; code?: number }
		return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 }
	}
}

test('cli accepts --officeVersion', async () => {
	const { stdout, code } = await runCli([VALID_PPTX, '--officeVersion', 'Office2019'])
	assert.equal(code, 0)
	assert.equal(JSON.parse(stdout).ok, true)
})

test('cli rejects an unknown flag with a usage message instead of crashing', async () => {
	const { stderr, code } = await runCli([VALID_PPTX, '--office-version', 'Office2019'])
	assert.equal(code, 2)
	assert.match(stderr, /Usage: ooxml-validator/)
	assert.doesNotMatch(stderr, /at Object/)
})

test('cli rejects an invalid --officeVersion value', async () => {
	const { stderr, code } = await runCli([VALID_PPTX, '--officeVersion', 'Office2018'])
	assert.equal(code, 2)
	assert.match(stderr, /Invalid --officeVersion "Office2018"/)
})

test('cli prints usage and exits 2 when no file is given', async () => {
	const { stderr, code } = await runCli([])
	assert.equal(code, 2)
	assert.match(stderr, /Usage: ooxml-validator/)
})
