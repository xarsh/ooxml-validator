import { spawn } from 'node:child_process'

import { resolveEmbeddedBinary } from './resolve-binary.js'

export interface ValidationError {
	description?: string
	path?: string
	xpath?: string
	[key: string]: unknown
}

export interface RunOptions {
	officeVersion?: 'Office2007' | 'Office2010' | 'Office2013' | 'Office2016' | 'Office2019' | 'Office2021' | 'Microsoft365'
	recursive?: boolean
	all?: boolean
	xmlOutput?: boolean
}

function getValidatorCommand(): { cmd: string; args: string[] } {
	const env = process.env.OOXML_VALIDATOR_CLI
	if (env && env.trim().length > 0) {
		const parts = env.split(' ')
		const cmd = parts[0]
		const baseArgs = parts.slice(1)
		return { cmd, args: baseArgs }
	}

	const embedded = resolveEmbeddedBinary()
	return { cmd: embedded, args: [] }
}

export function runValidator(fileOrDir: string, options: RunOptions = {}): Promise<ValidationError[]> {
	const { cmd, args } = getValidatorCommand()

	const cliArgs = [...args]

	cliArgs.push(fileOrDir)

	if (options.officeVersion) {
		cliArgs.push(options.officeVersion)
	}

	if (options.xmlOutput) cliArgs.push('--xml')
	if (options.recursive) cliArgs.push('--recursive')
	if (options.all) cliArgs.push('--all')

	return new Promise((resolve, reject) => {
		const child = spawn(cmd, cliArgs, { stdio: ['ignore', 'pipe', 'pipe'] })

		let stdout = ''
		let stderr = ''

		child.stdout.on('data', (d) => {
			stdout += d.toString()
		})
		child.stderr.on('data', (d) => {
			stderr += d.toString()
		})

		child.on('error', (err) => {
			reject(new Error(`Failed to spawn OOXML validator: ${err.message}`))
		})

		child.on('close', (code) => {
			if (code !== 0) {
				return reject(new Error(`OOXML Validator exited with code ${code}. stderr: ${stderr || stdout}`))
			}

			try {
				const trimmed = stdout.trim()
				if (!trimmed) {
					resolve([])
					return
				}

				const json = JSON.parse(trimmed)
				if (Array.isArray(json)) {
					resolve(json as ValidationError[])
				} else {
					resolve([json as ValidationError])
				}
			} catch (e) {
				reject(new Error(`Failed to parse OOXML Validator output as JSON: ${(e as Error).message}\nOutput was:\n${stdout}`))
			}
		})
	})
}
