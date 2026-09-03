/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for the forge URL-builder util — the per-forge "new issue"
 * deep-link strategy behind CnSuggestFeatureModal. Codeberg/Forgejo/Gitea
 * support only title + body (assembled Markdown); GitHub uses per-field
 * Issue-Form query params.
 */

import {
	DEFAULT_FORGE,
	FORGE_DEFAULT_BASE_URLS,
	resolveForge,
	forgeDisplayName,
	buildFeatureRequestUrl,
	buildBugReportUrl,
} from '../../src/utils/forge.js'

const payload = {
	title: 'Add timeline filter',
	problem: 'I cannot filter contacts by last interaction date.',
	proposedSolution: 'A date-range filter in the sidebar.',
	whoBenefits: 'Account managers.',
	priorityToYou: 'Would use weekly',
	anythingElse: 'Avoid hiding it behind settings.',
	context: {
		app: 'pipelinq',
		page: 'clients-index',
		surface: 'contacts-list-sidebar',
		object: 'pipelinq · Client',
		specRef: 'client-management',
	},
}

describe('forge — DEFAULT_FORGE + resolveForge', () => {
	it('defaults to GitHub', () => {
		expect(DEFAULT_FORGE).toEqual({ type: 'github', baseUrl: 'https://github.com' })
	})

	it('resolves an empty/unknown config to the GitHub default', () => {
		expect(resolveForge(null)).toEqual({ type: 'github', baseUrl: 'https://github.com' })
		expect(resolveForge({})).toEqual({ type: 'github', baseUrl: 'https://github.com' })
	})

	it('fills the canonical host when baseUrl is omitted', () => {
		expect(resolveForge({ type: 'github' })).toEqual({ type: 'github', baseUrl: 'https://github.com' })
	})

	it('keeps an explicit baseUrl (self-hosted Forgejo/Gitea) and strips trailing slashes', () => {
		expect(resolveForge({ type: 'forgejo', baseUrl: 'https://git.example.org/' }))
			.toEqual({ type: 'forgejo', baseUrl: 'https://git.example.org' })
	})

	it('exposes per-type default hosts (self-hosted types have none)', () => {
		expect(FORGE_DEFAULT_BASE_URLS.codeberg).toBe('https://codeberg.org')
		expect(FORGE_DEFAULT_BASE_URLS.github).toBe('https://github.com')
		expect(FORGE_DEFAULT_BASE_URLS.forgejo).toBe('')
		expect(FORGE_DEFAULT_BASE_URLS.gitea).toBe('')
	})
})

describe('forge — forgeDisplayName', () => {
	it('maps known types to proper nouns', () => {
		expect(forgeDisplayName('codeberg')).toBe('Codeberg')
		expect(forgeDisplayName('github')).toBe('GitHub')
		expect(forgeDisplayName('forgejo')).toBe('Forgejo')
		expect(forgeDisplayName('gitea')).toBe('Gitea')
	})

	it('title-cases an unknown type', () => {
		expect(forgeDisplayName('acme')).toBe('Acme')
	})
})

