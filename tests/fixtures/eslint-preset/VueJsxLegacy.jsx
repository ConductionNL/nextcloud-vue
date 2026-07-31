/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * POSITIVE CONTROL for the `.jsx` fixture next door.
 *
 * A Vue component authored as a render-function `.jsx` — `eslint-plugin-vue`
 * recognises `.vue`, `.jsx` and `.tsx` as component files
 * (`utils.isVueFile()`), so the deprecation family applies here exactly as it
 * does inside an SFC.
 *
 * Everything in it is a Vue-2 survivor Vue 3 does not warn about:
 *   - `beforeDestroy` is never called, so the interval leaks — the openconnector
 *     failure this whole preset exists to catch;
 *   - `this.$on` compiles and never receives an event.
 *
 * If `ReactSurface.jsx` lints clean and THIS file reports nothing, the pipeline
 * is not running on `.jsx` at all and the clean result means nothing.
 */
export default {
	name: 'LegacyJsxCard',

	data() {
		return { timer: null }
	},

	mounted() {
		this.timer = setInterval(() => {}, 1000)
		this.$on('refresh', () => {})
	},

	beforeDestroy() {
		clearInterval(this.timer)
	},

	render() {
		return <div class="legacy-jsx-card" />
	},
}
