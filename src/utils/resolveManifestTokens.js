/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Single documented resolver-dispatch entrypoint for the closed sentinel-token
 * vocabulary. Before this module the four resolvers were invoked ad-hoc by
 * callers who had to know which resolver owned which token. This entrypoint
 * routes a token to its owning resolver BY CONTEXT (see
 * {@link module:utils/sentinelTokens}) so the vocabulary cannot drift between
 * the schema, the runtime, and the gate.
 *
 * It does NOT re-implement resolution: it composes the existing resolver
 * functions verbatim —
 *
 *  - route context → {@link resolveRouteSentinels} (reference-preserving walk +
 *    per-page unresolved warning);
 *  - filter / object / workspace / config(@config.<key>) contexts →
 *    {@link resolveFilterValue} per leaf (identical behaviour to
 *    resolveFilterTokens, which is that function applied over a filter map);
 *  - config `@resolve:<key>` context → handled at manifest-LOAD time by
 *    `resolveManifestSentinels` (async IAppConfig), so a render-time
 *    subtree pass leaves it untouched — matching today's split;
 *  - declarative `@self`/`@ref`/`@aggregate` → resolved server-side by
 *    OpenRegister, so they pass through the client walk untouched;
 *  - visibleWhen `@total` (manifest-form-logic) → resolved by
 *    {@link module:utils/visibleWhen}'s own `evaluateVisibleWhen` /
 *    `evaluateVisibleWhenLocal`, not by this generic subtree walk, so it
 *    likewise passes through untouched.
 *
 * On top it adds the migration-window behaviour the vocabulary requires: a
 * one-time `console.warn` naming the canonical replacement whenever a
 * DEPRECATED token is encountered.
 *
 * @module utils/resolveManifestTokens
 */

import resolveRouteSentinels from './resolveRouteSentinels.js'
import { resolveFilterValue, isOptionalUnresolved } from './resolveFilterTokens.js'
import { SENTINEL_CONTEXTS, contextOf, matchDeprecation, looksLikeSentinel } from './sentinelTokens.js'

/**
 * Dispatch table: canonical context → the resolver that owns it. Documentation
 * + programmatic lookup; the actual routing in {@link resolveManifestSubtree}
 * uses the same source-of-truth classifier ({@link contextOf}).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SENTINEL_RESOLVERS = Object.freeze({
	filter: 'resolveFilterTokens',
	config: 'resolveManifestSentinels / resolveFilterTokens',
	object: 'resolveFilterTokens',
	workspace: 'resolveFilterTokens',
	route: 'resolveRouteSentinels',
	declarative: 'fetchAggregate (OpenRegister server-side)',
	visibleWhen: 'evaluateVisibleWhen (utils/visibleWhen.js)',
})

/**
 * Process-wide set of deprecated tokens already warned about, so the same
 * deprecated token referenced from many pages warns once. Cleared by
 * {@link clearDeprecationWarnings} (test-only).
 *
 * @type {Set<string>}
 */
const _warnedDeprecations = new Set()

/**
 * Reset the one-time deprecation-warning dedup set. Test-only.
 *
 * @return {void}
 */
export function clearDeprecationWarnings() {
	_warnedDeprecations.clear()
}

/**
 * Emit a one-time deprecation warning for `token` if it is on the deprecation
 * map. Idempotent per token for the process lifetime.
 *
 * @param {string} token The `@`-prefixed token.
 * @param {Function} warn console.warn override (tests).
 * @return {boolean} True when the token is deprecated (regardless of whether a
 *   warning was emitted this call).
 */
export function warnIfDeprecated(token, warn) {
	const dep = matchDeprecation(token)
	if (!dep) return false
	if (!_warnedDeprecations.has(token)) {
		_warnedDeprecations.add(token)
		const target = dep.replacement
			? `use '${dep.replacement}' instead`
			: 'it will be removed with no direct replacement'
		warn(
			`[resolveManifestTokens] Deprecated sentinel token '${token}' — ${target} `
			+ `(removal ${dep.removal}). ${dep.note}`,
		)
	}
	return true
}

/**
 * Resolve every sentinel token in a manifest subtree through the single
 * dispatch, routing each by context to its existing resolver.
 *
 * Behaviour is the composition of the existing resolvers, so this is a
 * drop-in for a caller that previously ran `resolveRouteSentinels` then a
 * `resolveFilterTokens`-style pass by hand.
 *
 * @param {*} value The subtree (typically a `pages[].config` block). Not mutated.
 * @param {object} [opts] Resolution inputs.
 * @param {object} [opts.params] vue-router params for `@route.<param>`.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [opts.ctx]
 *   Context forwarded to {@link resolveFilterValue} for filter / object /
 *   workspace / `@config.<key>` tokens.
 * @param {string} [opts.pageId] Page id for route-resolver warning dedup.
 * @param {Function} [opts.warn] console.warn override (tests).
 * @return {{value: *, unresolved: string[]}} The resolved subtree plus the
 *   list of tokens that stayed unresolved (excluding OPTIONAL `?` tokens, which
 *   are meant to be dropped, not waited on).
 */
export function resolveManifestSubtree(value, opts = {}) {
	const params = opts.params && typeof opts.params === 'object' ? opts.params : {}
	const ctx = opts.ctx && typeof opts.ctx === 'object' ? opts.ctx : {}
	const pageId = opts.pageId || '<unknown>'
	const warn = opts.warn ?? ((...args) => {
		// eslint-disable-next-line no-console
		console.warn(...args)
	})

	// Pass 1: route context (reuses the reference-preserving route walker,
	// including its own per-page unresolved warning).
	const afterRoute = resolveRouteSentinels(value, params, pageId)

	// Pass 2: filter / object / workspace / @config.<key> contexts, per leaf,
	// via the existing resolveFilterValue. Deprecated tokens warn once.
	const unresolved = []
	const walk = (node) => {
		if (typeof node === 'string') {
			if (!looksLikeSentinel(node)) return node
			warnIfDeprecated(node, warn)
			const resolved = resolveFilterValue(node, ctx)
			if (resolved === node && !isOptionalUnresolved(node)) {
				// Still a raw token: unresolved unless it is a load-time / server-side
				// context this render-pass deliberately leaves alone.
				const c = contextOf(node)
				if (c !== 'config' && c !== 'declarative' && c !== 'visibleWhen') unresolved.push(node)
			}
			return resolved
		}
		if (Array.isArray(node)) return node.map(walk)
		if (node && typeof node === 'object') {
			const out = {}
			for (const [k, v] of Object.entries(node)) out[k] = walk(v)
			return out
		}
		return node
	}

	return { value: walk(afterRoute), unresolved }
}

export { SENTINEL_CONTEXTS }
