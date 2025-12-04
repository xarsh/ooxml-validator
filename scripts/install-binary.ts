import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import https from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function detectRid(): string {
	const platform = process.platform
	const arch = process.arch

	if (platform === 'darwin') {
		if (arch === 'arm64') return 'osx-arm64'
		if (arch === 'x64') return 'osx-x64'
	}

	if (platform === 'linux') {
		if (arch === 'x64') return 'linux-x64'
		if (arch === 'arm64') return 'linux-arm64'
	}

	if (platform === 'win32') {
		if (arch === 'x64') return 'win-x64'
		if (arch === 'arm64') return 'win-arm64'
	}

	throw new Error(`Unsupported platform/arch: ${platform} ${arch}`)
}

function getDownloadUrl(tag: string, rid: string): string {
	const owner = 'xarsh'
	const repo = 'ooxml-validator'
	const base = `https://github.com/${owner}/${repo}/releases/download/${tag}`
	const suffix = rid.startsWith('win-') ? '.exe' : ''
	return `${base}/ooxml-validator-${rid}${suffix}`
}

async function download(url: string, dest: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		https
			.get(url, (res) => {
				if (res.statusCode && res.statusCode >= 400) {
					reject(new Error(`HTTP ${res.statusCode} when downloading ${url}`))
					return
				}

				const chunks: Buffer[] = []
				res.on('data', (c) => chunks.push(c))
				res.on('end', () => {
					const buf = Buffer.concat(chunks)
					writeFileSync(dest, buf)
					chmodSync(dest, 0o755)
					resolve()
				})
			})
			.on('error', (err) => reject(err))
	})
}

async function main() {
	try {
		const rid = detectRid()
		const version = process.env.OOXML_VALIDATOR_VERSION || 'v0.1.0'

		// node_modules/ooxml-validator/bin/<platform>/ooxml-validator に保存する
		const binDir = join(__dirname, '..', 'bin', rid)
		const binPath = join(binDir, 'ooxml-validator')

		mkdirSync(binDir, { recursive: true })

		const url = getDownloadUrl(version, rid)
		console.log(`[ooxml-validator] Downloading binary from ${url}`)
		await download(url, binPath)
		console.log(`[ooxml-validator] Installed binary to ${binPath}`)
	} catch (e) {
		console.warn('[ooxml-validator] Failed to install embedded binary:', e instanceof Error ? e.message : String(e))
		console.warn('[ooxml-validator] You can still use the package by setting OOXML_VALIDATOR_CLI to your own CLI path.')
	}
}

main()
