/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index header action can show only for some readers (`visibleWhen`): an
 * endpoint such as `/api/me`, the reader's groups or an installed app
 * (stackiq operations-record-reconciliation, Find duplicates).
 *
 * @spec openspec/changes/index-header-action-visible-when/specs/index-header-action-visible-when/spec.md
 */
const mockEvaluate = jest.fn()
jest.mock('../../src/utils/visibleWhen.js', () => {
	const actual = jest.requireActual('../../src/utils/visibleWhen.js')
	return { ...actual, evaluateVisibleWhen: (...a) => mockEvaluate(...a) }
})

const { flushPromises, shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const MAY = { endpoint: '/apps/stackiq/api/me', field: 'mayFindDuplicates', op: 'eq', value: true }
const ACTIONS = [
	{ id: 'duplicates', label: 'Find duplicates', handler: 'emit', visibleWhen: MAY },
	{ id: 'help', label: 'Help', handler: 'emit' },
]
const ids = (w) => w.vm.mergedHeaderActions.map((a) => a.id)

describe('CnIndexPage header action visibleWhen', () => {
	beforeEach(() => mockEvaluate.mockReset())

	it('shows a gated action only once its condition holds, and an ungated one at once', async () => {
		let answer
		mockEvaluate.mockReturnValue(new Promise((resolve) => {
			answer = resolve
		}))
		const w = shallowMount(CnIndexPage, { props: { objects: [], headerActions: ACTIONS } })
		expect(ids(w)).toEqual(['help'])
		answer(true)
		await flushPromises()
		expect(ids(w)).toEqual(['duplicates', 'help'])
		expect(mockEvaluate.mock.calls[0][0]).toEqual(MAY)
	})

	it('keeps it hidden when the condition does not hold or the request fails', async () => {
		mockEvaluate.mockResolvedValueOnce(false)
		const no = shallowMount(CnIndexPage, { props: { objects: [], headerActions: ACTIONS } })
		await flushPromises()
		expect(ids(no)).toEqual(['help'])
		mockEvaluate.mockRejectedValueOnce(new Error('500'))
		const failed = shallowMount(CnIndexPage, { props: { objects: [], headerActions: ACTIONS } })
		await flushPromises()
		expect(ids(failed)).toEqual(['help'])
	})
})
