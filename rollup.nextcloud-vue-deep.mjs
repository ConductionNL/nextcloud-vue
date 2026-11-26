/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Build-time rewrite of the library's own `@nextcloud/vue` imports to that
 * package's per-component entries, shared by rollup.config.js and
 * rollup.config.vue3.mjs.
 *
 * @nextcloud/vue 9 declares no `sideEffects` in its package.json, so a
 * consumer's webpack must keep every module its index reaches: one
 * `import { NcButton } from '@nextcloud/vue'` put all of it (with emoji-mart,
 * the date picker and the markdown stack) into the app's eager chunk, 4.5 MB
 * unminified. `@nextcloud/vue/components/NcButton` is an official export
 * that pulls only that component. The barrel's `export * from
 * '@nextcloud/vue'` stays: it is public API, and webpack skips it unless an
 * app imports an Nc* name through it.
 */

import fs from 'fs'
import MagicString from 'magic-string'
import path from 'path'
import process from 'process'

const NAMED_IMPORT = /import\s*\{([^}]*)\}\s*from\s*(['"])@nextcloud\/vue\2;?/g

/**
 * The deep imports that replace one named `@nextcloud/vue` import statement.
 *
 * @param {string} specifiers The text between the statement's braces.
 * @param {string} quote The quote character the statement uses.
 * @param {Set<string>} components The component names that have an entry.
 * @return {string|null} The replacement, or null when no name is a component.
 */
function deepImportsFor(specifiers, quote, components) {
	const deep = []
	const rest = []
	for (const raw of specifiers.split(',')) {
		const spec = raw.trim()
		if (!spec) {
			continue
		}
		const [imported, local = imported] = spec.split(/\s+as\s+/).map((s) => s.trim())
		if (components.has(imported)) {
			deep.push(`import ${local} from ${quote}@nextcloud/vue/components/${imported}${quote};`)
		} else {
			rest.push(spec)
		}
	}
	if (deep.length === 0) {
		return null
	}
	if (rest.length) {
		deep.push(`import { ${rest.join(', ')} } from ${quote}@nextcloud/vue${quote};`)
	}
	return deep.join('\n')
}

/**
 * Rewrite named `@nextcloud/vue` imports of known components to default
 * imports of their own entry. Names that are not components stay on the index.
 *
 * @param {string} code An ES module's source.
 * @param {Set<string>} components The component names that have an entry.
 * @return {MagicString|null} The edited source, or null when nothing changed.
 */
export function rewriteNextcloudVueImports(code, components) {
	const edited = new MagicString(code)
	let changed = false
	for (const match of code.matchAll(NAMED_IMPORT)) {
		const replacement = deepImportsFor(match[1], match[2], components)
		if (replacement !== null) {
			edited.overwrite(match.index, match.index + match[0].length, replacement)
			changed = true
		}
	}
	return changed ? edited : null
}

/**
 * The component names @nextcloud/vue ships a `components/<Name>` entry for.
 *
 * @param {string} [from] Directory to resolve @nextcloud/vue from.
 * @return {Set<string>} The component names.
 */
export function nextcloudVueComponents(from = process.cwd()) {
	// Its exports map has only an `import` condition, so walk up node_modules
	// instead of require.resolve().
	for (let dir = path.resolve(from); ; dir = path.dirname(dir)) {
		const components = path.join(dir, 'node_modules', '@nextcloud', 'vue', 'dist', 'components')
		if (fs.existsSync(components)) {
			return new Set(fs.readdirSync(components).filter((name) => fs.existsSync(path.join(components, name, 'index.mjs'))))
		}
		if (path.dirname(dir) === dir) {
			throw new Error(`nextcloud-vue-deep-imports: @nextcloud/vue not found from ${from}`)
		}
	}
}

/**
 * Rollup plugin: apply rewriteNextcloudVueImports to every emitted ES chunk.
 *
 * @return {import('rollup').Plugin} The plugin.
 */
export function nextcloudVueDeepImports() {
	let components = null
	return {
		name: 'nextcloud-vue-deep-imports',
		renderChunk(code, chunk, options) {
			if (options.format !== 'es') {
				return null
			}
			components = components || nextcloudVueComponents()
			const edited = rewriteNextcloudVueImports(code, components)
			return edited === null ? null : { code: edited.toString(), map: edited.generateMap({ hires: true }) }
		},
	}
}
