#!/usr/bin/env node
// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// Pre-compiles the v2 manifest JSON Schema into a standalone JS module
// that doesn't require runtime `new Function()`. Nextcloud's CSP blocks
// unsafe-eval, so Ajv's default JIT compilation breaks Vue mount in v2
// apps (EvalError on every app boot). This generator runs at build time
// as a `prebuild` step to produce
// src/utils/validateManifestV2.compiled.js — a regular CJS module that
// imports Ajv's runtime helpers but never calls new Function().
//
// See ADR-036 and docs/utilities/validate-manifest-v2.md for rationale.

'use strict'

const fs = require('fs')
const path = require('path')
// eslint-disable-next-line n/no-unpublished-require
const Ajv2020 = require('ajv/dist/2020')
// eslint-disable-next-line n/no-unpublished-require
const addFormats = require('ajv-formats')
// eslint-disable-next-line n/no-unpublished-require
const standaloneCode = require('ajv/dist/standalone')

// ajv and ajv-formats export default via CJS interop differently depending on
// bundler / Node version — unwrap .default when present.
const AjvClass = Ajv2020.default || Ajv2020
const addFormatsFunc = addFormats.default || addFormats
const standaloneCodeFunc = standaloneCode.default || standaloneCode

const schemaPath = path.resolve(__dirname, '../src/schemas/app-manifest-v2.schema.json')
const outPath = path.resolve(__dirname, '../src/utils/validateManifestV2.compiled.js')

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))

const ajv = new AjvClass({
	code: { source: true, esm: false }, // CJS output for broadest bundler compat
	useDefaults: true,
	allErrors: true,
	strict: false,
})
addFormatsFunc(ajv)

const validate = ajv.compile(schema)
let moduleCode = standaloneCodeFunc(ajv, validate)

// Inline ajv-formats so the standalone module has ZERO runtime dependency on
// ajv-formats. Ajv's standalone output emits lines like
//   const formatN = require("ajv-formats/dist/formats").fullFormats.uri;
// That runtime require survives Node/Jest fine, but the rollup→webpack
// double-bundle every consumer app runs tree-shakes ajv-formats'
// `exports.fullFormats = {…}` assignment down to `{}`, so at runtime
// `{}.fullFormats.uri` throws `Cannot read properties of undefined (reading
// 'uri')` during app boot and white-screens the whole SPA (observed
// 2026-07-11 on openbuild). Replacing each reference with a self-contained
// inline definition, extracted from the installed ajv-formats at build time,
// removes the fragile require while preserving identical validation. The
// formats file is re-read on every regeneration, so this stays in sync.
const formatsSrc = fs.readFileSync(
	require.resolve('ajv-formats/dist/formats'),
	'utf-8',
)
const fullFormats = require('ajv-formats/dist/formats').fullFormats

/**
 * Read a full JavaScript regex literal (including flags) from source, starting
 * at the opening `/`. Correctly skips escapes and `[…]` character classes so a
 * bare `/` inside a class does not prematurely terminate the literal.
 *
 * @param {string} src The source text.
 * @param {number} start Index of the opening `/`.
 * @return {string|null} The literal `/…/flags`, or null if unterminated.
 */
function readRegexLiteral(src, start) {
	let i = start + 1
	let inClass = false
	for (; i < src.length; i++) {
		const ch = src[i]
		if (ch === '\\') {
			i++
			continue
		}
		if (ch === '[') {
			inClass = true
		} else if (ch === ']') {
			inClass = false
		} else if (ch === '/' && !inClass) {
			break
		} else if (ch === '\n') {
			return null
		}
	}
	if (i >= src.length) {
		return null
	}
	let end = i + 1
	while (end < src.length && /[a-z]/i.test(src[end])) {
		end++
	}
	return src.slice(start, end)
}

/**
 * Build a self-contained JS expression reproducing one ajv-formats format,
 * with no runtime dependency on the ajv-formats package.
 *
 * @param {string} name The format name (e.g. "uri").
 * @return {string} A JS expression that evaluates to the format value.
 */
function inlineFormat(name) {
	const value = fullFormats[name]
	if (value === undefined) {
		throw new Error(`build-validators: ajv-formats has no format "${name}" to inline`)
	}
	if (value instanceof RegExp) {
		return value.toString()
	}
	if (typeof value === 'function') {
		// A function format (e.g. uri) closes over module-level `const X = /…/;`
		// regexes in formats.js. Inline exactly the ones it references inside an
		// IIFE so the returned function is self-contained. Regex literals are
		// read with a lexer-correct scanner (escapes + `[…]` classes) — a plain
		// regex can't parse a regex literal that contains bare `/` inside a
		// character class (ajv-formats' URI regex does).
		const body = value.toString()
		const deps = []
		const declRe = /const ([A-Z0-9_]+) = \//g
		let m
		while ((m = declRe.exec(formatsSrc)) !== null) {
			const name = m[1]
			if (!new RegExp(`\\b${name}\\b`).test(body)) {
				continue
			}
			const literal = readRegexLiteral(formatsSrc, m.index + m[0].length - 1)
			if (literal) {
				deps.push(`const ${name} = ${literal};`)
			}
		}
		return `(function(){${deps.join('')}return ${body};})()`
	}
	throw new Error(`build-validators: cannot inline ajv-formats format "${name}" of type ${typeof value}`)
}

moduleCode = moduleCode.replace(
	/require\("ajv-formats\/dist\/formats"\)\.fullFormats\.([A-Za-z0-9_-]+)/g,
	(_match, name) => inlineFormat(name),
)

if (/require\("ajv-formats/.test(moduleCode)) {
	throw new Error('build-validators: a require("ajv-formats…") reference survived inlining — the standalone validator is not self-contained')
}

const banner = `// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// AUTOGENERATED by scripts/build-validators.js — DO NOT EDIT BY HAND.
// Run \`npm run build:validators\` to regenerate after editing
// src/schemas/app-manifest-v2.schema.json.
//
// This is a standalone Ajv-compiled validator. It does NOT use
// new Function() at runtime — required for Nextcloud's CSP which
// blocks unsafe-eval. The validator function is exported as the
// module's default export (CJS: module.exports).
//
// See ADR-036 and docs/utilities/validate-manifest-v2.md.

`

fs.writeFileSync(outPath, banner + moduleCode)

const kb = (moduleCode.length / 1024).toFixed(1)
// eslint-disable-next-line no-console
console.log(`build-validators: wrote ${path.relative(process.cwd(), outPath)} (${kb} KB)`)
