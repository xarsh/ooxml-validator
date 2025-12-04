import { chmodSync, createWriteStream, mkdirSync, unlinkSync } from 'node:fs'
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

async function download(url: string, dest: string, redirectCount = 0): Promise<void> {
	const MAX_REDIRECTS = 5

	await new Promise<void>((resolve, reject) => {
		console.log(`[ooxml-validator] GET ${url}`)
		https
			.get(url, (res) => {
				const status = res.statusCode ?? 0

				if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
					if (redirectCount >= MAX_REDIRECTS) {
						reject(new Error(`Too many redirects when downloading ${url}`))
						res.resume()
						return
					}

					const nextUrl = new URL(res.headers.location, url).toString()
					console.log(`[ooxml-validator] Redirect -> ${nextUrl}`)
					res.resume()
					download(nextUrl, dest, redirectCount + 1)
						.then(resolve)
						.catch(reject)
					return
				}

				if (status < 200 || status >= 300) {
					reject(new Error(`HTTP ${status} when downloading ${url}`))
					res.resume()
					return
				}

				const file = createWriteStream(dest)

				res.pipe(file)

				file.on('finish', () => {
					file.close(() => {
						chmodSync(dest, 0o755)
						console.log(`[ooxml-validator] Downloaded to ${dest}`)
						resolve()
					})
				})

				file.on('error', (err) => {
					try {
						file.close()
						unlinkSync(dest)
					} catch {
						// ignore
					}
					reject(err)
				})
			})
			.on('error', (err) => {
				reject(err)
			})
	})
}

async function main() {
	try {
		const rid = detectRid()
		const version = process.env.OOXML_VALIDATOR_VERSION || 'v0.1.0'

		const packageRoot = join(__dirname, '..', '..')
		const binDir = join(packageRoot, 'bin', rid)
		const binPath = join(binDir, rid.startsWith('win-') ? 'ooxml-validator.exe' : 'ooxml-validator')

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
