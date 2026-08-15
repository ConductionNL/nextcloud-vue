/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Icon-catalogue adapters for `CnIconBrowser`. The library imports NO
 * icon package itself — the consuming app owns that choice and passes a
 * normalized catalogue in via the browser's `icons` prop. These helpers turn a
 * popular icon source into that shape.
 *
 * A catalogue is an array of entries:
 *
 *   { key, label, value, search, path?, component? }
 *
 *   - `key`       stable identifier (the source's export name)
 *   - `label`     human display name (de-camelCased)
 *   - `value`     what the browser emits when this icon is picked — the
 *                 adapter decides the wire format (an SVG path for `@mdi/js`,
 *                 the component name for `vue-material-design-icons`)
 *   - `search`    lowercased label for substring matching
 *   - `path`      SVG `d` string → rendered inline as `<svg><path>`
 *   - `component` Vue component → rendered via `<component :is>` (async-safe)
 *
 * An entry carries `path` OR `component`; the browser renders whichever exists.
 */

import { defineAsyncComponent } from 'vue'

/**
 * De-camelCase a string into spaced words, e.g. `AccountCircle` →
 * `Account Circle`, `AB2Testing` → `AB2 Testing`.
 *
 * @param {string} name the PascalCase/camelCase identifier.
 * @return {string} the spaced display label.
 */
function deCamel(name) {
	return name
		.replace(/([a-z\d])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.trim()
}

/**
 * Build a catalogue from the `@mdi/js` namespace (named SVG-path-string
 * exports like `mdiAccount`). Entries are path-based and emit the path string,
 * so the stored value is self-contained and renders anywhere without the
 * package present.
 *
 * ```js
 * import * as mdi from '@mdi/js'
 * <CnIconBrowser :icons="mdiCatalogue(mdi)" />
 * ```
 *
 * @param {Record<string, string>} mdiNamespace the `@mdi/js` module namespace.
 * @return {Array<{key: string, label: string, value: string, search: string, path: string}>}
 *   the normalized, alphabetically-sorted catalogue.
 */
export function mdiCatalogue(mdiNamespace) {
	return Object.keys(mdiNamespace || {})
		.filter((key) => key.startsWith('mdi') && typeof mdiNamespace[key] === 'string')
		.map((key) => {
			const label = deCamel(key.replace(/^mdi/, ''))
			return { key, label, value: mdiNamespace[key], search: label.toLowerCase(), path: mdiNamespace[key] }
		})
		.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Build a catalogue from a `vue-material-design-icons` Webpack require-context
 * (component-based). Entries emit the component **name** (e.g. `'CalendarRange'`)
 * — render a stored value back with the same package. Components are wrapped as
 * async so a **lazy** context (`require.context(..., 'lazy')`) only loads the
 * icons actually shown.
 *
 * ```js
 * const ctx = require.context('vue-material-design-icons', false, /\.vue$/, 'lazy')
 * <CnIconBrowser :icons="vmdiCatalogue(ctx)" />
 * ```
 *
 * @param {Function & {keys: Function}} requireContext a Webpack require-context over the icon `.vue` files.
 * @return {Array<{key: string, label: string, value: string, search: string, component: object}>}
 *   the normalized, alphabetically-sorted catalogue.
 */
export function vmdiCatalogue(requireContext) {
	return requireContext.keys()
		.map((file) => {
			const key = file.replace(/^\.\//, '').replace(/\.vue$/, '')
			const label = deCamel(key)
			const component = defineAsyncComponent(() =>
				Promise.resolve(requireContext(file)).then((m) => (m && m.default) || m),
			)
			return { key, label, value: key, search: label.toLowerCase(), component }
		})
		.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Find a catalogue entry by its emitted `value` (used to highlight the current
 * selection and render its preview).
 *
 * @param {Array<object>} icons the catalogue to search.
 * @param {string|null|undefined} value the emitted value to match.
 * @return {object|null} the matching entry, or null when not found / empty.
 */
export function findIconByValue(icons, value) {
	if (typeof value !== 'string' || value.length === 0) {
		return null
	}
	return icons.find((icon) => icon.value === value) || null
}
