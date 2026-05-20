import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function detectRid(): string {
	const platform = process.platform
	const arch = process.arch

	if (platform === 'darwin' && arch === 'arm64') return 'darwin-arm64'
	if (platform === 'darwin' && arch === 'x64') return 'darwin-x64'
	if (platform === 'linux' && arch === 'arm64') return 'linux-arm64'
	if (platform === 'linux' && arch === 'x64') return 'linux-x64'
	if (platform === 'win32' && arch === 'arm64') return 'win32-arm64'
	if (platform === 'win32' && arch === 'x64') return 'win32-x64'

	throw new Error(`No embedded OOXML validator binary for platform: ${platform} ${arch}`)
}

export function resolveEmbeddedBinary(): string {
	const rid = detectRid()
	const binName = rid.startsWith('win32-') ? 'ooxml-validator.exe' : 'ooxml-validator'
	const pkgName = `@xarsh/ooxml-validator-${rid}`

	try {
		return require.resolve(`${pkgName}/${binName}`)
	} catch (e) {
		throw new Error(
			`Missing optional dependency ${pkgName} for ${process.platform}-${process.arch}. ` +
				'Try reinstalling (npm install / npm rebuild) or set OOXML_VALIDATOR_CLI to your own CLI path. ' +
				`Underlying error: ${(e as Error).message}`,
		)
	}
}
