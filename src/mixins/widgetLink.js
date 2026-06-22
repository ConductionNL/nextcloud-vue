/*
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * widgetLink — shared opt-in click-through behaviour for the manifest metric
 * tiles (CnStatWidget / CnGaugeWidget / CnDeltaWidget).
 *
 * When the host widget's `content` carries a `route` (a vue-router location
 * object or named-route string) the tile root renders as a `<router-link>`
 * for SPA navigation; when it carries an external `link` (string href) it
 * renders as an `<a>`; otherwise it stays a plain `<div>`. Mirrors the
 * route → `<router-link>` precedent already used by CnStatsBlock so metric
 * tiles get a whole-card click target without per-app coded wrappers.
 *
 * Host usage: `<component :is="linkTag" v-bind="linkAttrs" :class="{ '…--linked': isLinked }">`.
 * Assumes the host component exposes a `content` object prop.
 */
export default {
	computed: {
		/** The tile's configured vue-router location, or null. */
		linkRoute() {
			const r = this.content && this.content.route
			return (r && (typeof r === 'object' || typeof r === 'string')) ? r : null
		},
		/** An external href configured on the tile, or null. */
		linkHref() {
			const l = this.content && this.content.link
			return (typeof l === 'string' && l) ? l : null
		},
		/** Root element tag: 'router-link' (SPA), 'a' (external), or 'div'. */
		linkTag() {
			if (this.linkRoute) return 'router-link'
			if (this.linkHref) return 'a'
			return 'div'
		},
		/** Root element attributes for the resolved link tag. */
		linkAttrs() {
			if (this.linkRoute) return { to: this.linkRoute, tabindex: '0' }
			if (this.linkHref) return { href: this.linkHref, target: '_blank', rel: 'noopener noreferrer', tabindex: '0' }
			return {}
		},
		/** True when the tile navigates on click (route or external link). */
		isLinked() {
			return !!(this.linkRoute || this.linkHref)
		},
	},
}