describe('forge — buildFeatureRequestUrl (Codeberg/Forgejo/Gitea)', () => {
	it('builds a title + body deep-link with all sections + context', () => {
		// Explicitly `codeberg`, not DEFAULT_FORGE. This block tests the
		// Markdown-body strategy (title + body, no `template` param), which is
		// the Codeberg/Forgejo/Gitea shape. Passing DEFAULT_FORGE coupled the
		// assertion to whatever the fleet default happened to be, so moving
		// that default to GitHub — a different URL shape entirely — silently
		// broke a test that was never about the default.
		const url = buildFeatureRequestUrl({ type: 'codeberg' }, 'Conduction/pipelinq', payload)
		const u = new URL(url)
		expect(u.origin + u.pathname).toBe('https://codeberg.org/Conduction/pipelinq/issues/new')
		expect(u.searchParams.get('title')).toBe('[FEATURE] Add timeline filter')
		expect(u.searchParams.has('template')).toBe(false)
		const body = u.searchParams.get('body')
		expect(body).toContain('## Problem')
		expect(body).toContain('## Proposed solution')
		expect(body).toContain('## Who benefits')
		expect(body).toContain('## How important is this to you?')
		expect(body).toContain('## Anything else?')
		expect(body).toContain('**App:** pipelinq')
		expect(body).toContain('**Spec ref:** client-management')
	})

	it('omits empty optional sections and the context block', () => {
		const url = buildFeatureRequestUrl({ type: 'codeberg' }, 'Conduction/pipelinq', {
			title: 'X',
			problem: 'P',
			proposedSolution: 'S',
			whoBenefits: 'W',
			priorityToYou: 'Nice to have',
		})
		const body = new URL(url).searchParams.get('body')
		expect(body).not.toContain('## Anything else?')
		expect(body).not.toContain('---')
		expect(body).not.toContain('**App:**')
	})

	it('routes forgejo/gitea through the same title + body builder on the given host', () => {
		const url = buildFeatureRequestUrl({ type: 'forgejo', baseUrl: 'https://git.example.org' }, 'org/app', payload)
		const u = new URL(url)
		expect(u.origin + u.pathname).toBe('https://git.example.org/org/app/issues/new')
		expect(u.searchParams.get('body')).toContain('## Problem')
	})
})

describe('forge — buildFeatureRequestUrl (GitHub)', () => {
	it('builds an Issue-Form deep-link with one query param per field id', () => {
		const url = buildFeatureRequestUrl({ type: 'github' }, 'ConductionNL/pipelinq', payload)
		const u = new URL(url)
		expect(u.origin + u.pathname).toBe('https://github.com/ConductionNL/pipelinq/issues/new')
		expect(u.searchParams.get('template')).toBe('feature-request.yml')
		expect(u.searchParams.get('title')).toBe('[FEATURE] Add timeline filter')
		expect(u.searchParams.get('problem')).toBe(payload.problem)
		expect(u.searchParams.get('proposed-solution')).toBe(payload.proposedSolution)
		expect(u.searchParams.get('who-benefits')).toBe(payload.whoBenefits)
		expect(u.searchParams.get('priority-to-you')).toBe('Would use weekly')
		expect(u.searchParams.get('context')).toBe(payload.anythingElse)
		expect(u.searchParams.get('app')).toBe('pipelinq')
		expect(u.searchParams.get('spec-ref')).toBe('client-management')
	})

	it('omits empty optional params', () => {
		const url = buildFeatureRequestUrl({ type: 'github' }, 'ConductionNL/pipelinq', {
			title: 'X', problem: 'P', proposedSolution: 'S', whoBenefits: 'W', priorityToYou: '',
		})
		const u = new URL(url)
		expect(u.searchParams.has('context')).toBe(false)
		expect(u.searchParams.has('app')).toBe(false)
		expect(u.searchParams.has('priority-to-you')).toBe(false)
	})
})

