import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { resolveEmbeddedBinary } from '../src/resolve-binary.js'

const execFileAsync = promisify(execFile)

const TSX = fileURLToPath(new URL('../node_modules/.bin/tsx', import.meta.url))
const CLI = fileURLToPath(new URL('../src/cli.ts', import.meta.url))

export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url))
export const VALID_PPTX = join(FIXTURES, 'minimal.pptx')
/** Valid from Office2010 on; `w:tblCaption` does not exist in Office2007's schema. */
export const OFFICE2010_ONLY_DOCX = join(FIXTURES, 'office2010-only.docx')
/** The same, 400 times over: ~140 KB of JSON, well past the 64 KB pipe buffer. */
export const MANY_ERRORS_DOCX = join(FIXTURES, 'many-errors.docx')

/** The binary under test: the one CI built from source, or the installed platform package. */
export function validatorBinary(): string {
	return process.env.OOXML_VALIDATOR_CLI || resolveEmbeddedBinary()
}

export async function runCli(args: string[], env: NodeJS.ProcessEnv = {}) {
	try {
		const { stdout, stderr } = await execFileAsync(TSX, [CLI, ...args], { env: { ...process.env, ...env } })
		return { stdout, stderr, code: 0 }
	} catch (err) {
		const e = err as { stdout?: string; stderr?: string; code?: number }
		return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 }
	}
}
