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
 * Issue form for the in-product "Report a bug" deep link. Like
 * ISSUE_FORM_TEMPLATE this is a FILENAME that must resolve in the target repo
 * — GitHub silently ignores a `template` it cannot find and drops the user on
 * the blank issue form.
 *
 * It resolves for every app in the fleet without any per-repo work, verified
 * against GitHub on 2026-09-02 across 21 app repos: the ConductionNL/.github
 * repository carries bug-report.yml (alongside feature-request.yml,
 * technical-task.yml and user-story.yml) as ORG-LEVEL default issue templates,
 * which GitHub offers in every repo that does not define its own
 * .github/ISSUE_TEMPLATE directory — 7 of the 21 rely on exactly that. The
 * other 14 define their own directory, which overrides the org defaults
 * wholesale, and all 14 use these same filenames.
 *
 * That override is the thing to watch: a repo that adds its own
 * .github/ISSUE_TEMPLATE without a bug-report.yml silently loses this link's
 * form and lands the reporter on the blank issue page. opencatalogi is the
 * near-miss — it kept bug_report.yml/feature_request.yml with underscores AND
 * added the hyphenated pair, so both deep links resolve there today.
 *
 * @type {string}
 */
const BUG_REPORT_TEMPLATE = 'bug-report.yml'

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
 * Build the "request a feature" new-issue deep-link for the given forge.
 *
 * Mirrors buildBugReportUrl deliberately (team decision, 2026-09-04): the
 * in-product suggestion form is gone, and Request-a-feature sends the user
 * straight to the forge's feature-request issue FORM, exactly like Report a
 * bug. The forge is where the whole conversation happens in English — the
 * form's own fields ask the structured questions the in-product modal used
 * to ask, and asking for English belongs in that form (the org-level
 * feature-request.yml), which every requester sees.
 *
 * Only `template` and `title` are prefilled. A query parameter REPLACES an
 * issue-form field's default value rather than appending to it, so
 * prefilling any content field would wipe the form's own skeleton (see
 * buildBugReportUrl for the history of that lesson). The headline is the
 * AUTHORED (untranslated) title when one can be recovered, else the surface
 * slug — English by construction, never the translated display title.
 *
 * @param {{type?: string, baseUrl?: string}} forge Forge config (resolved internally).
 * @param {string} repo `<owner>/<repo>` slug on the forge.
 * @param {object} [payload] Optional context. Every field is optional; the
 *   link stays valid with none of them.
 * @param {string} [payload.title] The surface's AUTHORED (untranslated) title.
 * @param {string} [payload.surface] Stable surface slug, e.g. `dashboard:secrets`.
 *   Used as the headline only when no authored title can be recovered.
 * @return {string} Absolute URL safe to pass to window.open.
 */
export function buildFeatureRequestUrl(forge, repo, payload = {}) {
	const { type, baseUrl } = resolveForge(forge)
	const params = new URLSearchParams()

	const headline = (payload.title || '').trim()
		|| (payload.surface || '').trim()

	if (type === 'github') {
		params.set('template', ISSUE_FORM_TEMPLATE)
	}
	params.set('title', headline ? `[FEATURE] ${headline}` : '[FEATURE] ')

	return `${baseUrl}/${repo}/issues/new?${params.toString()}`
}

/**
 * Build the "report a bug" new-issue deep-link for the given forge.
 *
 * Mirrors buildFeatureRequestUrl: on GitHub it targets the bug-report issue
 * FORM so the reporter gets the structured fields (description, steps,
 * expected/actual, severity) instead of an empty textarea; on
 * Forgejo/Gitea/Codeberg, which have no per-field deep-link, it passes the
 * universal `title` only.
 *
 * **Everything this generates is English and locale-independent, by design.**
 * The issue title used to be the surface's DISPLAY title, which is translated:
 * a report filed from a French UI arrived as `[BUG] Activité récente` and one
 * from a Russian UI in Cyrillic, unreadable to a maintainer even though the
 * English msgid was sitting in the manifest all along. So `title` here is the
 * AUTHORED source string — English, because English is the msgid in this
 * fleet. When no source string can be recovered the headline falls back to the
 * surface slug, which is English by construction; it never falls back to the
 * translated string, because that is the whole failure being fixed.
 *
 * The localized title is not carried anywhere in the URL. It was, briefly, as
 * context — but a maintainer can reconstruct it from the English headline and
 * the reporter's own prose, and it was the single longest thing in a link a
 * human has to look at.
 *
 * The reporter's own prose is theirs and stays in whatever language they
 * write; asking for English belongs in the issue FORM (the org-level
 * bug-report.yml), which every reporter sees, not in a URL parameter.
 *
 * The title is prefixed `[BUG]` to match the form's own `title: "[BUG] "`
 * default — a `title` query parameter REPLACES that default rather than
 * appending to it, so without the prefix a deep-linked report is the only one
 * in the tracker without it.
 *
 * @param {{type?: string, baseUrl?: string}} forge Forge config (resolved internally).
 * @param {string} repo `<owner>/<repo>` slug on the forge.
 * @param {object} [payload] Optional context. Every field is optional; the
 *   link stays valid with none of them.
 * @param {string} [payload.title] The surface's AUTHORED (untranslated) title, e.g. `Recent activity`.
 * @param {string} [payload.surface] Stable surface slug, e.g. `dashboard:secrets`.
 *   Used as the headline only when no authored title can be recovered.
 * @return {string} Absolute URL safe to pass to window.open.
 */
export function buildBugReportUrl(forge, repo, payload = {}) {
	const { type, baseUrl } = resolveForge(forge)
	const params = new URLSearchParams()

	// Headline: the authored title if we have one, else the surface slug. The
	// app id is NOT prefixed — the issue is filed in that app's own repo, so
	// it would only repeat the destination.
	const headline = (payload.title || '').trim()
		|| (payload.surface || '').trim()

	if (type === 'github') {
		params.set('template', BUG_REPORT_TEMPLATE)
	}
	params.set('title', headline ? `[BUG] ${headline}` : '[BUG] ')

	// NOTHING ELSE is prefilled, deliberately. An earlier cut filled the form's
	// `environment` field with the app id, route, surface slug, UI language and
	// localized screen title: it doubled the URL to ~400 characters of visible
	// percent-encoding, and every line was either implied by where the issue
	// lands (the app), by the English headline (the surface, the localized
	// title) or by simply reading the report (the language).
	//
	// It also cost something real. A query parameter REPLACES a field's default
	// value, so prefilling `environment` wiped the form's own
	// "- Namespace: / - Version: / - Browser:" skeleton and the prefill had to
	// re-state it verbatim just to stand still. Sending nothing leaves the
	// form's skeleton intact and the link short enough to read.

	return `${baseUrl}/${repo}/issues/new?${params.toString()}`
}