describe('buildBugReportUrl', () => {
	// Without `template` GitHub serves the BLANK issue form, so an
	// in-product report arrives with none of the fields the triage flow
	// expects (steps, expected/actual, severity). bug-report.yml resolves in
	// every fleet repo via ConductionNL/.github's org-level defaults.
	it('targets the bug-report issue form on GitHub', () => {
		const u = new URL(buildBugReportUrl({ type: 'github' }, 'ConductionNL/pipelinq', { surface: 'dashboard:secrets' }))
		expect(u.origin + u.pathname).toBe('https://github.com/ConductionNL/pipelinq/issues/new')
		expect(u.searchParams.get('template')).toBe('bug-report.yml')
	})

	// THE POINT: a report filed from a French or Russian UI must be readable
	// by a maintainer who does not speak it. The headline is the AUTHORED
	// source string; the translated one is passed in and deliberately unused.
	it('headlines the authored title, never the translated one', () => {
		const u = new URL(buildBugReportUrl({ type: 'github' }, 'ConductionNL/keepiq', {
			title: 'Recent activity', surface: 'widget:recent-activity-feed',
			displayTitle: 'Activité récente',
		}))
		expect(u.searchParams.get('title')).toBe('[BUG] Recent activity')
		expect(u.searchParams.get('title')).not.toContain('Activité')
	})

	// Cyrillic is the case that makes this non-negotiable: French or German a
	// maintainer can usually muddle through, a script they cannot read is a
	// dead issue.
	it('headlines the authored title for a non-Latin UI language', () => {
		const u = new URL(buildBugReportUrl({ type: 'github' }, 'ConductionNL/keepiq', {
			title: 'Recent activity', surface: 'widget:recent-activity-feed',
			displayTitle: 'Недавняя активность',
		}))
		expect(u.searchParams.get('title')).toBe('[BUG] Recent activity')
	})

	// No source string recoverable (a standalone widget, a detail page): the
	// slug is English by construction, so it beats falling back to the
	// translated prop.
	it('falls back to the surface slug, not the display title', () => {
		const u = new URL(buildBugReportUrl({ type: 'github' }, 'ConductionNL/keepiq', {
			surface: 'dashboard:secrets', displayTitle: 'Секреты',
		}))
		expect(u.searchParams.get('title')).toBe('[BUG] dashboard:secrets')
		expect(u.searchParams.get('title')).not.toContain('Секреты')
	})

	// The link is handed to a human and shows up in their address bar, so it
	// carries the template and the title and nothing else. An earlier cut
	// prefilled the `environment` field with app/route/surface/language/
	// localized-title and reached ~400 characters of percent-encoding for
	// information that was already implied. Prefilling that field also WIPED
	// the form's own "- Namespace: / - Version: / - Browser:" skeleton, which
	// the prefill then had to re-state verbatim just to break even.
	it('prefills nothing beyond the template and the title', () => {
		const u = new URL(buildBugReportUrl({ type: 'github' }, 'ConductionNL/keepiq', {
			title: 'Recent activity', surface: 'widget:recent-activity-feed',
		}))
		expect([...u.searchParams.keys()].sort()).toEqual(['template', 'title'])
		expect(u.searchParams.has('environment')).toBe(false)
	})

	it('stays short enough to read in an address bar', () => {
		const url = buildBugReportUrl({ type: 'github' }, 'ConductionNL/keepiq', {
			title: 'Applications awaiting approval', surface: 'widget:pending-apps-queue',
		})
		expect(url.length).toBeLessThan(150)
	})

	// A `title` param REPLACES the form's own `title: "[BUG] "` default, so
	// the prefix has to be sent or deep-linked reports are the only ones in
	// the tracker without it.
	it('still produces a usable link with no context at all', () => {
		const u = new URL(buildBugReportUrl({ type: 'github' }, 'ConductionNL/pipelinq'))
		expect(u.searchParams.get('title')).toBe('[BUG] ')
		expect(u.searchParams.get('template')).toBe('bug-report.yml')
	})

	// Forgejo/Gitea/Codeberg have no per-field deep-link; neither the template
	// nor the environment prefill would render there.
	it('omits the template and field prefill on a non-GitHub forge', () => {
		const u = new URL(buildBugReportUrl({ type: 'codeberg' }, 'ConductionNL/pipelinq', { surface: 'dashboard:secrets' }))
		expect(u.origin + u.pathname).toBe('https://codeberg.org/ConductionNL/pipelinq/issues/new')
		expect(u.searchParams.has('template')).toBe(false)
		expect(u.searchParams.has('environment')).toBe(false)
		expect(u.searchParams.get('title')).toBe('[BUG] dashboard:secrets')
	})

	it('falls back to the fleet default forge when none is given', () => {
		const u = new URL(buildBugReportUrl(null, 'ConductionNL/pipelinq', { title: 'x' }))
		expect(u.origin).toBe(FORGE_DEFAULT_BASE_URLS[DEFAULT_FORGE.type])
	})
})
