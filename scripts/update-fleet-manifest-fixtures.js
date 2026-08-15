#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// update-fleet-manifest-fixtures.js — refresh the vendored fleet-manifest
// corpus used by tests/schemas/fleet-manifest-regression.spec.js.
//
// Why (2026-07-06 manifest fleet audit, item 15): a schema change in this
// library can silently invalidate a manifest already deployed in a fleet app
// — the exact drift the audit chased (installed schema generations spanned
// beta.30..beta.155). The regression spec validates every deployed manifest
// against the CURRENT candidate schema on every PR, so a breaking schema
// change fails HERE, before release, instead of surfacing as install drift.
//
// The corpus is a vendored snapshot (CI has no fleet checkout). This script
// refreshes it from the sibling app checkouts. Run it after a deliberate,
// reviewed manifest change lands in a fleet app — never to make a failing
// regression test pass (that would defeat the guard).
//
// Usage:
//   node scripts/update-fleet-manifest-fixtures.js [fleet-root]
//     fleet-root — dir whose children are the app checkouts
//                  (default: the parent of this library's checkout).
//
// Output: writes tests/fixtures/fleet-manifests/<app>.json for every app
// that ships src/manifest.json, plus an index.json manifest (app -> bytes,
// $schema, sha256) so the spec can report drift precisely.

'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const REPO_ROOT = path.resolve(__dirname, '..')
const FLEET_ROOT = process.argv[2]
	? path.resolve(process.argv[2])
	: path.resolve(REPO_ROOT, '..')
const OUT_DIR = path.join(REPO_ROOT, 'tests', 'fixtures', 'fleet-manifests')

// Non-app sibling dirs that may carry a src/manifest.json but are not fleet
// apps we want to gate on (this library's own examples, etc.).
const SKIP = new Set(['nextcloud-vue'])

function sha256(buf) {
	return crypto.createHash('sha256').update(buf).digest('hex')
}

function main() {
	if (fs.existsSync(OUT_DIR) === false) {
		fs.mkdirSync(OUT_DIR, { recursive: true })
	}

	const index = {}
	let written = 0

	for (const app of fs.readdirSync(FLEET_ROOT).sort()) {
		if (SKIP.has(app)) {
			continue
		}
		const appDir = path.join(FLEET_ROOT, app)
		const manifestPath = path.join(appDir, 'src', 'manifest.json')
		if (fs.existsSync(manifestPath) === false) {
			continue
		}

		// The corpus must reflect the DEPLOYED manifest — what is merged to the
		// app's integration branch — not whatever a local checkout happens to
		// have on a feature branch. Prefer the committed origin/development (or
		// origin/main) blob; fall back to the working tree only if git can't
		// resolve one (e.g. a shallow CI checkout).
		let raw = null
		for (const ref of ['origin/development', 'origin/main']) {
			try {
				raw = execFileSync('git', ['-C', appDir, 'show', `${ref}:src/manifest.json`], { maxBuffer: 32 * 1024 * 1024 })
				break
			} catch (_) { /* try next ref */ }
		}
		if (raw === null) {
			try {
				raw = fs.readFileSync(manifestPath)
				console.error(`  (note: ${app} — no origin/development|main blob, snapshotting working tree)`)
			} catch (_) {
				continue
			}
		}

		// Validate it is parseable JSON before vendoring — never snapshot
		// a corrupt file into the corpus.
		let parsed
		try {
			parsed = JSON.parse(raw)
		} catch (e) {
			console.error(`SKIP ${app}: manifest.json is not valid JSON (${e.message})`)
			continue
		}

		const pretty = JSON.stringify(parsed, null, '\t') + '\n'
		fs.writeFileSync(path.join(OUT_DIR, `${app}.json`), pretty)
		index[app] = {
			bytes: Buffer.byteLength(pretty),
			$schema: typeof parsed.$schema === 'string' ? parsed.$schema : null,
			sha256: sha256(pretty),
		}
		written += 1
		console.log(`  ${app} (${index[app].bytes} bytes)`)
	}

	fs.writeFileSync(
		path.join(OUT_DIR, 'index.json'),
		JSON.stringify(index, null, '\t') + '\n',
	)
	console.log(`\nWrote ${written} fleet manifests + index.json to ${path.relative(REPO_ROOT, OUT_DIR)}`)
}

main()
