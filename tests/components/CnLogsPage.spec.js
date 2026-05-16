/**
 * Tests for CnLogsPage.
 *
 * Covers Phase 4 of manifest-page-type-extensions: empty state,
 * populated state, header/actions slot override, store-vs-source
 * dispatch.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

import { mount } from '@vue/test-utils'
import CnLogsPage from '@/components/CnLogsPage/CnLogsPage.vue'

const stubs = {
	CnDataTable: {
		template: '<div class="cn-data-table-stub"><slot name="row-actions" :row="{}" /></div>',
		props: ['columns', 'rows', 'rowKey', 'emptyText'],
	},
	CnPageHeader: {
		template: '<div class="cn-page-header-stub" />',
		props: ['title', 'description', 'icon'],
	},
}

describe('CnLogsPage', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
		jest.clearAllMocks()
	})

	it('renders empty-state when no register/schema/source set', () => {
		const wrapper = mount(CnLogsPage, { stubs })
		expect(wrapper.find('.cn-logs-page__empty').exists()).toBe(true)
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Neither register+schema nor source'))
	})

	it('fetches via axios when only `source` is set', async () => {
		const axios = require('@nextcloud/axios').default
		axios.get.mockResolvedValueOnce({ data: { results: [{ id: 1, action: 'create' }] } })
		const wrapper = mount(CnLogsPage, {
			propsData: { source: '/api/my-logs' },
			stubs,
		})
		// flush microtasks
		await new Promise((r) => setTimeout(r, 0))
		expect(axios.get).toHaveBeenCalledWith('/api/my-logs')
		expect(wrapper.vm.localRows).toEqual([{ id: 1, action: 'create' }])
	})

	it('renders the data-table when rows are populated (populated state)', async () => {
		const axios = require('@nextcloud/axios').default
		axios.get.mockResolvedValueOnce({ data: [{ id: 1, timestamp: 't', actor: 'a', action: 'b' }] })
		const wrapper = mount(CnLogsPage, {
			propsData: { source: '/api/x' },
			stubs,
		})
		// Wait for fetch + watch + render cycles.
		await new Promise((r) => setTimeout(r, 0))
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.localRows.length).toBe(1)
		expect(wrapper.find('.cn-data-table-stub').exists()).toBe(true)
		expect(wrapper.find('.cn-logs-page__empty').exists()).toBe(false)
	})

	it('honours the #header slot override (mirrors headerComponent dispatch)', () => {
		const wrapper = mount(CnLogsPage, {
			propsData: { source: '/x' },
			stubs,
			scopedSlots: {
				header: '<div class="custom-header">Custom Logs Header</div>',
			},
		})
		expect(wrapper.find('.custom-header').exists()).toBe(true)
		// CnPageHeader stub should NOT render when slot is overridden.
		expect(wrapper.find('.cn-page-header-stub').exists()).toBe(false)
	})

	it('honours the #actions slot override (mirrors actionsComponent dispatch)', () => {
		const wrapper = mount(CnLogsPage, {
			propsData: { source: '/x' },
			stubs,
			slots: { actions: '<button class="custom-action">Refresh</button>' },
		})
		expect(wrapper.find('.cn-logs-page__actions').exists()).toBe(true)
		expect(wrapper.find('.custom-action').exists()).toBe(true)
	})

	it('uses default columns when none supplied', () => {
		const wrapper = mount(CnLogsPage, { propsData: { source: '/x' }, stubs })
		const cols = wrapper.vm.resolvedColumns.map((c) => c.key)
		expect(cols).toEqual(['timestamp', 'actor', 'action', 'target', 'details'])
	})

	it('expands string columns to {key, label} objects', () => {
		const wrapper = mount(CnLogsPage, {
			propsData: { source: '/x', columns: ['when', 'who', 'what'] },
			stubs,
		})
		expect(wrapper.vm.resolvedColumns).toEqual([
			{ key: 'when', label: 'When' },
			{ key: 'who', label: 'Who' },
			{ key: 'what', label: 'What' },
		])
	})

	it('register+schema mode does NOT call axios (uses store)', () => {
		const axios = require('@nextcloud/axios').default
		const fakeStore = {
			collections: { 'audit-event': [] },
			registerObjectType: jest.fn(),
			fetchCollection: jest.fn().mockResolvedValue([]),
		}
		mount(CnLogsPage, {
			propsData: { register: 'audit', schema: 'event', store: fakeStore },
			stubs,
		})
		expect(axios.get).not.toHaveBeenCalled()
		expect(fakeStore.registerObjectType).toHaveBeenCalledWith('audit-event', {
			register: 'audit',
			schema: 'event',
		})
	})
})
