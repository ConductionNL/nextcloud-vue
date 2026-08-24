/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Forge abstraction for the in-product feature-request deep-link.
 *
 * The Conduction fleet's source of truth moved from GitHub to Codeberg
 * (Forgejo). The two forges prefill a "new issue" form very differently,
 * so each forge type gets its own URL builder:
 *
 *   - **github** — GitHub Issue Forms support per-field deep-linking: a
 *     `template=<file>` plus one query parameter per form-field `id`
 *     (`problem`, `proposed-solution`, …). The pre-filled form renders
 *     field-by-field on github.com.
 *
 *   - **codeberg / forgejo / gitea** — Forgejo/Gitea only support the
 *     universal `title` + `body` query parameters
 *     (https://forgejo.org/docs/latest/user/issue-pull-request-templates/);
 *     there is no per-field deep-link. So the structured fields are
 *     assembled into a single Markdown `body` instead.
 *
 * Switching the whole fleet back to GitHub (or onto a self-hosted
 * Forgejo/Gitea) is a one-line config change: set `forge.type` (and
 * `forge.baseUrl` for self-hosted) on the manifest's `nav.forge`. Nothing
 * else in the suggestion flow needs to change.
 */

/**
 * Default host per forge type. `forgejo`/`gitea` are self-hosted, so they
 * have no canonical public host — a `baseUrl` MUST be supplied for those.
 *
 * @type {Record<string, string>}
 */
export const FORGE_DEFAULT_BASE_URLS = {
	codeberg: 'https://codeberg.org',
	github: 'https://github.com',
	forgejo: '',
	gitea: '',
}

/**
 * Fleet default forge. GitHub is the only host the fleet publishes to,
 * including for issues.
 *
 * This defaulted to Codeberg, and NO app overrides it — none of the fleet
 * manifests carries a `forge` entry — so every app's in-product "Request a
 * feature" deep-link pointed at an unmaintained mirror. The failure was
 * invisible from the app side: each app looked correctly configured because
 * it configured nothing.
 *
 * Changing the type also changes the URL SHAPE, not just the host:
 * `github` builds a per-field Issue-Form link (`template=` + field params),
 * while `codeberg`/`forgejo`/`gitea` assemble a Markdown body. That form is
 * `.github/ISSUE_TEMPLATE/feature-request.yml`, which must exist in the
 * consuming repo — see buildFeatureRequestUrl below.
 *
 * @type {{type: string, baseUrl: string}}
 */
export const DEFAULT_FORGE = {
	type: 'github',
	baseUrl: FORGE_DEFAULT_BASE_URLS.github,
}

const ISSUE_FORM_TEMPLATE = 'feature-request.yml'

/**
 * Normalise a (possibly partial) forge config to `{type, baseUrl}` with a
 * resolved host. Falls back to the GitHub default for an unknown/empty
 * type, and to the type's canonical host when `baseUrl` is omitted.
 *
 * @param {{type?: string, baseUrl?: string}|null|undefined} forge Raw config.
 * @return {{type: string, baseUrl: string}} Resolved config.
 */
export function resolveForge(forge) {
	const type = (forge && forge.type) || DEFAULT_FORGE.type
	const baseUrl = (forge && forge.baseUrl)
		|| FORGE_DEFAULT_BASE_URLS[type]
		|| DEFAULT_FORGE.baseUrl
	return { type, baseUrl: baseUrl.replace(/\/+$/, '') }
}

/**
 * Human-facing display name for a forge type (a proper noun — never
 * translated). Used in button labels and explanatory copy.
 *
 * @param {string} type Forge type (`codeberg` | `github` | `forgejo` | `gitea`).
 * @return {string} Display name, e.g. `Codeberg`. Title-cases unknown types.
 */
export function forgeDisplayName(type) {
	const names = { codeberg: 'Codeberg', github: 'GitHub', forgejo: 'Forgejo', gitea: 'Gitea' }
	if (names[type]) return names[type]
	return type ? type.charAt(0).toUpperCase() + type.slice(1) : ''
}

/**
 * Assemble the structured fields into a Markdown issue body for forges that
 * only support `title` + `body` prefill (Forgejo/Gitea/Codeberg).
 *
 * @param {object} p Field + context payload (see buildFeatureRequestUrl).
 * @return {string} Markdown body.
 */
function buildMarkdownBody(p) {
	const sections = [
		['Problem', p.problem],
		['Proposed solution', p.proposedSolution],
		['Who benefits', p.whoBenefits],
		['How important is this to you?', p.priorityToYou],
		['Anything else?', p.anythingElse],
	]
	const lines = []
	for (const [heading, value] of sections) {
		const v = (value || '').trim()
		if (!v) continue
		lines.push(`## ${heading}`, '', v, '')
	}

	const ctx = p.context || {}
	const ctxItems = [
		['App', ctx.app],
		['Page', ctx.page],
		['Surface', ctx.surface],
		['Object', ctx.object],
		['Spec ref', ctx.specRef],
	].filter(([, v]) => (v || '').trim())
	if (ctxItems.length) {
		lines.push('---', '')
		for (const [label, v] of ctxItems) {
			lines.push(`- **${label}:** ${v.trim()}`)
		}
	}
	return lines.join('\n').trim()
}

/**
 * Build the "new issue" deep-link for the given forge.
 *
 * @param {{type?: string, baseUrl?: string}} forge Forge config (resolved internally).
 * @param {string} repo `<owner>/<repo>` slug on the forge.
 * @param {object} payload Suggestion payload.
 * @param {string} payload.title Short summary (without the [FEATURE] prefix).
 * @param {string} payload.problem What the user can't do today.
 * @param {string} payload.proposedSolution How the user would like it to work.
 * @param {string} payload.whoBenefits Which role/workflow this serves.
 * @param {string} payload.priorityToYou Resolved priority string.
 * @param {string} [payload.anythingElse] Optional extra context.
 * @param {object} [payload.context] Auto-captured surface context.
 * @param {string} [payload.context.app] Host app id.
 * @param {string} [payload.context.page] Manifest page id + route.
 * @param {string} [payload.context.surface] Active widget/modal/tab.
 * @param {string} [payload.context.object] Register · Schema · UUID viewed.
 * @param {string} [payload.context.specRef] Capability slug the surface belongs to.
 * @return {string} Absolute URL safe to pass to window.open.
 */
export function buildFeatureRequestUrl(forge, repo, payload) {
	const { type, baseUrl } = resolveForge(forge)
	const title = `[FEATURE] ${(payload.title || '').trim()}`
	const params = new URLSearchParams()

	if (type === 'github') {
		// GitHub Issue Form: one query param per form-field id.
		const ctx = payload.context || {}
		params.set('template', ISSUE_FORM_TEMPLATE)
		params.set('title', title)
		params.set('problem', (payload.problem || '').trim())
		params.set('proposed-solution', (payload.proposedSolution || '').trim())
		params.set('who-benefits', (payload.whoBenefits || '').trim())
		if (payload.priorityToYou) params.set('priority-to-you', payload.priorityToYou)
		if ((payload.anythingElse || '').trim()) params.set('context', payload.anythingElse.trim())
		if (ctx.app) params.set('app', ctx.app)
		if (ctx.page) params.set('page', ctx.page)
		if (ctx.surface) params.set('surface', ctx.surface)
		if (ctx.object) params.set('object', ctx.object)
		if (ctx.specRef) params.set('spec-ref', ctx.specRef)
		return `${baseUrl}/${repo}/issues/new?${params.toString()}`
	}

	// Forgejo / Gitea / Codeberg: only title + body are supported.
	params.set('title', title)
	params.set('body', buildMarkdownBody(payload))
	return `${baseUrl}/${repo}/issues/new?${params.toString()}`
}
