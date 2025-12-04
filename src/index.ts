import { type RunOptions, runValidator, type ValidationError } from './runner.js'

export type { ValidationError, RunOptions }

export async function validateFile(filePath: string, options?: RunOptions): Promise<{ ok: boolean; file: string; errors: ValidationError[] }> {
	const errors = await runValidator(filePath, options)
	return {
		ok: errors.length === 0,
		file: filePath,
		errors,
	}
}

export async function isValid(filePath: string, options?: RunOptions): Promise<boolean> {
	const res = await validateFile(filePath, options)
	return res.ok
}
