/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnGroupedCardsWidget` (grouped-cards-widget):
 * each group is a section named by its heading, its cards a list.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({
			data: {
				phases: [
					{ id: 's1', name: 'Intake', order: 1, tasks: [{ id: 't1', title: 'Check completeness', candidateGroups: ['Intake officer'], leadTimeDays: 5 }] },
					{ id: 's2', name: 'Assessment', order: 2, tasks: [] },
				],
				alwaysAvailable: [{ id: 'a', label: 'Suspend the term' }],
			},
		})),
	},
}))

const CnGroupedCardsWidget = require('../../src/components/CnGroupedCardsWidget/CnGroupedCardsWidget.vue').default
const { invalidateEndpointSourceCache } = require('../../src/composables/useEndpointSource.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')

/** Let the endpoint read settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

describe('CnGroupedCardsWidget: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
		invalidateEndpointSourceCache()
	})

	it('has no WCAG 2.1 AA violations with groups, an empty group and the always box', async () => {
		wrapper = mountAttached(CnGroupedCardsWidget, {
			propsData: {
				objectId: 'ct-1',
				content: {
					endpointSource: { url: '/apps/dossiq/api/case-types/@objectId/phases' },
					groupsPath: 'phases',
					itemsKey: 'tasks',
					groupTitle: 'Phase {order}: {name}',
					groupCount: { one: '{count} task', other: '{count} tasks' },
					itemMeta: ['{candidateGroups}', '{leadTimeDays} working days'],
					extraGroup: { title: 'Always available', path: 'alwaysAvailable', itemText: '{label}' },
				},
			},
		})
		await flush()
		expect(wrapper.findAll('section').length).toBe(3)
		await expectAccessible(wrapper)
	})
})
