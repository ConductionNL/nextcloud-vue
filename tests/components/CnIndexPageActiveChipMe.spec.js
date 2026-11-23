/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Active line names the reader as "me" on a user filter: DqFilterInMenu
 * draws "Behandelaar: ik" for the view "Termijn deze week" (assignee @me),
 * where the chip read the uid, "pieter". Another user keeps their id, and a
 * page's own `filterLabels` value wins.
 *
 * @spec openspec/changes/active-chip-me/specs/active-chip-me/spec.md
 */
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'pieter', isAdmin: false }) }))

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

/**
 * A page context with a user-reference assignee filter.
 *
 * @param {object} filterLabels The page's filterLabels.
 * @return {object} The context.
 */
function page(filterLabels = {}) {
	return {
		filterLabels,
		refLabels: {},
		effectiveFacetData: {},
		effectiveSchema: { properties: { assignee: { type: 'string', referenceType: 'nextcloud-user' }, title: { type: 'string' } } },
		cnTranslate: (text) => text,
		isGroupFilter: () => false,
		sidebar: null,
		sourceConfig: null,
	}
}

describe('CnIndexPage activeFilterValueLabel, the reader', () => {
	it('names the reader "me" on a user filter', () => {
		expect(CnIndexPage.methods.activeFilterValueLabel.call(page(), 'assignee', 'pieter')).toBe('me')
	})

	it('keeps another user\'s id, a non-user field and a filterLabels value', () => {
		expect(CnIndexPage.methods.activeFilterValueLabel.call(page(), 'assignee', 'anouk')).toBe('anouk')
		expect(CnIndexPage.methods.activeFilterValueLabel.call(page(), 'title', 'pieter')).toBe('pieter')
		expect(CnIndexPage.methods.activeFilterValueLabel.call(page({ assignee: { values: { pieter: 'Pieter J.' } } }), 'assignee', 'pieter')).toBe('Pieter J.')
	})
})
