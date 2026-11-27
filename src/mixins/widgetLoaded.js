/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * widgetLoaded — a widget renderer that fetches its content reports `loaded`
 * once, when its first load has settled (widget-placeholder-shape, design D7).
 *
 * The host's `CnWidgetWrapper` draws the widget's placeholder until then. The
 * mixin reads the renderer's own `loading` flag: the first time it turns back
 * to false after a load started, `loaded` is emitted, whatever the outcome
 * (items, empty or error). A renderer that starts no load by the tick after
 * it mounted (nothing to fetch: no source, no placement) is loaded with its
 * first render. A later load (refresh, paging, a filter) stays silent.
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-6
 */
export const widgetLoaded = {
	emits: ['loaded'],

	data() {
		return {
			cnFirstLoadStarted: false,
			cnFirstLoadDone: false,
		}
	},

	watch: {
		/**
		 * Follow the renderer's `loading` flag.
		 *
		 * @param {boolean} value The new value.
		 * @return {void}
		 */
		loading(value) {
			if (value) {
				this.cnFirstLoadStarted = true
				return
			}
			if (this.cnFirstLoadStarted) {
				this.cnMarkLoaded()
			}
		},
	},

	created() {
		if (this.loading === true) {
			this.cnFirstLoadStarted = true
		}
	},

	mounted() {
		this.$nextTick(() => {
			if (!this.cnFirstLoadStarted && this.loading !== true) {
				this.cnMarkLoaded()
			}
		})
	},

	methods: {
		/**
		 * Emit `loaded` once.
		 *
		 * @return {void}
		 */
		cnMarkLoaded() {
			if (this.cnFirstLoadDone) {
				return
			}
			this.cnFirstLoadDone = true
			this.$emit('loaded')
		},
	},
}

export default widgetLoaded
