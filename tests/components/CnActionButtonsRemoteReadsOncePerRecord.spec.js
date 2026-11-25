/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header action's endpoint condition is asked once per record: a detail page
 * replaces its object context when the record loads, when its visibility rows
 * arrive and when a lock is taken for an edit, and each refresh used to ask the
 * endpoint again (a dossiq case read `/lifecycle` three times as its Edit
 * dialog opened).
 *
 * @spec openspec/changes/remote-conditions-read-once-per-record/specs/action-buttons/spec.md#requirement-a-header-actions-remote-conditions-are-read-once-per-record
 */
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'

/**
 * Let the async visibility pass finish.
 *
 * @return {Promise<void>}
 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const actions = [
	{
		id: 'request-information',
		label: 'Ask for missing information',
		type: 'navigate',
		route: 'Cases',
		visibleWhen: {
			all: [
				{ field: 'isFinalStatus', op: 'neq', value: true },
				{ endpoint: '/apps/dossiq/api/case/@objectId/lifecycle', field: 'suspended', op: 'eq', value: false },
			],
		},
	},
]

const record = (extra = {}) => ({ id: 'c-1', title: 'Case', isFinalStatus: false, '@self': { id: 'c-1', locked: null, updated: '2026-11-25T03:00:00Z' }, ...extra })

/**
 * Mount the bar on a page whose object context the test replaces.
 *
 * @return {{wrapper: object, ctx: object}} The bar and its context.
 */
function mountOnPage() {
	const ctx = ref({ objectId: 'c-1', object: record(), register: 'dossiq', schema: 'case' })
	const wrapper = mount(CnActionButtons, {
		propsData: { actions },
		provide: { cnObjectContext: ctx },
		mocks: { $router: { push: jest.fn() } },
	})
	return { wrapper, ctx }
}

/**
 * How many times the lifecycle endpoint was asked.
 *
 * @return {number} The count.
 */
const lifecycleReads = () => global.fetch.mock.calls.filter(([url]) => String(url).includes('/lifecycle')).length

describe('CnActionButtons: remote conditions are read once per record', () => {
	beforeEach(() => {
		global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ suspended: false }) }))
	})

	afterEach(() => {
		delete global.fetch
	})

	it('asks the endpoint once while the page refreshes the same record and takes its lock', async () => {
		const { wrapper, ctx } = mountOnPage()
		await flush()
		ctx.value = { ...ctx.value, object: record(), context: { caseType: { id: 't-1' } } }
		await flush()
		ctx.value = { ...ctx.value, object: record({ '@self': { id: 'c-1', locked: { user: 'pieter' }, updated: '2026-11-25T03:00:00Z' } }) }
		await flush()

		expect(lifecycleReads()).toBe(1)
		expect(wrapper.vm.visibleActions.map((a) => a.id)).toEqual(['request-information'])
	})

	it('asks again when the record itself changed', async () => {
		const { ctx } = mountOnPage()
		await flush()
		ctx.value = { ...ctx.value, object: record({ title: 'Renamed' }) }
		await flush()

		expect(lifecycleReads()).toBe(2)
	})

	it('asks again after an action ran, which may change what the endpoint answers', async () => {
		const { wrapper, ctx } = mountOnPage()
		await flush()
		wrapper.vm.onActionClick({ id: 'other', type: 'navigate', route: 'Cases', label: 'Other' })
		ctx.value = { ...ctx.value, object: record() }
		await flush()

		expect(lifecycleReads()).toBe(2)
	})

	it('asks again after a refused read', async () => {
		global.fetch = jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }))
		const { wrapper, ctx } = mountOnPage()
		await flush()
		expect(wrapper.vm.visibleActions).toEqual([])
		ctx.value = { ...ctx.value, context: {} }
		await flush()

		expect(lifecycleReads()).toBe(2)
	})
})
