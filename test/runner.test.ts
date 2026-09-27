import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { isValid, OFFICE_VERSIONS, validateFile } from '../src/index.js'
import { MANY_ERRORS_DOCX, OFFICE2010_ONLY_DOCX, VALID_PPTX, validatorBinary } from './helpers.js'

test('validateFile returns ok=true for a valid pptx', async () => {
	const result = await validateFile(VALID_PPTX)
	assert.equal(result.ok, true)
	assert.equal(result.errors.length, 0)
	assert.equal(result.file, VALID_PPTX)
})

test('isValid returns true for a valid pptx', async () => {
	assert.equal(await isValid(VALID_PPTX), true)
})

test('officeVersion selects the schema the file is checked against', async () => {
	assert.equal(await isValid(OFFICE2010_ONLY_DOCX, { officeVersion: 'Office2007' }), false)
	assert.equal(await isValid(OFFICE2010_ONLY_DOCX, { officeVersion: 'Office2010' }), true)
	assert.equal(await isValid(OFFICE2010_ONLY_DOCX), true, 'default is Microsoft365')
})

test('every documented office version reaches the validator', async () => {
	for (const version of OFFICE_VERSIONS) {
		assert.equal(await isValid(OFFICE2010_ONLY_DOCX, { officeVersion: version }), version !== 'Office2007', version)
	}
})

// The binary used to read any name it did not recognise as Microsoft365, so a typo from
// untyped JS silently validated against the wrong schema and reported ok=true.
test('validateFile rejects an officeVersion it does not know', async () => {
	for (const bad of ['office2007', 'Office2018', '1', 'Office2007,Office2010', '']) {
		await assert.rejects(
			// biome-ignore lint/suspicious/noExplicitAny: the point is what untyped callers can pass
			() => validateFile(OFFICE2010_ONLY_DOCX, { officeVersion: bad as any }),
			(err: Error) => err instanceof TypeError && /Invalid officeVersion/.test(err.message),
			bad,
		)
	}
})

test('validation errors use the key names the README documents', async () => {
	const result = await validateFile(OFFICE2010_ONLY_DOCX, { officeVersion: 'Office2007' })
	assert.equal(result.ok, false)
	const [error] = result.errors
	assert.deepEqual(Object.keys(error).sort(), ['description', 'errorType', 'id', 'path', 'xPath'])
	assert.equal(error.errorType, 'Schema')
	assert.equal(error.path, '/word/document.xml')
	assert.match(String(error.xPath), /^\/w:document/)
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

test('validateFile reports an unsupported extension rather than throwing', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'ooxml-validator-test-'))
	const txt = join(dir, 'notes.txt')
	writeFileSync(txt, 'hello')
	try {
		const result = await validateFile(txt)
		assert.equal(result.ok, false)
		assert.equal(result.errors[0].errorType, 'Exception')
		assert.match(result.errors[0].description ?? '', /Unsupported extension/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('paths with spaces and non-ASCII characters are passed through unmangled', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'ooxml validator test '))
	const file = join(dir, 'ドキュメント 1.pptx')
	copyFileSync(VALID_PPTX, file)
	try {
		const result = await validateFile(file)
		assert.equal(result.ok, true)
		assert.equal(result.file, file)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// OOXML_VALIDATOR_CLI used to be split on spaces, so the documented
// `export OOXML_VALIDATOR_CLI="/path/to/ooxml-validator"` failed on any path containing one.
test('OOXML_VALIDATOR_CLI works when the path contains spaces', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'ooxml validator bin '))
	const copied = join(dir, 'ooxml validator')
	copyFileSync(validatorBinary(), copied)
	const previous = process.env.OOXML_VALIDATOR_CLI
	process.env.OOXML_VALIDATOR_CLI = copied
	try {
		assert.equal(await isValid(VALID_PPTX), true)
	} finally {
		if (previous === undefined) delete process.env.OOXML_VALIDATOR_CLI
		else process.env.OOXML_VALIDATOR_CLI = previous
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a large result is read back in full', async () => {
	const result = await validateFile(MANY_ERRORS_DOCX, { officeVersion: 'Office2007' })
	assert.equal(result.errors.length, 400)
})
