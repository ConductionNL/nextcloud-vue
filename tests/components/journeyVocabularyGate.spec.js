/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The gate's negative fixture runs here, so a clean run is evidence rather than silence.
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-5
 */
const { spawnSync } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const run = (dir) => spawnSync('node', [path.join(ROOT, 'scripts/gates/journey-vocabulary.mjs'), path.join(ROOT, dir)], { encoding: 'utf8' })

describe('journey-vocabulary gate', () => {
	it('fails a host that registers a step type, naming the host and the addition', () => {
		const r = run('tests/fixtures/journey-vocabulary/bad-host')
		expect(r.status).toBe(1)
		expect(r.stderr).toContain('host "bad-host"')
		expect(r.stderr).toContain('step type registration')
		expect(r.stderr).toContain('step type "carousel"')
	})

	it('passes a host that only mounts the renderer', () => {
		const r = run('tests/fixtures/journey-vocabulary/clean-host')
		expect(r.status).toBe(0)
	})

	it('passes the library itself', () => {
		expect(run('src').status).toBe(0)
	})
})
