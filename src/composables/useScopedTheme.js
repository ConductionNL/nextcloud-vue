// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * useScopedTheme — shared runtime applier for nldesign's scoped
 * theme-application contract (`app-token-set-selection`,
 * "Scoped Application Contract for Base Token CSS").
 *
 * Ports Buildiq's proven `useAppTheme` composable
 * (`openbuild/src/composables/useAppTheme.js`, spec
 * `nldesign-theme-selection` REQ-NTS-003) into `@conduction/nextcloud-vue`
 * so any manifest-driven Conduction app can reuse it instead of
 * reimplementing the rewriter. The behaviour is deliberately close to
 * byte-identical to Buildiq's original — only the scope-attribute target
 * changes, from `data-openbuild-theme-scope` to the design-system-owned
 * `data-nldesign-theme-scope`.
 *
 * When a resolved manifest declares `runtime.theme`, `apply()`:
 *
 *   1. fetches the static token asset `css/tokens/<tokenSet>.css` via
 *      `generateFilePath('nldesign', 'css', 'tokens/<tokenSet>.css')` — a
 *      plain web-served asset, no controller, read with the NC session;
 *   2. verifies the fetched text is EXACTLY one flat `:root { }` block with
 *      no at-rules and no other selector — bail-and-degrade (inject
 *      nothing) on anything else, never a partial rewrite;
 *   3. rewrites `:root` to `[data-nldesign-theme-scope="<scopeId>"]` (a 1:1
 *      selector-prefix transform — no property name, value, or declaration
 *      order altered); and
 *   4. injects the result as exactly one managed
 *      `<style data-nldesign-theme="<scopeId>">` element, removed on
 *      `teardown()`.
 *
 * Progressive enhancement is a hard requirement throughout: nldesign
 * absent, unreachable, or serving non-conformant CSS never throws and never
 * blocks the app shell — it degrades to default (unscoped) styling with at
 * most a `console.warn`. This composable NEVER writes any nldesign
 * endpoint/appconfig and NEVER injects an unscoped `:root` rule, so
 * nldesign's instance-global theming and the NC chrome are untouched.
 *
 * `listTokenSets()` / `evaluateContrast()` are thin, failure-tolerant
 * wrappers over nldesign's `GET /api/token-sets` / `POST
 * /api/contrast/evaluate` so a leaf picker never re-implements WCAG math or
 * catalogue discovery.
 *
 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-1
 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-2
 */
import axios from '@nextcloud/axios'
import { generateFilePath, generateUrl } from '@nextcloud/router'

const STYLE_ATTR = 'data-nldesign-theme'
export const SCOPE_ATTR = 'data-nldesign-theme-scope'

/** Session cache of fetched (raw) token CSS, keyed by token-set id. */
const cssCache = new Map()

/**
 * Rewrite every `:root` selector in `css` to the scoped attribute selector.
 * Returns null when the CSS contains a construct the rewriter does not
 * positively recognise (so the caller bails out rather than inject
 * partially scoped CSS that could leak unscoped rules).
 *
 * Recognised input: a sequence of `:root { ...declarations... }` blocks
 * plus CSS comments and whitespace. Anything else (at-rules, non-`:root`
 * selectors, nesting) ⇒ null.
 *
 * Ported deliberately close to byte-identical to Buildiq's
 * `rewriteRootScope` (only the scope-attribute target string changes) to
 * avoid introducing a NEW defensive-CSS edge case nldesign's contract
 * doesn't already cover.
 *
 * @param {string} css - the raw token CSS.
 * @param {string} scopeSelector - e.g. `[data-nldesign-theme-scope="petstore"]`.
 * @return {?string} - the rewritten CSS, or null to bail out.
 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-1
 */
export function rewriteRootScope(css, scopeSelector) {
	if (typeof css !== 'string' || css.trim() === '') {
		return null
	}
	// Strip CSS comments first (they may contain braces / @ that confuse the scan).
	const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
	// Bail on any at-rule — these cannot be flat-scoped by a prefix transform.
	if (/@[a-zA-Z-]+/.test(withoutComments)) {
		return null
	}
	const out = []
	let rest = withoutComments
	const blockRe = /^\s*:root\s*\{([^{}]*)\}\s*/
	while (rest.trim() !== '') {
		const match = blockRe.exec(rest)
		if (!match) {
			// A non-:root selector, nested block, or stray token — not safe.
			return null
		}
		out.push(`${scopeSelector} {${match[1]}}`)
		rest = rest.slice(match[0].length)
	}
	if (out.length === 0) {
		return null
	}
	return out.join('\n')
}

/**
 * Escape a slug for safe use inside an attribute-selector string literal.
 * Slugs are kebab-case in practice; this guards the injection boundary anyway.
 *
 * @param {string} value - the slug.
 * @return {string}
 */
function cssAttrEscape(value) {
	return String(value).replace(/["\\]/g, '\\$&')
}

/**
 * Scoped-theme applier bound to one nldesign app slug.
 *
 * @param {object} [opts] - options.
 * @param {Function} [opts.client] - axios-like client injection for tests.
 * @param {Document|object} [opts.doc] - document injection for tests / SSR safety.
 * @param {Function} [opts.warn] - console.warn injection for tests.
 * @param {string} [opts.appSlug] - Pin the theme app's Nextcloud id (URL-building only). Omitted, the id is resolved across `nldesign` and `thematiq` — see the note in the body.
 * @return {{apply: Function, teardown: Function, fetchTokenCss: Function, listTokenSets: Function, evaluateContrast: Function}}
 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-1
 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-2
 */
export function useScopedTheme(opts = {}) {
	const client = opts.client || axios
	const doc = opts.doc || (typeof document !== 'undefined' ? document : null)
	const warn = opts.warn || ((m) => { try { console.warn(m) } catch { /* noop */ } })
	/*
	 * The theme app's Nextcloud id is RENAMING (`nldesign` -> `thematiq`), and
	 * the two ids will be live at the same time: an instance running the
	 * published stable release answers on `nldesign`, one running a newer build
	 * answers on `thematiq`. Every URL below is built from that id, so pinning
	 * either one makes this composable fetch nothing on half the fleet — and it
	 * fails SILENTLY, because every path here degrades to default styling by
	 * design (REQ-STA-1). No error, no log, just an unthemed app.
	 *
	 * So the id is RESOLVED, not assumed: try each candidate until one answers,
	 * then remember it for the rest of the session. `nldesign` goes first
	 * because it is what is deployed today, which keeps the common case at one
	 * request; the order stops mattering once `resolvedSlug` is set.
	 *
	 * An explicit `opts.appSlug` still wins outright — callers that know the id
	 * (and the tests) keep the old exact-slug contract.
	 *
	 * Note this is the APP id only. `theme.source === 'nldesign'` below is the
	 * DESIGN-SYSTEM id, an external Dutch-government standard that is not
	 * renaming and must not be touched.
	 */
	const slugCandidates = opts.appSlug ? [opts.appSlug] : ['nldesign', 'thematiq']
	let resolvedSlug = null

	/**
	 * Whether a response body is the app actually answering, rather than
	 * Nextcloud's fallback for a route that does not exist.
	 *
	 * Status alone cannot decide this: Nextcloud serves HTML (a login or error
	 * page) with a 200 in several situations, and a token stylesheet that is
	 * really a login page would be injected as CSS and style nothing.
	 *
	 * @param {*} body - the response body.
	 * @return {boolean} True when the body is not an HTML document.
	 */
	function looksLikeApp(body) {
		if (typeof body !== 'string') {
			return true
		}
		return !/^\s*(<!doctype html|<html[\s>])/i.test(body)
	}

	/**
	 * Run a request against each candidate app id until one answers.
	 *
	 * @param {Function} attempt - `(slug) => Promise<*>`, resolving to the body.
	 * @return {Promise<*>} The first usable body.
	 * @throws {Error} When no candidate answers, so callers keep degrading as before.
	 */
	async function withResolvedSlug(attempt) {
		const order = resolvedSlug
			? [resolvedSlug, ...slugCandidates.filter((s) => s !== resolvedSlug)]
			: slugCandidates
		let lastError = null
		for (const slug of order) {
			try {
				const body = await attempt(slug)
				if (!looksLikeApp(body)) {
					continue
				}
				resolvedSlug = slug
				return body
			} catch (e) {
				lastError = e
			}
		}
		throw lastError || new Error('no theme app answered')
	}

	/**
	 * Fetch the raw token CSS for a set (session-cached).
	 *
	 * @param {string} tokenSet - the token-set id.
	 * @return {Promise<?string>} - the raw CSS, or null on failure.
	 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-1
	 */
	async function fetchTokenCss(tokenSet) {
		if (cssCache.has(tokenSet)) {
			return cssCache.get(tokenSet)
		}
		try {
			const data = await withResolvedSlug(async (slug) => {
				const url = generateFilePath(slug, 'css', `tokens/${tokenSet}.css`)
				const res = await client.get(url, { responseType: 'text' })
				return res.data
			})
			const css = typeof data === 'string' ? data : String(data || '')
			cssCache.set(tokenSet, css)
			return css
		} catch {
			cssCache.set(tokenSet, null)
			return null
		}
	}

	/**
	 * Apply the manifest's `runtime.theme` to the given scope. No-op (and
	 * removes any prior managed style for the scope) when the manifest
	 * declares no theme. Degrades to default styling on any failure
	 * (REQ-STA-1).
	 *
	 * @param {object} manifest - the resolved (effective) manifest.
	 * @param {string} scopeId - the scope id (e.g. the consuming app's `appId`).
	 * @return {Promise<boolean>} - true when a scoped style was injected.
	 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-1
	 */
	async function apply(manifest, scopeId) {
		teardown(scopeId)
		const theme = manifest && manifest.runtime && manifest.runtime.theme
		if (!theme || theme.source !== 'nldesign' || !theme.tokenSet || !scopeId || !doc) {
			return false
		}
		const css = await fetchTokenCss(theme.tokenSet)
		if (css === null) {
			warn(`[nextcloud-vue] NL Design token set "${theme.tokenSet}" could not be loaded; rendering in default styling.`)
			return false
		}
		const scopeSelector = `[${SCOPE_ATTR}="${cssAttrEscape(scopeId)}"]`
		const rewritten = rewriteRootScope(css, scopeSelector)
		if (rewritten === null) {
			warn(`[nextcloud-vue] NL Design token set "${theme.tokenSet}" is not a flat :root stylesheet; skipping scoped theme.`)
			return false
		}
		const style = doc.createElement('style')
		style.setAttribute(STYLE_ATTR, scopeId)
		style.textContent = rewritten
		;(doc.head || doc.body || doc.documentElement).appendChild(style)
		return true
	}

	/**
	 * Remove the managed style element for this scope, if present. Safe to
	 * call when nothing was ever applied.
	 *
	 * @param {string} scopeId - the scope id.
	 * @return {void}
	 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-1
	 */
	function teardown(scopeId) {
		if (!doc || !scopeId || !doc.querySelectorAll) {
			return
		}
		const existing = doc.querySelectorAll(`style[${STYLE_ATTR}="${cssAttrEscape(scopeId)}"]`)
		existing.forEach((el) => {
			if (el.parentNode) {
				el.parentNode.removeChild(el)
			}
		})
	}

	/**
	 * List nldesign's token-set catalogue. Returns `[]` on ANY failure
	 * (missing app, network error, non-2xx, malformed body) — never throws.
	 * A leaf picker calling this can render an empty catalogue exactly as
	 * it would render "no sets yet"; it never has to special-case
	 * "nldesign is absent" itself.
	 *
	 * @return {Promise<Array<object>>}
	 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-2
	 */
	async function listTokenSets() {
		try {
			const data = await withResolvedSlug(async (slug) => {
				const res = await client.get(generateUrl(`/apps/${slug}/api/token-sets`))
				// A body without `tokenSets` is not this app answering; let the
				// next candidate try rather than caching an empty catalogue.
				if (!res.data || !Array.isArray(res.data.tokenSets)) {
					throw new Error('not a token-set response')
				}
				return res.data
			})
			const tokenSets = data && Array.isArray(data.tokenSets) ? data.tokenSets : null
			return tokenSets || []
		} catch {
			return []
		}
	}

	/**
	 * Evaluate contrast facts for a set of candidate colors against a
	 * background. Returns `null` on any failure — distinct from
	 * `listTokenSets()`'s `[]` because "no results" and "the check could
	 * not run" are different facts a picker's contrast-preview UI needs to
	 * tell apart. Never throws, never fabricates a `blocked`/`allowed`/
	 * `verdict` field the underlying nldesign response does not itself
	 * carry.
	 *
	 * @param {Array<object>} candidates - `{ name, value, role }` entries.
	 * @param {string} background - the background color to evaluate against.
	 * @return {Promise<?Array<object>>}
	 * @spec openspec/changes/scoped-theme-applier/specs/scoped-theme-applier/spec.md#req-sta-2
	 */
	async function evaluateContrast(candidates, background) {
		try {
			const data = await withResolvedSlug(async (slug) => {
				const url = generateUrl(`/apps/${slug}/api/contrast/evaluate`)
				const res = await client.post(url, { candidates, background })
				// Same reasoning as listTokenSets: a body without `results` is
				// not this app, so try the other id before giving up.
				if (!res.data || !Array.isArray(res.data.results)) {
					throw new Error('not a contrast response')
				}
				return res.data
			})
			const results = data && Array.isArray(data.results) ? data.results : null
			return results === null ? null : results
		} catch {
			return null
		}
	}

	return { apply, teardown, fetchTokenCss, listTokenSets, evaluateContrast }
}

/**
 * Test-only helper to clear the module-level session token-CSS cache.
 * Not exported from the package barrel — only the test suite imports it
 * directly (mirrors `useAppTheme`'s `clearThemeCache`).
 *
 * @return {void}
 */
export function clearScopedThemeCache() {
	cssCache.clear()
}
