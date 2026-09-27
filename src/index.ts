import { OFFICE_VERSIONS, type OfficeVersion, type RunOptions, runValidator, type ValidationError, type ValidationResult } from './runner.js'

export { OFFICE_VERSIONS }
export type { ValidationError, ValidationResult, OfficeVersion, RunOptions }

export async function validateFile(filePath: string, options?: RunOptions): Promise<ValidationResult> {
	return await runValidator(filePath, options)
}

export async function isValid(filePath: string, options?: RunOptions): Promise<boolean> {
	const res = await validateFile(filePath, options)
	return res.ok
}
