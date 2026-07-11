/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Closed, context-partitioned manifest **sentinel-token vocabulary** — the
 * single source of truth for every `@`-prefixed dynamic value a manifest may
 * carry under `pages[].config` or a widget `filter`/`dataSource`.
 *
 * Before this module the token surface was scattered across four resolvers
 * (`resolveManifestSentinels`, `resolveFilterTokens`, `resolveRouteSentinels`,
 * `fetchAggregate`) plus ad-hoc single-app inventions (`@currentFiscalYear`,
 * `@page.*`, `@runtime`). This module declares the vocabulary ONCE so:
 *
 *  1. the JSON-Schema `$defs` in `app-manifest-v2.schema.json` reject an
 *     out-of-vocabulary token (the pattern strings here are the exact strings
 *     mirrored into the schema — a unit test enforces byte-equality);
 *  2. the shared resolver dispatch (`resolveManifestTokens.js`) and the four
 *     resolvers import their token patterns from here rather than re-declaring
 *     them, so the runtime and the schema cannot drift;
 *  3. a hydra manifest gate can `scanManifestTokens()` an app and FAIL an
 *     unknown token / WARN a deprecated one, reusing this export (no hardcoded
 *     copy).
 *
 * ## Context partitions
 *
 * A token is valid only in the context whose resolver runs on it:
 *
 *  - **filter**       — `resolveFilterTokens`, resolved at fetch time:
 *                       `@me`, `@now`, `@today`, `@today±Nd`, `@monthStart`,
 *                       `@quarterStart`, `@yearStart`.
 *  - **config**       — `IAppConfig`-sourced: `@resolve:<key>`, `@config.<key>`
 *                       (trailing `?` marks optional).
 *  - **object**       — detail-page object context: `@objectId`,
 *                       `@object.<field>`.
 *  - **workspace**    — page-level workspace state: `@workspace.<key>`
 *                       (trailing `?` optional).
 *  - **route**        — `resolveRouteSentinels`: `@route.<param>`.
 *  - **declarative**  — OpenRegister direction, resolved server-side:
 *                       `@self.<field>` (the object's own field in a
 *                       cross-object calc), `@ref:<path>`, `@aggregate:<expr>`.
 *  - **visibleWhen**  — the shared `visibleWhen` predicate's `source`-mode
 *                       collection-total marker, resolved client-side by
 *                       `evaluateVisibleWhen` (`utils/visibleWhen.js`):
 *                       `@total` (a `field: "@total"` — or omitted `field` —
 *                       compares the collection total rather than the first
 *                       result). Added for manifest-form-logic:
 *                       `config.fields[].visibleWhen` is the first
 *                       `visibleWhen` reachable through the
 *                       sentinelGuardedValue-guarded `pages[].config` subtree.
 *
 * `@ref`/`@aggregate` are first-class members even though currently unused
 * fleet-wide — they are the OR-declarative direction and belong in the closed
 * vocabulary so a future adopter validates rather than inventing a variant.
 *
 * @module utils/sentinelTokens
 */

/**
 * Pattern STRINGS, one per context — the canonical source mirrored verbatim
 * into `app-manifest-v2.schema.json`'s `$defs`. A unit test asserts each schema
 * `$def`'s `pattern` equals the string here, so the two cannot drift.
 *
 * NOTE: these are JS string literals; a `\\.` here is the two-character
 * sequence `\.` at runtime, which is exactly what the JSON schema stores after
 * its own `\\.` is parsed. Compare PARSED values, never raw source.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SENTINEL_TOKEN_PATTERNS = Object.freeze({
	filter: '^@(?:me|now|today|monthStart|quarterStart|yearStart)$|^@today[+-][0-9]+d$',
	config: '^@resolve:[a-z][a-z0-9_-]*$|^@config\\.[A-Za-z][A-Za-z0-9_.]*\\??$',
	object: '^@objectId$|^@object\\.[A-Za-z][A-Za-z0-9_]*$',
	workspace: '^@workspace\\.[A-Za-z][A-Za-z0-9_]*\\??$',
	route: '^@route\\.[A-Za-z][A-Za-z0-9_-]*$',
	declarative: '^@self\\.[A-Za-z][A-Za-z0-9_]*$|^@ref:[A-Za-z][A-Za-z0-9_./-]*$|^@aggregate:.+$',
	// manifest-form-logic: the shared visibleWhen predicate's source-mode
	// collection-total marker (`field: "@total"`), resolved client-side by
	// evaluateVisibleWhen — not one of the four IAppConfig/OpenRegister
	// resolvers, but a real pre-existing convention (already documented on
	// $defs.visibleWhen and the banner widget) now reachable through the
	// sentinelGuardedValue-guarded pages[].config subtree for the first time
	// via config.fields[].visibleWhen.
	visibleWhen: '^@total$',
	// Deprecated-but-not-yet-removed tokens. Kept in the schema union so
	// deployed manifests still validate during the migration window; the gate
	// downgrades them to a WARN (see SENTINEL_DEPRECATIONS).
	deprecated: '^@currentFiscalYear$|^@page\\.[A-Za-z][A-Za-z0-9_]*$|^@runtime(?:\\.[A-Za-z][A-Za-z0-9_]*)?$',
})

/**
 * The eight canonical context names (excludes `deprecated`, which is a
 * transitional overlay, not a resolution context).
 *
 * @type {string[]}
 */
