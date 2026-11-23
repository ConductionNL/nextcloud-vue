/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Which actions a saved view offers.
 *
 * The intersection is the security property, and it is one line. A view is a
 * thing any user can create, so a view that could ADD an action would mean any
 * user can grant themselves one by saving a view.
 */

const { actionsForView } = require('../../src/utils/viewActions.js')

const PAGE_ACTIONS = [
	{ id: 'view', label: 'View' },
	{ id: 'claim', label: 'Claim' },
	{ id: 'delete', label: 'Delete' },
]

describe('the actions a view offers', () => {
	it('narrows the page list to what the view declares, in the page order', () => {
		const actions = actionsForView({ pageActions: PAGE_ACTIONS, declared: ['claim', 'view'] })

		expect(actions.map((action) => action.id)).toEqual(['view', 'claim'])
	})

	it('never adds an action the page does not offer', () => {
		// The whole security property. A view is a thing any user can create.
		const actions = actionsForView({
			pageActions: PAGE_ACTIONS,
			declared: ['claim', 'purge-everything'],
		})

		expect(actions.map((action) => action.id)).toEqual(['claim'])
	})

	it('offers the page actions when the view declares none', () => {
		// Today's behaviour, and the control: an implementation that always
		// intersected against an empty list would pass the tests above and
		// leave every view with no actions at all.
		expect(actionsForView({ pageActions: PAGE_ACTIONS }).map((a) => a.id)).toEqual([
			'view',
			'claim',
			'delete',
		])
	})

	it('offers nothing when the view declares an empty list', () => {
		// Distinct from declaring nothing: a view CAN say "no actions here".
		expect(actionsForView({ pageActions: PAGE_ACTIONS, declared: [] })).toEqual([])
	})
})
