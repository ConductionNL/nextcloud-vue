#!/usr/bin/env node

/**
 * Integration-leaf template-compile gate (Phase K / K1).
 *
 * THE NEAR-MISS THIS GUARDS AGAINST
 * ---------------------------------
 * During the pluggable-integration-registry rollout (ADR-019) a
 * template-side ES2020 optional-chain slipped into
 * `src/integrations/builtin/contacts/CnContactsCard.vue` — an
 * `obj?.field` expression *inside the `<template>` block*. jest passed
 * (its vue-jest transform tolerates modern syntax), but `npm run build`
 * broke: Vue 2's render-function transpiler
 * (vue-template-compiler → vue-template-es2015-compiler → buble) does
 * NOT understand optional chaining (`?.`) or nullish coalescing (`??`)
 * in template expressions. jest never traverses buble, so the failure
 * only surfaced at build time.
 *
 * WHAT THIS DOES
 * --------------
 * Compiles every integration SFC's `<template>` block through the same
 * `vue-template-compiler` that `rollup-plugin-vue` uses at build time,
 * then runs the generated render function through buble — exactly the
 * path that rejects template-side ES2020. A failure here is ATTRIBUTED
 * to the offending integration file with a precise message, instead of
 * surfacing as an opaque rollup error deep in `npm run build`.
 *
 * This is the fast-feedback companion to the full `npm run build`
 * step in `.github/workflows/code-quality.yml`: the build remains the
 * authoritative gate, but this script (wired into `npm run lint` peers
 * via `check:integration-build` and the pre-commit hook) fails in
 * seconds and points at the exact `.vue` file + line class.
 *
 * Scoped to `src/integrations/builtin/**.vue` to stay aligned with the
 * K2 ESLint rule and avoid fleet-wide churn.
 *
 * Run via `npm run check:integration-build`.
 *
 * Exit codes:
 *   0 — every integration SFC template compiles through buble
 *   1 — at least one template uses syntax buble rejects (e.g. `?.`/`??`)
 */

'use strict'

const fs = require('fs')
const path = require('path')

const INTEGRATIONS_DIR = path.resolve(__dirname, '../src/integrations/builtin')

/**
 * Recursively collect every `*.vue` file under a directory.
 *
 * @param {string} dir Directory to walk.
 *
 * @return {string[]} Absolute paths to `.vue` files.
 */
function collectVueFiles(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			out.push(...collectVueFiles(full))
		} else if (entry.isFile() && entry.name.endsWith('.vue')) {
			out.push(full)
		}
	}
	return out
}

/**
 * Print the result to stdout/stderr.
 *
 * @param {Array<{file: string, message: string}>} list Failures.
 *
 * @return {void}
 */
function report(list) {
	if (list.length === 0) {
		// eslint-disable-next-line no-console
		console.log('✓ integration build: every integration SFC template compiles through buble (no template-side ES2020)')
		return
	}
	// eslint-disable-next-line no-console
	console.error('✗ integration template-compile gate failed:')
	for (const f of list) {
		// eslint-disable-next-line no-console
		console.error(`  - ${path.relative(process.cwd(), f.file)}: ${f.message}`)
	}
	// eslint-disable-next-line no-console
	console.error('\nVue 2 template expressions are transpiled by buble, which does NOT')
	// eslint-disable-next-line no-console
	console.error('support optional chaining (?.) or nullish coalescing (??) inside a')
	// eslint-disable-next-line no-console
	console.error('<template> block. Move the expression into a computed/method, or use')
	// eslint-disable-next-line no-console
	console.error('an explicit (a && a.b) / (a == null ? d : a) form in the template.')
	// eslint-disable-next-line no-console
	console.error('(See K1/K2 of the integration-hardening change; ADR-019.)')
}

let vueCompiler
let transpileToFunctions
try {
	// eslint-disable-next-line global-require, import/no-extraneous-dependencies
	vueCompiler = require('vue-template-compiler')
	// vue-template-compiler ships the es2015 (buble) transpiler that
	// rollup-plugin-vue uses to turn the compiled render string into a
	// function. This is the exact stage that rejects template ES2020.
	// eslint-disable-next-line global-require, import/no-extraneous-dependencies
	transpileToFunctions = require('vue-template-es2015-compiler')
} catch (e) {
	// In a toolchain without these deps installed (e.g. a docs-only CI
	// lane), fall back to a static scan of `<template>` blocks for `?.`
	// and `??`. Coarser, but never silently passes.
	staticFallback()
}

if (vueCompiler && transpileToFunctions) {
	compileEach()
}

/**
 * Authoritative path: compile each SFC template through
 * vue-template-compiler + buble.
 *
 * @return {void}
 */
function compileEach() {
	const failures = []
	for (const file of collectVueFiles(INTEGRATIONS_DIR)) {
		const sfc = fs.readFileSync(file, 'utf8')
		const parsed = vueCompiler.parseComponent(sfc)
		const template = parsed.template && parsed.template.content
		if (!template || template.trim() === '') {
			continue
		}
		const compiled = vueCompiler.compile(template)
		if (compiled.errors && compiled.errors.length > 0) {
			failures.push({ file, message: compiled.errors.join('; ') })
			continue
		}
		// The render fn string is what rollup-plugin-vue feeds to buble.
		const code = `var render = function(){${compiled.render}}\n`
			+ `var staticRenderFns = [${(compiled.staticRenderFns || []).map(fn => `function(){${fn}}`).join(',')}]`
		try {
			transpileToFunctions(code, { transforms: { stripWithFunctional: false } })
		} catch (err) {
			failures.push({ file, message: `buble rejected template render fn (likely template-side ES2020 ?./??): ${err.message}` })
		}
	}
	report(failures)
	process.exit(failures.length === 0 ? 0 : 1)
}

/**
 * Fallback path: static scan of `<template>` blocks for `?.` / `??`.
 *
 * @return {void}
 */
function staticFallback() {
	const failures = []
	for (const file of collectVueFiles(INTEGRATIONS_DIR)) {
		const sfc = fs.readFileSync(file, 'utf8')
		const match = sfc.match(/<template[^>]*>([\s\S]*?)<\/template>/i)
		if (!match) {
			continue
		}
		const tpl = match[1]
		// Optional chaining: `?.` not part of a ternary. Nullish: `??`.
		if (/\?\./.test(tpl)) {
			failures.push({ file, message: 'optional chaining (?.) found in <template> (buble rejects it)' })
		}
		if (/\?\?/.test(tpl)) {
			failures.push({ file, message: 'nullish coalescing (??) found in <template> (buble rejects it)' })
		}
	}
	report(failures)
	process.exit(failures.length === 0 ? 0 : 1)
}
