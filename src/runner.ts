import { spawn } from 'node:child_process'

import { resolveEmbeddedBinary } from './resolve-binary.js'

export const OFFICE_VERSIONS = ['Office2007', 'Office2010', 'Office2013', 'Office2016', 'Office2019', 'Office2021', 'Microsoft365'] as const

export type OfficeVersion = (typeof OFFICE_VERSIONS)[number]

export interface ValidationError {
	/** Human-readable description of the problem. */
	description?: string | null
	/** Package part the error was found in, e.g. `/word/document.xml`. `null` for `errorType: 'Exception'`. */
	path?: string | null
	/** XPath of the offending element. `null` for `errorType: 'Exception'`. */
	xPath?: string | null
	/** Open XML SDK error id, e.g. `Sch_UnexpectedElementContentExpectingComplex`. `null` for `errorType: 'Exception'`. */
	id?: string | null
	/** `Schema`, `Semantic`, `Package`, `MarkupCompatibility`, or `Exception` when the file could not be opened at all. */
	errorType?: string | null
	[key: string]: unknown
}

export interface ValidationResult {
	file: string
	ok: boolean
	errors: ValidationError[]
	[key: string]: unknown
}

export interface RunOptions {
	/** Open XML schema version to validate against. Defaults to `Microsoft365`. */
	officeVersion?: OfficeVersion
}

function isOfficeVersion(value: string): value is OfficeVersion {
	return (OFFICE_VERSIONS as readonly string[]).includes(value)
}

function getValidatorCommand(): string {
	// Deliberately used verbatim: the value is a path, which may contain spaces.
	const env = process.env.OOXML_VALIDATOR_CLI
	if (env && env.trim().length > 0) return env

	return resolveEmbeddedBinary()
}

export function runValidator(file: string, options: RunOptions = {}): Promise<ValidationResult> {
	const cliArgs = [file]

	if (options.officeVersion !== undefined) {
		// The validator binary silently treats any name it does not recognise as Microsoft365,
		// which would report a file as valid against the wrong schema version. Reject it here so
		// callers that are not type-checked (plain JS, values read from config) fail loudly.
		if (!isOfficeVersion(options.officeVersion)) {
			return Promise.reject(new TypeError(`Invalid officeVersion ${JSON.stringify(options.officeVersion)}. Expected one of: ${OFFICE_VERSIONS.join(', ')}`))
		}
		cliArgs.push(options.officeVersion)
	}

	let cmd: string
	try {
		cmd = getValidatorCommand()
	} catch (e) {
		return Promise.reject(e as Error)
	}

	return new Promise((resolve, reject) => {
		const child = spawn(cmd, cliArgs, { stdio: ['ignore', 'pipe', 'pipe'] })

		let stdout = ''
		let stderr = ''

		// setEncoding decodes across chunk boundaries; concatenating Buffer#toString() would
		// corrupt any multi-byte character that straddles two chunks.
		child.stdout.setEncoding('utf8')
		child.stderr.setEncoding('utf8')

		child.stdout.on('data', (d) => {
			stdout += d
		})
		child.stderr.on('data', (d) => {
			stderr += d
		})

		child.on('error', (err) => {
			reject(new Error(`Failed to spawn OOXML validator: ${err.message}`))
		})

		child.on('close', (code) => {
			if (code !== 0) {
				return reject(new Error(`OOXML Validator exited with code ${code}. stderr: ${stderr || stdout}`))
			}

			const trimmed = stdout.trim()
			if (!trimmed) {
				return reject(new Error('OOXML Validator produced no output.'))
			}

			try {
				resolve(JSON.parse(trimmed) as ValidationResult)
			} catch (e) {
				reject(new Error(`Failed to parse OOXML Validator output as JSON: ${(e as Error).message}\nOutput was:\n${stdout}`))
			}
		})
	})
}
