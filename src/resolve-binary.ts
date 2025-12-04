import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function resolveEmbeddedBinary(): string {
	const platform = process.platform
	const arch = process.arch

	let rid: string
	if (platform === 'darwin' && arch === 'arm64') {
		rid = 'osx-arm64'
	} else if (platform === 'darwin' && arch === 'x64') {
		rid = 'osx-x64'
	} else if (platform === 'linux' && arch === 'x64') {
		rid = 'linux-x64'
	} else if (platform === 'linux' && arch === 'arm64') {
		rid = 'linux-arm64'
	} else if (platform === 'win32' && arch === 'x64') {
		rid = 'win-x64'
	} else {
		throw new Error(`No embedded OOXML validator binary for platform: ${platform} ${arch}`)
	}

	return join(__dirname, '..', 'bin', rid, 'ooxml-validator')
}
