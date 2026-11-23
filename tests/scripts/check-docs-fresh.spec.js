/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `check:docs-fresh` must fail when the docs generator writes a page git does
 * not track yet (nextcloud-vue#1272). It compared with `git diff`, which
 * ignores untracked files, so CnGuardianHome shipped without its page and the
 * check stayed green.
 *
 * These tests run the comparison half of the REAL package.json command (the
 * part after the regeneration step) in a throwaway git repo, so a change to
 * the command is what they test, not a copy of it.
 */

import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const REPO = path.resolve(__dirname, '../..')
const GENERATED = 'docs/components/_generated'

/**
 * The comparison half of `check:docs-fresh`: everything after `cd ..`.
 *
 * @return {string} The shell command that compares the regenerated pages.
 */
function comparisonCommand() {
	const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'))
	const script = pkg.scripts['check:docs-fresh']
	const marker = 'cd .. && '
	const at = script.indexOf(marker)
	if (at === -1) {
		throw new Error(`check:docs-fresh no longer regenerates then returns with "cd ..": ${script}`)
	}
	return script.slice(at + marker.length)
}

/**
 * A git repo with one committed generated page, and this repo's scripts/
 * linked in so the command can call them.
 *
 * @return {string} The temp repo root.
 */
function makeRepo() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-fresh-'))
	const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'pipe' })
	run('git init -q')
	run('git config user.email t@t.nl')
	run('git config user.name t')
	fs.mkdirSync(path.join(root, GENERATED), { recursive: true })
	fs.writeFileSync(path.join(root, GENERATED, 'CnKnown.md'), '# CnKnown\n')
	run('git add -A')
	run('git commit -q -m base')
	fs.symlinkSync(path.join(REPO, 'scripts'), path.join(root, 'scripts'))
	return root
}

/**
 * Run the comparison in `root`.
 *
 * @param {string} root The temp repo.
 * @return {{status: number, out: string}} Exit status and combined output.
 */
function compare(root) {
	const res = spawnSync('sh', ['-c', comparisonCommand()], { cwd: root, encoding: 'utf8' })
	return { status: res.status, out: `${res.stdout}${res.stderr}` }
}

describe('check:docs-fresh', () => {
	let root

	beforeEach(() => {
		root = makeRepo()
	})

	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true })
	})

	it('passes when the regenerated pages match what git tracks', () => {
		expect(compare(root).status).toBe(0)
	})

	it('fails when a tracked page changed', () => {
		fs.writeFileSync(path.join(root, GENERATED, 'CnKnown.md'), '# CnKnown, changed\n')
		expect(compare(root).status).not.toBe(0)
	})

	it('fails when the generator wrote a page git does not track', () => {
		fs.writeFileSync(path.join(root, GENERATED, 'CnGuardianHome.md'), '# CnGuardianHome\n')
		const { status, out } = compare(root)
		expect(status).not.toBe(0)
		expect(out).toContain('CnGuardianHome.md')
	})
})
