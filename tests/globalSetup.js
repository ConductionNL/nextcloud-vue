/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Guarantee the compiled manifest validator exists and is current before any
 * test runs.
 *
 * `src/utils/validateManifestV2.compiled.js` is generated from
 * `src/schemas/app-manifest-v2.schema.json` by scripts/build-validators.js and
 * is gitignored, so a fresh clone has no copy and a schema edit leaves the old
 * copy stale. `package.json` has a `pretest` hook, which covers `npm test` —
 * but NOT `npx jest`, `jest --watch`, or an IDE test runner, all of which call
 * jest directly and skip npm lifecycle scripts entirely.
 *
 * The failure that causes is a genuine red herring: `tests/schemas/*` either
 * cannot resolve the module at all (the suite reports 0 tests) or validates
 * against a stale schema and fails cases that have nothing wrong with them.
 * Both look like a real regression in whatever you happened to be working on.
 *
 * Regenerating here makes every invocation self-healing. The work is skipped
 * when the compiled output is already newer than the schema, so the usual run
 * pays nothing.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const schemaPath = path.join(root, 'src/schemas/app-manifest-v2.schema.json')
const compiledPath = path.join(root, 'src/utils/validateManifestV2.compiled.js')
const builderPath = path.join(root, 'scripts/build-validators.js')

/**
 * Whether the compiled validator is missing or older than its source schema.
 *
 * @return {boolean} true when the validator must be rebuilt.
 */
function isStale() {
	if (!fs.existsSync(compiledPath)) {
		return true
	}
	if (!fs.existsSync(schemaPath)) {
		// No schema to compare against — leave whatever is on disk alone.
		return false
	}
	return fs.statSync(schemaPath).mtimeMs > fs.statSync(compiledPath).mtimeMs
}

module.exports = function globalSetup() {
	if (!isStale()) {
		return
	}
	execFileSync(process.execPath, [builderPath], { cwd: root, stdio: 'inherit' })
}
