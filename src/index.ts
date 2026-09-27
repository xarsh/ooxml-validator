import { OFFICE_VERSIONS, type OfficeVersion, type RunOptions, runValidator, type ValidationError, type ValidationResult } from './runner.js'

export type { OfficeVersion, RunOptions, ValidationError, ValidationResult }
export { OFFICE_VERSIONS }

export async function validateFile(filePath: string, options?: RunOptions): Promise<ValidationResult> {
	return await runValidator(filePath, options)
}

export async function isValid(filePath: string, options?: RunOptions): Promise<boolean> {
	const res = await validateFile(filePath, options)
	return res.ok
}
