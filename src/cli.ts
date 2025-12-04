#!/usr/bin/env node
import { program } from 'commander'
import { validateFile } from './index.js'

program
	.name('ooxml-validate')
	.argument('<file>', 'OOXML file to validate')
	.option('--office-version <version>', 'Office version', 'Microsoft365')
	.option('--json', 'Output JSON', false)
	.parse(process.argv)

const opts = program.opts<{
	officeVersion: string
	json: boolean
}>()

const file = program.args[0]

validateFile(file, { officeVersion: opts.officeVersion as any })
	.then((res) => {
		if (opts.json) {
			console.log(JSON.stringify(res, null, 2))
			process.exit(res.ok ? 0 : 1)
		}

		if (res.ok) {
			console.log(`OK: ${res.file}`)
			process.exit(0)
		} else {
			console.log(`FAIL: ${res.file}`)
			for (const e of res.errors) {
				// 実際の JSON に合わせてキー名は調整してね
				console.log(`  - ${e.description ?? e.Description ?? 'Error'}`)
				if (e.XPath || (e as any).xpath) {
					console.log(`    XPath: ${e.XPath ?? (e as any).xpath}`)
				}
			}
			process.exit(1)
		}
	})
	.catch((err) => {
		console.error(err instanceof Error ? err.message : String(err))
		process.exit(2)
	})
