#!/usr/bin/env node

/**
 * Integration registry parity gate.
 *
 * Per AD-11/AD-13 of the `pluggable-integration-registry` umbrella,
 * every registered integration must declare BOTH a sidebar `tab`
 * component AND a `widget` component (the widget can be a thin shell
 * around the tab's data for MVP parity, but it must exist). The
 * registry throws at `register()` time when one is missing — this
 * gate catches the same condition statically, before merge, for the
 * descriptors shipped in this repo's `src/integrations/`.
 *
 * Run via `npm run check:integration-parity` (wired into the
 * Code Quality CI workflow and the pre-commit hook).
 *
 * Exit codes:
 *   0 — every descriptor is parity-complete
 *   1 — at least one descriptor is missing `tab` or `widget`, or
 *       carries a malformed `id` / `label`
 */

'use strict'

const path = require('path')

// The built-in registrations are the only descriptors that live in
// this repo. Leaf changes in other repos register their own and run
// their own copy of this gate (and the hydra quality gate enforces it
// cross-repo). Importing the module gives us the normalised array
// without spinning up Vue.
let builtinIntegrations
try {
	// eslint-disable-next-line global-require, import/no-unresolved
	builtinIntegrations = require(path.resolve(__dirname, '../src/integrations/builtin/index.js')).builtinIntegrations
} catch (e) {
	// Fall back to a source scan if the module can't be required in
	// this environment (e.g. ESM-only toolchains). We look for the
	// per-id descriptor files and verify each names a `tab:` and
	// `widget:` key. This is coarser but never throws.
	const fs = require('fs')
	const dir = path.resolve(__dirname, '../src/integrations/builtin')
	const failures = []
	for (const file of fs.readdirSync(dir)) {
		if (file === 'index.js' || !file.endsWith('.js')) {
			continue
		}
		const src = fs.readFileSync(path.join(dir, file), 'utf8')
		if (!/\btab\s*:/.test(src)) {
			failures.push(`${file}: no \`tab:\` key found`)
		}
		if (!/\bwidget\s*:/.test(src)) {
			failures.push(`${file}: no \`widget:\` key found`)
		}
	}
	report(failures)
	process.exit(failures.length === 0 ? 0 : 1)
}

const failures = []
for (const d of builtinIntegrations || []) {
	const label = d && typeof d.id === 'string' && d.id !== '' ? d.id : '(unknown)'
	if (typeof d.id !== 'string' || d.id === '') {
		failures.push(`${label}: missing or empty \`id\``)
	}
	if (typeof d.label !== 'string' || d.label === '') {
		failures.push(`${label}: missing or empty \`label\``)
	}
	if (d.tab === undefined || d.tab === null) {
		failures.push(`${label}: missing required \`tab\` component`)
	}
	if (d.widget === undefined || d.widget === null) {
		failures.push(`${label}: missing required \`widget\` component`)
	}
}

report(failures)
process.exit(failures.length === 0 ? 0 : 1)

/**
 * Print the result to stdout/stderr.
 *
 * @param {string[]} list Failure messages (empty when all good).
 *
 * @return {void}
 */
function report(list) {
	if (list.length === 0) {
		// eslint-disable-next-line no-console
		console.log('✓ integration parity: every registered integration has both a tab and a widget')
		return
	}
	// eslint-disable-next-line no-console
	console.error('✗ integration parity gate failed:')
	for (const f of list) {
		// eslint-disable-next-line no-console
		console.error(`  - ${f}`)
	}
	// eslint-disable-next-line no-console
	console.error('\nEvery integration registered on window.OCA.OpenRegister.integrations')
	// eslint-disable-next-line no-console
	console.error('must declare BOTH a `tab` and a `widget` component (AD-11/AD-13).')
}
