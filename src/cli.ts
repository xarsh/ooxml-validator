#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { OFFICE_VERSIONS, type OfficeVersion, validateFile } from './index.js'

const USAGE = `Usage: ooxml-validator <file> [--officeVersion <version>]

Validates one Office Open XML file and prints a single JSON object to stdout.

Options:
  --officeVersion <version>  ${OFFICE_VERSIONS.join(', ')} (default: Microsoft365)
  --help                     Print this message

Exit codes:
  0  file is valid
  1  file is invalid, or could not be opened (see errors[].errorType)
  2  usage error, or the validator could not be run`

function parseCliArgs() {
	return parseArgs({
		options: {
			officeVersion: { type: 'string' },
			help: { type: 'boolean' },
		},
		allowPositionals: true,
	})
}

async function main(): Promise<number> {
	let values: ReturnType<typeof parseCliArgs>['values']
	let positionals: string[]
	try {
		;({ values, positionals } = parseCliArgs())
	} catch (err) {
		console.error(err instanceof Error ? err.message : String(err))
		console.error(USAGE)
		return 2
	}

	if (values.help) {
		console.log(USAGE)
		return 0
	}

	if (positionals.length === 0) {
		console.error('Missing <file>.')
		console.error(USAGE)
		return 2
	}

	// Only the first file was ever validated; the rest were silently dropped, which reads as a
	// pass in CI. Reject instead so an over-eager shell glob can't hide an unvalidated file.
	if (positionals.length > 1) {
		console.error(`Expected exactly one file, got ${positionals.length}: ${positionals.join(', ')}`)
		console.error(USAGE)
		return 2
	}

	const officeVersion = values.officeVersion ?? 'Microsoft365'
	if (!(OFFICE_VERSIONS as readonly string[]).includes(officeVersion)) {
		console.error(`Invalid --officeVersion "${officeVersion}". Expected one of: ${OFFICE_VERSIONS.join(', ')}`)
		return 2
	}

	try {
		const res = await validateFile(positionals[0], { officeVersion: officeVersion as OfficeVersion })
		console.log(JSON.stringify(res, null, 2))
		return res.ok ? 0 : 1
	} catch (err) {
		console.error('[ooxml-validator] Failed to validate:', err instanceof Error ? err.message : String(err))
		return 2
	}
}

// A reader that goes away early (`... | head -1`) is not an error worth a stack trace. Swallow it
// without touching the exit code: forcing one here would report an invalid document as a pass.
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
	if (err.code !== 'EPIPE') throw err
})

// Set exitCode rather than calling process.exit(): stdout is asynchronous when it is a pipe, and
// exiting outright discards anything past the ~64 KB pipe buffer, truncating the JSON mid-object.
process.exitCode = await main()
