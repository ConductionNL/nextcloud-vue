/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list whose create goes through the app: `content.createAction` replaces
 * the list's own create form, `hiddenNote` says why it is withheld, and
 * `content.summary` rolls the loaded rows up into one line.
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p?.register).replace('{schema}', p?.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const ACTION = {
	id: 'create-sub-record',
	type: 'open-modal',
	target: 'SubRecordModal',
	label: 'Create sub-record',
	props: { parent: '@objectId' },
	visibleWhen: { all: [{ field: 'endDate', op: 'empty' }, { field: 'parent', op: 'empty' }] },
	hiddenNote: [
		{ when: { field: 'parent', op: 'notEmpty' }, text: 'A sub-record cannot have sub-records.' },
		{ when: { field: 'endDate', op: 'notEmpty' }, text: 'This record is closed.' },
	],
}

const NL = {
	'Create sub-record': 'Subrecord aanmaken',
	'This record is closed.': 'Dit record is gesloten.',
	'({completed}/{total} completed)': '({completed}/{total} voltooid)',
}

/**
 * Mount the list on a page whose record is `record`.
 *
 * @param {object} content Extra content.
 * @param {object|null} record The page record.
 * @return {{ wrapper: object, dispatched: Array }} The wrapper and what was dispatched.
 */
function mountList(content, record) {
	const dispatched = []
	const wrapper = shallowMount(CnObjectListWidget, {
		props: { content: { register: 'r', schema: 'record', filter: { parent: '@objectId' }, ...content } },
		global: {
			provide: {
				cnObjectContext: ref({ objectId: 'rec-1', object: record }),
				cnDispatchAction: (action) => dispatched.push(action),
				cnTranslate: (key) => NL[key] ?? key,
			},
			stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true },
		},
	})
	return { wrapper, dispatched }
}

describe('CnObjectListWidget — content.createAction', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGet.mockResolvedValue({ data: { results: [{ id: 'a', endDate: '2026-09-05' }, { id: 'b' }], total: 2 } })
	})

	it('runs the action instead of opening the create form, labelled with its label', async () => {
		const { wrapper, dispatched } = mountList({ createAction: ACTION }, { id: 'rec-1' })
		await flushPromises()
		expect(wrapper.vm.addLabel).toBe('Subrecord aanmaken')
		const add = wrapper.find('.cn-object-list-widget__add')
		expect(add.exists()).toBe(true)
		await wrapper.vm.openCreate()
		expect(dispatched).toEqual([ACTION])
		expect(wrapper.vm.showCreate).toBe(false)
	})

	it('hides every Add where the condition fails, and says why', async () => {
		const { wrapper, dispatched } = mountList({ createAction: ACTION }, { id: 'rec-1', endDate: '2026-10-01' })
		await flushPromises()
		expect(wrapper.vm.allowCreate).toBe(false)
		expect(wrapper.find('.cn-object-list-widget__add').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-object-list-widget-hidden-note"]').text()).toBe('Dit record is gesloten.')
		await wrapper.vm.openCreate()
		expect(dispatched).toEqual([])
	})

	it('shows no note where the action shows', async () => {
		const { wrapper } = mountList({ createAction: ACTION }, { id: 'rec-1' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-object-list-widget-hidden-note"]').exists()).toBe(false)
	})

	it('keeps allowCreate: false as the off switch', async () => {
		const { wrapper } = mountList({ createAction: ACTION, allowCreate: false }, { id: 'rec-1' })
		await flushPromises()
		expect(wrapper.vm.allowCreate).toBe(false)
	})

	it('leaves a list without createAction on its own form', async () => {
		const { wrapper, dispatched } = mountList({}, { id: 'rec-1' })
		await flushPromises()
		expect(wrapper.vm.addLabel).toBe('Add')
		expect(wrapper.vm.createHiddenNote).toBe('')
		expect(dispatched).toEqual([])
	})
})

describe('CnObjectListWidget — content.summary', () => {
	const SUMMARY = { text: '({completed}/{total} completed)', counts: { completed: { field: 'endDate', op: 'notEmpty' } } }

	it('counts the loaded rows its condition holds for', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: 'a', endDate: '2026-09-05' }, { id: 'b' }], total: 2 } })
		const { wrapper } = mountList({ summary: SUMMARY }, { id: 'rec-1' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-object-list-widget-summary"]').text()).toBe('(1/2 voltooid)')
	})

	it('says none done when no row holds', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: 'a' }, { id: 'b' }], total: 2 } })
		const { wrapper } = mountList({ summary: SUMMARY }, { id: 'rec-1' })
		await flushPromises()
		expect(wrapper.vm.resolvedSummary).toBe('(0/2 voltooid)')
	})

	it('draws nothing over an empty list', async () => {
		mockGet.mockResolvedValue({ data: { results: [], total: 0 } })
		const { wrapper } = mountList({ summary: SUMMARY }, { id: 'rec-1' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-object-list-widget-summary"]').exists()).toBe(false)
	})

	it('leaves an unknown placeholder as written', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: 'a' }, { id: 'b' }], total: 2 } })
		const { wrapper } = mountList({ summary: { text: '{total} of {nothing}' } }, { id: 'rec-1' })
		await flushPromises()
		expect(wrapper.vm.resolvedSummary).toBe('2 of {nothing}')
	})
})
