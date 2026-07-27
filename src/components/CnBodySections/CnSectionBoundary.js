/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSectionBoundary — a tiny error boundary for a single in-body section.
 *
 * Wraps one host-app section component. If that component throws during
 * render (or in a synchronous lifecycle hook), `errorCaptured` flips an
 * internal flag and the boundary renders an inline error card INSTEAD of
 * the broken subtree, so one failing section never tears down the whole
 * detail page. The error is also logged once to the console for debugging.
 *
 * Caveat: `errorCaptured` catches errors thrown by descendants, not the
 * boundary's own render — which is exactly what we want here (the descendant
 * is the host component). Returning `false` from `errorCaptured` stops the
 * error from propagating further up.
 */
import { h } from 'vue'

export default {
	name: 'CnSectionBoundary',

	props: {
		/** The owning section's id — used only in the logged warning. */
		sectionId: {
			type: [String, Number],
			default: '',
		},
		/** Inline message rendered when the wrapped section throws. */
		errorLabel: {
			type: String,
			default: 'This section failed to load.',
		},
	},

	data() {
		return {
			/** Flips true the first time a descendant throws. */
			failed: false,
		}
	},

	errorCaptured(err) {
		this.failed = true
		// eslint-disable-next-line no-console
		console.error(`[CnBodySections] section "${this.sectionId}" threw while rendering; showing inline error.`, err)
		// Stop propagation — the boundary has handled it.
		return false
	},

	render() {
		if (this.failed) {
			return h('div', {
				class: 'cn-body-sections__error',
				'data-testid': `cn-body-section-threw-${this.sectionId}`,
			}, this.errorLabel)
		}
		const slot = this.$slots.default
		return h('div', { class: 'cn-body-sections__boundary' }, slot ? slot() : undefined)
	},
}
