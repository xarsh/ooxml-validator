#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { type RunOptions, validateFile } from './index.js'

const { values, positionals } = parseArgs({
	options: {
		officeVersion: {
			type: 'string',
		},
	},
	allowPositionals: true,
})

if (positionals.length === 0) {
	console.error('Usage: ooxml-validator <file> [--office-version <version>]')
	process.exit(2)
}

const officeVersion = values.officeVersion ?? 'Microsoft365'
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
