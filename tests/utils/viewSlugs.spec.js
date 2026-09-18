/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The one name a saved view is called by from everywhere else.
 *
 * Every case here is a way to be wrong that renders perfectly: a widget
 * showing a blank table instead of saying which view it could not find, a
 * second view quietly taking a slug the first one was cited by, or a rename
 * that breaks a dashboard somewhere nobody is looking.
 */

const {
	SLUG_ERRORS,
	canEditSlug,
	claimSlug,
	findViewBySlug,
	isWellFormedSlug,
	resolveCitedView,
} = require('../../src/utils/viewSlugs.js')

const VIEWS = [
	{ id: '1', slug: 'open-cases', name: 'Open cases' },
	{ id: '2', slug: 'mine', name: 'Mine' },
]

describe('a slug is a path segment', () => {
	it('accepts what can go in an address and refuses what cannot', () => {
		expect(isWellFormedSlug('open-cases')).toBe(true)
		expect(isWellFormedSlug('a1')).toBe(true)
		// Would encode, render as %20 and still work, which is the kind of
		// thing nobody notices until the link is in an email.
		expect(isWellFormedSlug('Open Cases')).toBe(false)
		expect(isWellFormedSlug('-leading')).toBe(false)
		expect(isWellFormedSlug('')).toBe(false)
	})
})

describe('citing a view by name', () => {
	it('finds it', () => {
		expect(findViewBySlug('mine', VIEWS).id).toBe('2')
	})

	it('answers the slug that failed, not a blank list', () => {
		// A widget citing a view somebody has since renamed is the ordinary
		// way this goes wrong. A blank list is indistinguishable from a query
		// that matched nothing, and one of those is a configuration to fix.
		const { view, missingSlug } = resolveCitedView('gone', VIEWS)

		expect(view).toBeNull()
		expect(missingSlug).toBe('gone')
	})

	it('reports no missing slug when it resolves, which is the control', () => {
		const { view, missingSlug } = resolveCitedView('mine', VIEWS)

		expect(view.id).toBe('2')
		expect(missingSlug).toBe('')
	})
})

describe('claiming a slug', () => {
	it('refuses one already held, and names the holder', () => {
		// "That slug is taken" leaves somebody hunting through two hundred
		// views for the one that has it.
		const { ok, error } = claimSlug({ slug: 'mine', viewId: '9', views: VIEWS })

		expect(ok).toBe(false)
		expect(error.code).toBe(SLUG_ERRORS.TAKEN)
		expect(error.holder).toBe('Mine')
	})

	it('lets a view keep its own slug when its other fields are saved', () => {
		// Without this, saving a view's name would refuse because the view
		// itself already holds the slug.
		expect(claimSlug({ slug: 'mine', viewId: '2', views: VIEWS }).ok).toBe(true)
	})

	it('refuses a malformed slug before it goes looking for a holder', () => {
		const { ok, error } = claimSlug({ slug: 'Open Cases', views: VIEWS })

		expect(ok).toBe(false)
		expect(error.code).toBe(SLUG_ERRORS.MALFORMED)
	})

	it('accepts a free, well-formed slug', () => {
		expect(claimSlug({ slug: 'nieuw', views: VIEWS }).ok).toBe(true)
	})
})

describe('editing a slug', () => {
	it('refuses while something cites it, and names what', () => {
		// Renaming does not break loudly: the citing surface simply stops
		// finding the view and keeps rendering.
		const { ok, error } = canEditSlug({
			view: { slug: 'open-cases' },
			citations: [
				{ slug: 'open-cases', by: 'Dashboard widget "Werkvoorraad"' },
				{ slug: 'mine', by: 'Somewhere else' },
			],
		})

		expect(ok).toBe(false)
		expect(error.code).toBe(SLUG_ERRORS.CITED)
		expect(error.citedBy).toEqual(['Dashboard widget "Werkvoorraad"'])
	})

	it('allows it when nothing cites it', () => {
		expect(canEditSlug({ view: { slug: 'open-cases' }, citations: [] }).ok).toBe(true)
	})

	it('allows naming a view for the first time', () => {
		// Nothing can cite a view that has no name yet.
		expect(canEditSlug({ view: {}, citations: [{ slug: '', by: 'x' }] }).ok).toBe(true)
	})
})
