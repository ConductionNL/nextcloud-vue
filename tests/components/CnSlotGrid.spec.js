/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSlotGrid — the `slot-grid` widget (slot-grid).
 *
 * Guarded: registered content-only; every page of the source is read; items
 * are laid out by their row fields and column field, rows sorted, one-off
 * items (skipWhenField) and unknown columns left out; a cell's add action is a
 * create form seeded with the cell's row and column values; an item is removed
 * only after a confirm, and the grid is read again.
 */
var mockGet = jest.fn()
var mockDelete = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args), delete: (...args) => mockDelete(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

jest.mock('../../src/utils/userDisplayName.js', () => ({
	__esModule: true,
	userDisplayName: (uid) => ({ 't-1': 'Tess', 't-2': 'Tom' })[uid] || '',
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnSlotGrid/index.js'

const CnSlotGrid = require('../../src/components/CnSlotGrid/CnSlotGrid.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const LIST_URL = '/index.php/apps/openregister/api/objects/school/standby-slot'

const CONTENT = {
	source: { register: 'school', schema: 'standby-slot' },
	rowFields: ['startsAt', 'endsAt'],
	rowLabel: '{startsAt} to {endsAt}',
	rowHeader: 'Time',
	columnField: 'weekday',
	columns: [{ value: 'monday', label: 'Monday' }, { value: 'tuesday', label: 'Tuesday' }],
	skipWhenField: 'date',
	itemLabelField: 'teacherId',
	itemLabelKind: 'user',
	cellAction: { label: 'Add standby on {column} at {startsAt}' },
	addAction: { label: 'Add standby' },
	removeAction: { label: 'Remove {item} from standby' },
}

const runs = {}
const ActionButtonsStub = {
	name: 'CnActionButtons',
	props: ['actions', 'display'],
	emits: ['entries', 'created'],
	watch: {
		actions: {
			immediate: true,
			handler(actions) {
				this.$emit('entries', actions.map((action) => {
					runs[action.id] = { action, run: jest.fn() }
					return { id: action.id, label: action.label, run: runs[action.id].run }
				}))
			},
		},
	},
	template: '<div />',
}

const ConfirmStub = {
	name: 'CnConfirmDialog',
	props: ['message'],
	emits: ['confirm', 'close'],
	methods: { setResult: jest.fn() },
	template: '<div class="confirm">{{ message }}<button class="ok" @click="$emit(\'confirm\')" /></div>',
}

function make(content = CONTENT) {
	return mount(CnSlotGrid, {
		props: { content },
		global: {
			stubs: {
				CnActionButtons: ActionButtonsStub,
				CnConfirmDialog: ConfirmStub,
				NcNoteCard: { template: '<div class="note"><slot /></div>' },
				NcLoadingIcon: true,
				NcButton: { inheritAttrs: false, props: ['ariaLabel'], emits: ['click'], template: '<button :aria-label="ariaLabel" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')"><slot /></button>' },
			},
		},
	})
}

describe('CnSlotGrid', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockDelete.mockReset()
		mockGet.mockImplementation((url, { params }) => Promise.resolve({
			data: params._page === 1
				? { results: [
						{ id: 'a', teacherId: 't-1', weekday: 'monday', startsAt: '09:00', endsAt: '10:00' },
						{ id: 'b', teacherId: 't-2', weekday: 'tuesday', startsAt: '08:00', endsAt: '09:00' },
					], pages: 2 }
				: { results: [
						{ id: 'c', teacherId: 't-2', weekday: 'monday', startsAt: '09:00', endsAt: '10:00' },
						{ id: 'd', teacherId: 't-1', weekday: 'monday', startsAt: '08:00', endsAt: '09:00', date: '2026-10-21' },
						{ id: 'e', teacherId: 't-1', weekday: 'saturday', startsAt: '08:00', endsAt: '09:00' },
					], pages: 2 },
		}))
	})

	test('is registered as a content-only widget', () => {
		expect(getWidgetTypeEntry('slot-grid')).toBeTruthy()
		expect(isContentOnlyWidgetDef({ type: 'slot-grid' })).toBe(true)
	})

	test('reads every page and lays the items out by row and column', async () => {
		const wrapper = make()
		await flush()

		expect(mockGet).toHaveBeenCalledTimes(2)
		expect(mockGet).toHaveBeenLastCalledWith(LIST_URL, { params: { _limit: 200, _page: 2 } })
		const headers = wrapper.findAll('tbody th').map((th) => th.text())
		expect(headers).toEqual(['08:00 to 09:00', '09:00 to 10:00'])
		expect(wrapper.find('[data-testid="cn-slot-grid-cell-09:00|10:00-monday"]').text()).toContain('Tess')
		expect(wrapper.find('[data-testid="cn-slot-grid-cell-09:00|10:00-monday"]').text()).toContain('Tom')
		expect(wrapper.find('[data-testid="cn-slot-grid-cell-08:00|09:00-monday"]').text()).not.toContain('Tess')
		expect(wrapper.find('[data-testid="cn-slot-grid-cell-08:00|09:00-tuesday"]').text()).toContain('Tom')
	})

	test('a cell adds through a create form seeded with its row and column', async () => {
		const wrapper = make()
		await flush()

		const add = wrapper.find('[data-testid="cn-slot-grid-add-08:00|09:00-monday"]')
		expect(add.attributes('aria-label')).toBe('Add standby on Monday at 08:00')
		await add.trigger('click')

		const entry = runs['cell:08:00|09:00:monday']
		expect(entry.run).toHaveBeenCalled()
		expect(entry.action).toMatchObject({ type: 'open-form', register: 'school', schema: 'standby-slot', props: { startsAt: '08:00', endsAt: '09:00', weekday: 'monday' } })

		await wrapper.find('[data-testid="cn-slot-grid-add"]').trigger('click')
		expect(runs.add.run).toHaveBeenCalled()
	})

	test('an item is removed only after the confirm, then the grid is read again', async () => {
		mockDelete.mockResolvedValue({})
		const wrapper = make()
		await flush()

		const remove = wrapper.find('[data-testid="cn-slot-grid-remove-a"]')
		expect(remove.attributes('aria-label')).toBe('Remove Tess from standby')
		await remove.trigger('click')
		expect(mockDelete).not.toHaveBeenCalled()
		expect(wrapper.find('.confirm').text()).toContain('Tess')

		mockGet.mockClear()
		await wrapper.find('.confirm .ok').trigger('click')
		await flush()
		expect(mockDelete).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/school/standby-slot/a')
		expect(mockGet).toHaveBeenCalled()
	})

	test('an empty source shows the empty text and the add button', async () => {
		mockGet.mockResolvedValue({ data: { results: [], pages: 1 } })
		const wrapper = make({ ...CONTENT, emptyText: 'No standby hours yet' })
		await flush()

		expect(wrapper.find('[data-testid="cn-slot-grid-empty"]').text()).toBe('No standby hours yet')
		expect(wrapper.find('[data-testid="cn-slot-grid-add"]').exists()).toBe(true)
	})
})
