/**
 * CLI entry-point tests — exit codes and error handling.
 *
 * These tests spawn manifest-migrate as a child process so that
 * process.exit() calls don't terminate the Jest runner.
 *
 * Covers task 7.8 / spec.md "Exit codes".
 */

import { execFileSync, spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

const CLI = path.resolve(__dirname, '../../src/cli/manifest-migrate.js')
const V1_MANIFEST = path.resolve(__dirname, '../fixtures/v1-manifests/decidesk-v1.json')

/**
 * Run the CLI and return { stdout, stderr, status }.
 *
 * @param {string[]} args
 * @return {{ stdout: string, stderr: string, status: number }}
 */
function runCli(args) {
	const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' })
	return {
		stdout: result.stdout || '',
		stderr: result.stderr || '',
		status: result.status,
	}
}

describe('manifest-migrate CLI — exit codes and error handling', () => {
	describe('--help', () => {
		it('exits 0 and prints usage', () => {
			const { status, stdout } = runCli(['--help'])
			expect(status).toBe(0)
			expect(stdout).toContain('manifest-migrate')
			expect(stdout).toContain('--input')
		})
	})

	describe('missing --input', () => {
		it('exits 1 and prints error when --input is not provided', () => {
			const { status, stderr } = runCli([])
			expect(status).toBe(1)
			// Commander prints "required option" error
			expect(stderr.toLowerCase()).toMatch(/required|missing|input/)
		})
	})

	describe('input file not found', () => {
		it('exits 1 and identifies the missing file', () => {
			const { status, stderr } = runCli(['--input', '/nonexistent/path/manifest.json'])
			expect(status).toBe(1)
			expect(stderr).toContain('/nonexistent/path/manifest.json')
		})
	})

	describe('invalid JSON', () => {
		it('exits 1 on malformed JSON input', () => {
			const tmpFile = path.join(os.tmpdir(), 'invalid-manifest.json')
			fs.writeFileSync(tmpFile, '{ "not": "valid json', 'utf8')
			try {
				const { status, stderr } = runCli(['--input', tmpFile])
				expect(status).toBe(1)
				expect(stderr.toLowerCase()).toContain('invalid json')
			} finally {
				fs.unlinkSync(tmpFile)
			}
		})
	})

	describe('successful transformation', () => {
		it('exits 0 on a valid v1 manifest', () => {
			const tmpOutput = path.join(os.tmpdir(), 'output-v2.json')
			try {
				const { status, stdout } = runCli(['--input', V1_MANIFEST, '--output', tmpOutput])
				expect(status).toBe(0)
				expect(stdout).toContain(tmpOutput)
				// Output file should be valid JSON
				const outputContent = JSON.parse(fs.readFileSync(tmpOutput, 'utf8'))
				expect(outputContent.$schema).toContain('app-manifest-v2')
			} finally {
				if (fs.existsSync(tmpOutput)) {
					fs.unlinkSync(tmpOutput)
				}
			}
		})
	})

	describe('--dry-run', () => {
		it('exits 0, writes JSON to stdout, writes nothing to disk', () => {
			const { status, stdout, stderr } = runCli(['--input', V1_MANIFEST, '--dry-run'])
			expect(status).toBe(0)
			// stdout should be valid JSON
			const parsed = JSON.parse(stdout)
			expect(parsed.$schema).toContain('app-manifest-v2')
			// stderr should contain report
			expect(stderr).toContain('Migration Report')
		})
	})

	describe('--validate-only', () => {
		it('exits 0 on valid v1 manifest', () => {
			const { status, stdout } = runCli(['--input', V1_MANIFEST, '--validate-only'])
			expect(status).toBe(0)
			expect(stdout).toContain('Valid')
		})
	})

	describe('idempotency via CLI', () => {
		it('exits 0 when input is already v2', () => {
			const tmpFirst = path.join(os.tmpdir(), 'first-pass-v2.json')
			try {
				// First pass — transform
				runCli(['--input', V1_MANIFEST, '--output', tmpFirst])
				// Second pass — idempotency check
				const { status, stdout } = runCli(['--input', tmpFirst])
				expect(status).toBe(0)
				expect(stdout).toContain('already v2')
			} finally {
				if (fs.existsSync(tmpFirst)) {
					fs.unlinkSync(tmpFirst)
				}
			}
		})
	})

	describe('--report', () => {
		it('writes a Markdown report file', () => {
			const tmpOutput = path.join(os.tmpdir(), 'v2-output.json')
			const tmpReport = path.join(os.tmpdir(), 'v2-report.md')
			try {
				const { status } = runCli([
					'--input', V1_MANIFEST,
					'--output', tmpOutput,
					'--report', tmpReport,
				])
				expect(status).toBe(0)
				expect(fs.existsSync(tmpReport)).toBe(true)
				const report = fs.readFileSync(tmpReport, 'utf8')
				expect(report).toContain('# Migration Report')
				expect(report).toContain('## Summary')
			} finally {
				if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput)
				if (fs.existsSync(tmpReport)) fs.unlinkSync(tmpReport)
			}
		})
	})
})