export const SENTINEL_CONTEXTS = Object.freeze([
	'filter', 'config', 'object', 'workspace', 'route', 'declarative', 'visibleWhen',
])

/**
 * Human-readable vocabulary: members + context + owning resolver + parameter
 * grammar. Documentation-facing (feeds audit item 16 schema-generated docs);
 * the machine-checkable truth is {@link SENTINEL_TOKEN_PATTERNS}.
 *
 * @type {Readonly<Record<string, {resolver: string, description: string, members: string[]}>>}
 */
export const SENTINEL_VOCABULARY = Object.freeze({
	filter: {
		resolver: 'resolveFilterTokens',
		description: 'Relative fetch-time tokens (current user / relative dates).',
		members: ['@me', '@now', '@today', '@today±Nd', '@monthStart', '@quarterStart', '@yearStart'],
	},
	config: {
		resolver: 'resolveManifestSentinels / resolveFilterTokens',
		description: 'IAppConfig-sourced values. `@resolve:<key>` at manifest-load time; `@config.<key>` (trailing `?` optional) at fetch time.',
		members: ['@resolve:<key>', '@config.<key>', '@config.<key>?'],
	},
	object: {
		resolver: 'resolveFilterTokens',
		description: 'Detail-page object context. Resolve only when a `{ objectId, object }` ctx is supplied.',
		members: ['@objectId', '@object.<field>'],
	},
	workspace: {
		resolver: 'resolveFilterTokens',
		description: 'Page-level workspace state (e.g. a selected client / period). Trailing `?` marks optional (drop when unset).',
		members: ['@workspace.<key>', '@workspace.<key>?'],
	},
	route: {
		resolver: 'resolveRouteSentinels',
		description: 'vue-router param substitution at render time.',
		members: ['@route.<param>'],
	},
	declarative: {
		resolver: 'fetchAggregate (OpenRegister server-side)',
		description: 'OpenRegister declarative direction — resolved server-side. `@self.<field>` is the object\'s own field in a cross-object calc; `@ref`/`@aggregate` are reserved (currently unused fleet-wide).',
		members: ['@self.<field>', '@ref:<path>', '@aggregate:<expr>'],
	},
	visibleWhen: {
		resolver: 'evaluateVisibleWhen (utils/visibleWhen.js)',
		description: 'The shared visibleWhen predicate\'s source-mode collection-total marker. `field: "@total"` (or an omitted `field`) compares the collection total instead of the first result.',
		members: ['@total'],
	},
})

/**
 * Machine-readable deprecation map: single-app inventions → canonical
 * replacement (or `null` for removal) + removal date. The shared resolver still
 * resolves a deprecated token during the window (emitting a one-time warn); the
 * gate WARNs (not fails) until `removal`. Each entry carries a `test` RegExp so
 * a parameterised deprecated token (`@page.period`) matches its family.
 *
 * @type {Readonly<Record<string, {test: RegExp, replacement: (string|null), removal: string, note: string}>>}
 */
export const SENTINEL_DEPRECATIONS = Object.freeze({
	'@currentFiscalYear': {
		test: /^@currentFiscalYear$/,
		replacement: '@config.fiscalYear',
		removal: '2026-10-01',
		note: 'Single-app invention (shillinq). Source the fiscal year from IAppConfig instead of the calendar year.',
	},
	'@page.<key>': {
		test: /^@page\.[A-Za-z][A-Za-z0-9_]*$/,
		replacement: '@workspace.<key>',
		removal: '2026-10-01',
		note: 'Single-app invention (pipelinq). Page-context state is the workspace context; use @workspace.<key>.',
	},
	'@runtime': {
		test: /^@runtime(?:\.[A-Za-z][A-Za-z0-9_]*)?$/,
		replacement: null,
		removal: '2026-10-01',
		note: 'Single-app invention. No canonical equivalent — resolve via @workspace.<key> / @route.<param> or remove.',
	},
})

// --- Runtime RegExps (the resolvers import these — one source of truth) -----

/** `@resolve:<key>` — full match with a captured key group. */
export const RESOLVE_TOKEN_RE = /^@resolve:([a-z][a-z0-9_-]*)$/

/** `@route.<param>` — full match with a captured param group. */
export const ROUTE_TOKEN_RE = /^@route\.([A-Za-z][A-Za-z0-9_-]*)$/

