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
 * baking a fixed value into the manifest. Context tokens resolve too, from
 * whatever the host widget exposes: `@objectId` / `@object.<field>` from its
 * `objectCtx` (a tile on a detail page), `@workspace.<key>` from `pageCtx`,
 * `@config.<key>` from `configCtx`, and `@range.<key>` from `activeRange()`
 * (CnStatWidget's period). So a tile on a portal's detail page can link to
 * `{ name: 'Traffic', query: { portal: '@object.slug' } }`. A host that exposes
 * none of these (CnGaugeWidget) resolves only the global tokens, as before, and
 * a token that stays unresolved is still dropped from the URL.
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
			if (!r) {
				return null
			}
			if (typeof r === 'string') {
				return r
			}
			if (typeof r !== 'object') {
				return null
			}
			return { ...r, ...this.resolveRouteTokens(r) }
		},
		/** An external href configured on the tile, or null. */
		linkHref() {
			const l = this.content && this.content.link
			return (typeof l === 'string' && l) ? l : null
		},
		/** Root element tag: 'router-link' (SPA), 'a' (external), or 'div'. */
		linkTag() {
			if (this.linkRoute) {
				return 'router-link'
			}
			if (this.linkHref) {
				return 'a'
			}
			return 'div'
		},
		/** Root element attributes for the resolved link tag. */
		linkAttrs() {
			if (this.linkRoute) {
				return { to: this.linkRoute, tabindex: '0' }
			}
			if (this.linkHref) {
				return { href: this.linkHref, target: '_blank', rel: 'noopener noreferrer', tabindex: '0' }
			}
			return {}
		},
		/** True when the tile navigates on click (route or external link). */
		isLinked() {
			return !!(this.linkRoute || this.linkHref)
		},
		/**
		 * The token context the host widget can offer its link. Each part is
		 * optional: `objectCtx`, `pageCtx` and `configCtx` exist on
		 * CnStatWidget and CnDeltaWidget, `activeRange()` on CnStatWidget only.
		 * Until this existed the link resolved no context at all, so
		 * `@object.slug` was silently dropped from a tile's route and apps
		 * wrapped the tile just to build the link themselves.
		 *
		 * @return {object} A resolveFilterValue context.
		 */
		linkTokenContext() {
			const ctx = { ...(this.objectCtx || {}) }
			if (this.pageCtx && typeof this.pageCtx === 'object') {
				ctx.workspace = this.pageCtx
			}
			if (this.configCtx && typeof this.configCtx === 'object') {
				ctx.config = this.configCtx
			}
			if (typeof this.activeRange === 'function') {
				ctx.range = this.activeRange() || {}
			}
			return ctx
		},
	},
	methods: {
		/**
		 * Resolve `@`-tokens inside a route's `query` / `params` maps: the
		 * global tokens (`@me`, `@today`, `@monthStart`, …) and whatever
		 * context the host offers (see `linkTokenContext`). A value that stays
		 * a `@…` string is dropped so a half-resolved token never lands in the
		 * URL.
		 *
		 * @param {object} route The vue-router location object.
		 * @return {object} A partial `{ query?, params? }` with resolved maps (only present when the source had them).
		 */
		resolveRouteTokens(route) {
			const out = {}
			for (const key of ['query', 'params']) {
				const map = route[key]
				if (!map || typeof map !== 'object') {
					continue
				}
				const resolved = {}
				for (const [k, v] of Object.entries(map)) {
					if (Array.isArray(v)) {
						resolved[k] = v.map((x) => resolveFilterValue(x, this.linkTokenContext))
					} else {
						const r = resolveFilterValue(v, this.linkTokenContext)
						// Drop a still-unresolved context-bound token (e.g. `@workspace.*`).
						if (typeof r === 'string' && r.charAt(0) === '@') {
							continue
						}
						resolved[k] = r
					}
				}
				out[key] = resolved
			}
			return out
		},
	},
}
