import { spawn } from 'node:child_process'

import { resolveEmbeddedBinary } from './resolve-binary.js'

export interface ValidationError {
	description?: string
	path?: string
	xpath?: string
	id?: string
	errorType?: string
	[key: string]: unknown
}

export interface ValidationResult {
	file: string
	ok: boolean
	errors: ValidationError[]
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
		return { cmd: parts[0], args: parts.slice(1) }
	}

	const embedded = resolveEmbeddedBinary()
	return { cmd: embedded, args: [] }
}

export function runValidator(file: string, options: RunOptions = {}): Promise<ValidationResult> {
	const { cmd, args } = getValidatorCommand()

	const cliArgs = [...args, file]

	if (options.officeVersion) {
		cliArgs.push(options.officeVersion)
	}

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
					return resolve({ file, ok: false, errors: [] })
				}
				const json = JSON.parse(trimmed) as ValidationResult
				resolve(json)
			} catch (e) {
				reject(new Error(`Failed to parse OOXML Validator output as JSON: ${(e as Error).message}\nOutput was:\n${stdout}`))
			}
		})
	})
}
