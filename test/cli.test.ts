import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { OFFICE_VERSIONS } from '../src/index.js'
import { MANY_ERRORS_DOCX, OFFICE2010_ONLY_DOCX, runCli, VALID_PPTX } from './helpers.js'

test('cli accepts --officeVersion', async () => {
	const { stdout, code } = await runCli([VALID_PPTX, '--officeVersion', 'Office2019'])
	assert.equal(code, 0)
	assert.equal(JSON.parse(stdout).ok, true)
})

// The flag used to be documented as --office-version while the code read --officeVersion. Nothing
// caught it because no test ran the CLI against a file whose verdict depends on the version.
test('--officeVersion changes the verdict, so it really reaches the validator', async () => {
	const as2007 = await runCli([OFFICE2010_ONLY_DOCX, '--officeVersion', 'Office2007'])
	assert.equal(as2007.code, 1)
	assert.equal(JSON.parse(as2007.stdout).ok, false)

	const as2010 = await runCli([OFFICE2010_ONLY_DOCX, '--officeVersion', 'Office2010'])
	assert.equal(as2010.code, 0)
	assert.equal(JSON.parse(as2010.stdout).ok, true)
})

test('every documented office version is accepted and validates as itself', async () => {
	for (const version of OFFICE_VERSIONS) {
		const { stdout, stderr, code } = await runCli([OFFICE2010_ONLY_DOCX, '--officeVersion', version])
		assert.equal(code, version === 'Office2007' ? 1 : 0, `${version}: ${stderr}`)
		assert.equal(JSON.parse(stdout).ok, version !== 'Office2007', version)
	}
})

test('cli rejects an unknown flag with a usage message instead of crashing', async () => {
	const { stderr, code } = await runCli([VALID_PPTX, '--office-version', 'Office2019'])
	assert.equal(code, 2)
	assert.match(stderr, /Usage: ooxml-validator/)
	assert.doesNotMatch(stderr, /at Object/)
})

// A misspelled version must not quietly become Microsoft365 and report the file as valid.
test('cli rejects an invalid --officeVersion value', async () => {
	for (const bad of ['Office2018', 'office2007', 'OFFICE2007', '1', 'Office2007,Office2010', 'None']) {
		const { stdout, stderr, code } = await runCli([OFFICE2010_ONLY_DOCX, '--officeVersion', bad])
		assert.equal(code, 2, bad)
		assert.match(stderr, /Invalid --officeVersion/)
		assert.equal(stdout, '', bad)
	}
})

test('cli prints usage and exits 2 when no file is given', async () => {
	const { stderr, code } = await runCli([])
	assert.equal(code, 2)
	assert.match(stderr, /Usage: ooxml-validator/)
})

// `ooxml-validator ./*.docx` used to validate the first match and silently ignore the rest,
// which reads as a pass in CI.
test('cli refuses more than one file instead of silently ignoring the rest', async () => {
	const { stdout, stderr, code } = await runCli([VALID_PPTX, OFFICE2010_ONLY_DOCX])
	assert.equal(code, 2)
	assert.match(stderr, /Expected exactly one file, got 2/)
	assert.equal(stdout, '')
})

test('--help goes to stdout and exits 0', async () => {
	const { stdout, code } = await runCli(['--help'])
	assert.equal(code, 0)
	assert.match(stdout, /Usage: ooxml-validator/)
	assert.match(stdout, /Exit codes:/)
})

test('cli exits 1 and reports errorType Exception for a file it cannot open', async () => {
	const { stdout, stderr, code } = await runCli(['/no/such/file.docx'])
	assert.equal(code, 1)
	assert.equal(stderr, '')
	const res = JSON.parse(stdout)
	assert.equal(res.ok, false)
	assert.equal(res.errors[0].errorType, 'Exception')
})

test('stdout carries only the JSON object; diagnostics go to stderr', async () => {
	const { stdout, stderr } = await runCli([OFFICE2010_ONLY_DOCX, '--officeVersion', 'Office2007'])
	assert.equal(stderr, '')
	assert.doesNotThrow(() => JSON.parse(stdout))
})

// process.exit() right after console.log() drops everything past the ~64 KB pipe buffer, so a
// document with a few hundred errors used to emit JSON that was cut off mid-object.
test('large output survives a pipe intact', async () => {
	const tsx = fileURLToPath(new URL('../node_modules/.bin/tsx', import.meta.url))
	const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url))

	const { stdout, code } = await new Promise<{ stdout: string; code: number | null }>((resolve, reject) => {
		const child = spawn(tsx, [cli, MANY_ERRORS_DOCX, '--officeVersion', 'Office2007'], { stdio: ['ignore', 'pipe', 'inherit'] })
		let out = ''
		child.stdout.setEncoding('utf8')
		child.stdout.on('data', (d) => {
			out += d
		})
		child.on('error', reject)
		child.on('close', (c) => resolve({ stdout: out, code: c }))
	})

	assert.ok(stdout.length > 65536, `expected output past the pipe buffer, got ${stdout.length} bytes`)
	const res = JSON.parse(stdout)
	assert.equal(res.errors.length, 400)
	assert.equal(code, 1)
})

// EPIPE must not rewrite the verdict: `ooxml-validator bad.docx | head -1` under `set -o pipefail`
// still has to report the document as invalid.
test('a reader that closes early keeps the exit code and stays quiet', async () => {
	const tsx = fileURLToPath(new URL('../node_modules/.bin/tsx', import.meta.url))
	const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url))

	const { stderr, code } = await new Promise<{ stderr: string; code: number | null }>((resolve, reject) => {
		// The fixture is well past the pipe buffer, so the write cannot finish before the close.
		const child = spawn(tsx, [cli, MANY_ERRORS_DOCX, '--officeVersion', 'Office2007'], { stdio: ['ignore', 'pipe', 'pipe'] })
		let err = ''
		child.stderr.setEncoding('utf8')
		child.stderr.on('data', (d) => {
			err += d
		})
		child.stdout.once('data', () => child.stdout.destroy())
		child.on('error', reject)
		child.on('close', (c) => resolve({ stderr: err, code: c }))
	})

	assert.equal(code, 1)
	assert.equal(stderr, '')
})
