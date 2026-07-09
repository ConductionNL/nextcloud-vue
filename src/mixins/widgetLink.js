/*
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * widgetLink — shared opt-in click-through behaviour for the manifest metric
 * tiles (CnStatWidget / CnGaugeWidget / CnDeltaWidget).
 *
 * When the host widget's `content` carries a `route` (a vue-router location
 * object or named-route string) — or its Wave-2 alias `clickRoute`, the name
 * the endpoint-bound KPI vocabulary uses; `route` wins when both are set —
 * the tile root renders as a `<router-link>` for SPA navigation; when it
 * carries an external `link` (string href) it renders as an `<a>`; otherwise
 * it stays a plain `<div>`. Mirrors the route → `<router-link>` precedent
 * already used by CnStatsBlock so metric tiles get a whole-card click target
 * without per-app coded wrappers.
 *
 * Host usage: `<component :is="linkTag" v-bind="linkAttrs" :class="{ '…--linked': isLinked }">`.
 * Assumes the host component exposes a `content` object prop.
 *
 * A route object's `query` / `params` values may carry the same dynamic
 * `@`-tokens the source filters use (`@me`, `@today`, `@monthStart`, `@today±Nd`,
 * …) — they are resolved at render time via `resolveFilterValue` so a metric
 * tile can deep-link to a list pre-filtered "relative to now / the current user"
 * (e.g. `route: { name: 'Cases', query: { 'deadline[lt]': '@today' } }`) without
 * baking a fixed value into the manifest. Object-context tokens (`@workspace.*`,
 * `@config.*`, `@objectId`) are NOT resolved here — only the global tokens that
 * need no context.
 */
import { resolveFilterValue } from '../utils/resolveFilterTokens.js'

export default {
	computed: {
		/**
		 * The tile's configured vue-router location (query/params tokens
		 * resolved), or null. Reads `content.route` first, then the Wave-2
		 * `content.clickRoute` alias (the endpoint-bound KPI vocabulary).
		 */
		linkRoute() {
			const r = (this.content && (this.content.route || this.content.clickRoute)) || null
			if (!r) return null
			if (typeof r === 'string') return r
			if (typeof r !== 'object') return null
			return { ...r, ...this.resolveRouteTokens(r) }
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
	methods: {
		/**
		 * Resolve `@`-tokens inside a route's `query` / `params` maps. Only the
		 * context-free global tokens (`@me`, `@today`, `@monthStart`, …) are
		 * resolved; a value that stays a `@…` string (context-bound token) is
		 * dropped so a half-resolved token never lands in the URL.
		 *
		 * @param {object} route The vue-router location object.
		 * @return {object} A partial `{ query?, params? }` with resolved maps (only present when the source had them).
		 */
		resolveRouteTokens(route) {
			const out = {}
			for (const key of ['query', 'params']) {
				const map = route[key]
				if (!map || typeof map !== 'object') continue
				const resolved = {}
				for (const [k, v] of Object.entries(map)) {
					if (Array.isArray(v)) {
						resolved[k] = v.map((x) => resolveFilterValue(x))
					} else {
						const r = resolveFilterValue(v)
						// Drop a still-unresolved context-bound token (e.g. `@workspace.*`).
						if (typeof r === 'string' && r.charAt(0) === '@') continue
						resolved[k] = r
					}
				}
				out[key] = resolved
			}
			return out
		},
	},
}
