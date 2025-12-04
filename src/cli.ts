#!/usr/bin/env node
import { program } from 'commander'
import { type RunOptions, validateFile } from './index.js'

program.name('ooxml-validator').argument('<file>', 'OOXML file to validate').option('--office-version <version>', 'Office version', 'Microsoft365').parse(process.argv)

const opts = program.opts<{ officeVersion: string }>()
const file = program.args[0]

validateFile(file, { officeVersion: opts.officeVersion as RunOptions['officeVersion'] })
	.then((res) => {
		console.log(JSON.stringify(res, null, 2))

		const ok = (res.ok as boolean | undefined) ?? false

		process.exit(ok ? 0 : 1)
	})
	.catch((err) => {
		console.error('[ooxml-validator] Failed to validate:', err instanceof Error ? err.message : String(err))
		process.exit(2)
	})