/** `@today±Nd` — full match with a captured signed-day-delta group. */
export const TODAY_DELTA_RE = /^@today([+-]\d+)d$/

/** Compiled per-context matchers (anchored, from SENTINEL_TOKEN_PATTERNS). */
const CONTEXT_RE = Object.freeze(
	Object.fromEntries(
		Object.entries(SENTINEL_TOKEN_PATTERNS).map(([ctx, pat]) => [ctx, new RegExp(pat)]),
	),
)

/**
 * True when `value` is a string that begins with `@` (i.e. shaped like a
 * sentinel, regardless of membership).
 *
 * @param {*} value Candidate.
 * @return {boolean}
 */
export function looksLikeSentinel(value) {
	return typeof value === 'string' && value.charAt(0) === '@'
}

/**
 * The canonical context a token belongs to, or `null` if it is not a member of
 * any canonical context. Deprecated tokens return `null` here (they are not a
 * canonical context) — use {@link matchDeprecation} to detect those.
 *
 * @param {string} token The `@`-prefixed token.
 * @return {(string|null)} A member of {@link SENTINEL_CONTEXTS} or null.
 */
export function contextOf(token) {
	if (typeof token !== 'string') return null
	for (const ctx of SENTINEL_CONTEXTS) {
		if (CONTEXT_RE[ctx].test(token)) return ctx
	}
	return null
}

/**
 * True when `token` is a member of the closed CANONICAL vocabulary (any
 * context). Deprecated tokens are NOT canonical (return false).
 *
 * @param {string} token The `@`-prefixed token.
 * @return {boolean}
 */
export function isKnownToken(token) {
	return contextOf(token) !== null
}

/**
 * The deprecation entry matching `token`, or `null`. A deprecated token is
 * accepted by the schema (its pattern is in the union) but the gate + resolver
 * flag it.
 *
 * @param {string} token The `@`-prefixed token.
 * @return {({key: string, replacement: (string|null), removal: string, note: string}|null)}
 */
export function matchDeprecation(token) {
	if (typeof token !== 'string') return null
	for (const [key, entry] of Object.entries(SENTINEL_DEPRECATIONS)) {
		if (entry.test.test(token)) {
			return { key, replacement: entry.replacement, removal: entry.removal, note: entry.note }
		}
	}
	return null
}

/**
 * Classify a token for gate / dispatcher consumption.
 *
 * @param {string} token The `@`-prefixed token.
 * @return {{status: ('known'|'deprecated'|'unknown'), context: (string|null), deprecation: (object|null)}}
 */
export function classifyToken(token) {
	const deprecation = matchDeprecation(token)
	if (deprecation) return { status: 'deprecated', context: null, deprecation }
	const context = contextOf(token)
	if (context) return { status: 'known', context, deprecation: null }
	return { status: 'unknown', context: null, deprecation: null }
}

/**
 * Scan a manifest's `pages[].config` and widget `filter`/`dataSource` string
 * leaves for `@`-prefixed values and bucket them. The reusable CORE of the
 * hydra token-vocabulary gate — the gate wraps this (diff-scope + exit code)
 * and MUST import it rather than hardcode the vocabulary.
 *
 * Only `@`-prefixed strings under `pages[]` are considered (router/registry
 * invariants elsewhere are out of scope, matching the schema `$def` placement).
 *
 * @param {object} manifest A parsed manifest object.
 * @return {{unknown: Array<{token: string, path: string}>,
 *           deprecated: Array<{token: string, path: string, replacement: (string|null), removal: string}>,
 *           known: number}}
 */
export function scanManifestTokens(manifest) {
	const unknown = []
	const deprecated = []
	let known = 0

	const visit = (node, path) => {
		if (typeof node === 'string') {
			if (!looksLikeSentinel(node)) return
			const c = classifyToken(node)
			if (c.status === 'deprecated') {
				deprecated.push({ token: node, path, replacement: c.deprecation.replacement, removal: c.deprecation.removal })
			} else if (c.status === 'unknown') {
				unknown.push({ token: node, path })
			} else {
				known += 1
			}
			return
		}
		if (Array.isArray(node)) {
			node.forEach((item, i) => visit(item, `${path}[${i}]`))
			return
		}
		if (node && typeof node === 'object') {
			for (const [k, v] of Object.entries(node)) visit(v, `${path}.${k}`)
		}
	}

	const pages = manifest && Array.isArray(manifest.pages) ? manifest.pages : []
	pages.forEach((page, i) => {
		if (!page || typeof page !== 'object') return
		if (page.config && typeof page.config === 'object') visit(page.config, `pages[${i}].config`)
		if (Array.isArray(page.widgets)) visit(page.widgets, `pages[${i}].widgets`)
	})

	return { unknown, deprecated, known }
}
