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
