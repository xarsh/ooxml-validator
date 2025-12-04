import { type RunOptions, runValidator, type ValidationResult } from './runner.js'

export type { ValidationResult, RunOptions }

export async function validateFile(filePath: string, options?: RunOptions): Promise<ValidationResult> {
	return await runValidator(filePath, options)
}

export async function isValid(filePath: string, options?: RunOptions): Promise<boolean> {
	const res = await validateFile(filePath, options)
	return res.ok
}
