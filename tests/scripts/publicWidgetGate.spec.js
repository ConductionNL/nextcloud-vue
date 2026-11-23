/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-registry-public-flag/tasks.md#task-3
 */
const { spawnSync } = require('child_process')
const path = require('path')

const SCRIPT = path.resolve(__dirname, '../../scripts/gates/public-widget.mjs')
const FIX = path.resolve(__dirname, '../fixtures/public-widget')

function run(...args) {
	return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
}

describe('public-widget gate', () => {
	it('passes a conforming manifest', () => {
		const r = run(path.join(FIX, 'conforming.json'))
		expect(r.status).toBe(0)
		expect(r.stdout).toContain('all public')
	})

	it('FAILS the deliberately non-public placement, naming the page and the key', () => {
		const r = run(path.join(FIX, 'non-public.json'))
		expect(r.status).toBe(1)
		expect(r.stderr).toContain('page "home" places "files"')
		expect(r.stderr).not.toContain('"markdown"')
	})

	it('fails when it inspects nothing', () => {
		const r = run(path.join(FIX, 'empty.json'))
		expect(r.status).toBe(1)
		expect(r.stderr).toContain('inspected no widget placements')
	})

	it('follows the registry: a key stops passing when its flag is removed', () => {
		const fs = require('fs')
		const os = require('os')
		const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pw-')), 'registry.js')
		fs.writeFileSync(tmp, "registerDashboardWidget('markdown', {\n\trenderer: X,\n})\n")
		const r = run('--registry', tmp, path.join(FIX, 'conforming.json'))
		expect(r.status).toBe(1)
		expect(r.stderr).toContain('"markdown"')
	})
})
