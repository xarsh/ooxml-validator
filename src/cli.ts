#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { type RunOptions, validateFile } from './index.js'

const OFFICE_VERSIONS = ['Office2007', 'Office2010', 'Office2013', 'Office2016', 'Office2019', 'Office2021', 'Microsoft365'] as const

const USAGE = 'Usage: ooxml-validator <file> [--officeVersion <version>]'

function parseCliArgs() {
	try {
		return parseArgs({
			options: {
				officeVersion: {
					type: 'string',
				},
			},
			allowPositionals: true,
		})
	} catch (err) {
		console.error(err instanceof Error ? err.message : String(err))
		console.error(USAGE)
		process.exit(2)
	}
}

const { values, positionals } = parseCliArgs()

if (positionals.length === 0) {
	console.error(USAGE)
	process.exit(2)
}

const officeVersion = values.officeVersion ?? 'Microsoft365'
if (!(OFFICE_VERSIONS as readonly string[]).includes(officeVersion)) {
	console.error(`Invalid --officeVersion "${officeVersion}". Expected one of: ${OFFICE_VERSIONS.join(', ')}`)
	process.exit(2)
}

const file = positionals[0]

validateFile(file, { officeVersion: officeVersion as RunOptions['officeVersion'] })
	.then((res) => {
		console.log(JSON.stringify(res, null, 2))
		const ok = (res.ok as boolean | undefined) ?? false
		process.exit(ok ? 0 : 1)
	})
	.catch((err) => {
		console.error('[ooxml-validator] Failed to validate:', err instanceof Error ? err.message : String(err))
		process.exit(2)
	})
