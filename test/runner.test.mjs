import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { isValid, validateFile } from '../dist/src/index.js'

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url))
const VALID_PPTX = join(FIXTURES, 'minimal.pptx')

test('validateFile returns ok=true for a valid pptx', async () => {
	const result = await validateFile(VALID_PPTX)
	assert.equal(result.ok, true)
	assert.equal(result.errors.length, 0)
	assert.equal(result.file, VALID_PPTX)
})

test('isValid returns true for a valid pptx', async () => {
	assert.equal(await isValid(VALID_PPTX), true)
})

test('validateFile accepts an officeVersion option', async () => {
	const result = await validateFile(VALID_PPTX, { officeVersion: 'Office2019' })
	assert.equal(result.ok, true)
})

test('validateFile reports ok=false for a nonexistent file', async () => {
	const result = await validateFile('/no/such/file.pptx')
	assert.equal(result.ok, false)
	assert.ok(result.errors.length > 0)
	assert.equal(result.errors[0].errorType, 'Exception')
})

test('validateFile reports corruption for a non-zip file', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'ooxml-validator-test-'))
	const bogus = join(dir, 'bogus.pptx')
	writeFileSync(bogus, 'this is not a zip file')
	try {
		const result = await validateFile(bogus)
		assert.equal(result.ok, false)
		assert.ok(/corrupt/i.test(result.errors[0].description ?? ''))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
