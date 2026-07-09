/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnRelatedObjectsWidget — aggregates an object's relations
 * (uses/used/contracts), files, and leaf-integration entry points into
 * grouped, clickable sections on the shared CnWidgetWrapper chrome.
 */

import { mount } from '@vue/test-utils'
import CnRelatedObjectsWidget from '../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import { integrations } from '../../src/integrations/registry.js'

// jest.mock calls are hoisted above imports by babel-jest regardless of source
// position, so the mocks still apply to the component import above.
jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

jest.mock('@nextcloud/router', () => ({
	generateUrl: (tpl, params = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => params[k]),
}))

const Stub = { render: (h) => h('div') }

const stubs = {
	// Render the chrome's default slot so section content is testable.
	CnWidgetWrapper: { template: '<div class="cn-widget-wrapper-stub"><slot /></div>' },
	CnIcon: true,
	FileTreeOutline: true,
	Paperclip: true,
	ChevronRight: true,
}

const flush = async () => {
	// Drain microtasks (nested fetch().json() + Promise.all) and let Vue re-render.
	await new Promise((resolve) => setTimeout(resolve, 0))
	await new Promise((resolve) => setTimeout(resolve, 0))
}

function makeStore(overrides = {}) {
	return {
		fetchUses: jest.fn().mockResolvedValue([]),
		fetchUsed: jest.fn().mockResolvedValue([]),
		fetchContracts: jest.fn().mockResolvedValue([]),
		fetchFiles: jest.fn().mockResolvedValue([]),
		...overrides,
	}
}

const mountWidget = (props = {}, store = makeStore()) => mount(CnRelatedObjectsWidget, {
	propsData: { objectType: 'lead', objectId: 'L1', store, ...props },
	stubs,
})

describe('CnRelatedObjectsWidget', () => {
	beforeEach(() => {
		integrations.__resetForTests()
		jest.clearAllMocks()
	})

	it('does not throw when objectData is null (host passes an unloaded object)', () => {
		// CnDetailPage forwards `currentObject`, which is null until the object
		// loads (e.g. the grid renders in OpenBuild edit mode). An explicit null
		// bypasses the `() => ({})` prop default, so the resolved* computeds must
		// tolerate it and fall back to the explicit register/schema/id props.
		expect(() => {
			const wrapper = mount(CnRelatedObjectsWidget, {
				propsData: { objectData: null, register: 'crm', schema: 'lead', objectId: 'L1', store: makeStore() },
				stubs,
			})
			expect(wrapper.vm.resolvedRegister).toBe('crm')
			expect(wrapper.vm.resolvedSchema).toBe('lead')
			expect(wrapper.vm.resolvedId).toBe('L1')
		}).not.toThrow()
	})

	it('does not force the Refresh action on — it follows the wrapper auto-detect default', () => {
		const WrapperProbe = {
			name: 'CnWidgetWrapper',
			props: { showRefresh: { default: null } },
			template: '<div><slot /></div>',
		}
		const wrapper = mount(CnRelatedObjectsWidget, {
			propsData: { objectType: 'lead', objectId: 'L1', store: makeStore() },
			stubs: { ...stubs, CnWidgetWrapper: WrapperProbe },
		})
		// No explicit show-refresh passed → stays null (auto). With no @refresh
		// listener on a detail page, the wrapper auto-hides Refresh.
		expect(wrapper.findComponent(WrapperProbe).props('showRefresh')).toBe(null)
	})

	it('renders related-object rows from uses/used/contracts (deduped)', async () => {
		const store = makeStore({
			fetchUses: jest.fn().mockResolvedValue([{ id: 'a1', title: 'Alpha' }]),
			fetchUsed: jest.fn().mockResolvedValue([{ id: 'a1', title: 'Alpha (dup)' }, { id: 'b2', title: 'Beta' }]),
		})
		const wrapper = mountWidget({}, store)
		await flush()
		const rows = wrapper.findAll('.cn-related-objects-widget__row')
		// a1 deduped → Alpha + Beta only (no linked apps registered).
		const labels = rows.wrappers.map((w) => w.find('.cn-related-objects-widget__label').text())
		expect(labels).toContain('Alpha')
		expect(labels).toContain('Beta')
		expect(labels.filter((l) => l.startsWith('Alpha')).length).toBe(1)
	})

	it('renders file rows from fetchFiles', async () => {
		const store = makeStore({ fetchFiles: jest.fn().mockResolvedValue([{ id: 'f1', name: 'doc.pdf', size: 2048 }]) })
		const wrapper = mountWidget({}, store)
		await flush()
		expect(wrapper.text()).toContain('doc.pdf')
	})

	it('lists leaf integrations as linked apps but omits core tabs', async () => {
		integrations.register({ id: 'files', label: 'Files', tab: Stub, widget: Stub })
		integrations.register({ id: 'email', label: 'Mails', tab: Stub, widget: Stub })
		integrations.register({ id: 'calendar', label: 'Meetings', tab: Stub, widget: Stub })
		const wrapper = mountWidget()
		await flush()
		const text = wrapper.text()
		expect(text).toContain('Mails')
		expect(text).toContain('Meetings')
		// `files` is a core tab — excluded from the Linked apps section.
		const appRows = wrapper.findAll('.cn-related-objects-widget__row--app')
		const appLabels = appRows.wrappers.map((w) => w.find('.cn-related-objects-widget__label').text())
		expect(appLabels).not.toContain('Files')
	})

	it('shows the empty state when nothing is related', async () => {
		const wrapper = mountWidget({ showIntegrations: false })
		await flush()
		expect(wrapper.find('.cn-related-objects-widget__empty').exists()).toBe(true)
	})

	it('emits select-object when a related-object row is clicked', async () => {
		const raw = { id: 'a1', title: 'Alpha' }
		const store = makeStore({ fetchUses: jest.fn().mockResolvedValue([raw]) })
		const wrapper = mountWidget({}, store)
		await flush()
		await wrapper.find('.cn-related-objects-widget__row').trigger('click')
		expect(wrapper.emitted('select-object')[0][0]).toMatchObject({ id: 'a1' })
	})

	it('emits open-integration when a linked-app row is clicked', async () => {
		integrations.register({ id: 'email', label: 'Mails', tab: Stub, widget: Stub })
		const wrapper = mountWidget()
		await flush()
		await wrapper.find('.cn-related-objects-widget__row--app').trigger('click')
		expect(wrapper.emitted('open-integration')[0][0]).toBe('email')
	})
})

/**
 * Build a fetch mock that maps each OpenRegister sub-resource suffix to a body.
 * @param {object} bodies - Map of suffix (e.g. 'relations', 'uses') to response JSON.
 * @return {Function} A jest fetch mock.
 */
function mockFetchBySuffix(bodies) {
	return jest.fn((url) => {
		const suffix = String(url).split('/').pop()
		const body = bodies[suffix] ?? {}
		return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
	})
}

const SELF = { '@self': { register: 'crm', schema: 'lead', id: 'L1' } }

const tabbedProps = (extra = {}) => ({ objectData: SELF, ...extra })

describe('CnRelatedObjectsWidget — tabbed self-fetch', () => {
	beforeEach(() => {
		integrations.__resetForTests()
		jest.clearAllMocks()
		global.OC = { requestToken: 'tok' }
	})

	afterEach(() => {
		delete global.fetch
		delete global.OC
	})

	const mountTabbed = (props = {}) => mount(CnRelatedObjectsWidget, {
		propsData: tabbedProps(props),
		stubs,
	})

	it('self-fetches /relations + /uses + /used + /files and renders a tab per non-empty group with counts', async () => {
		global.fetch = mockFetchBySuffix({
			relations: { emails: { results: [{ id: 'm1', subject: 'Hi' }], total: 1 }, events: { results: [], total: 0 } },
			uses: { results: [{ id: 'o1', title: 'Account' }], total: 1 },
			used: { results: [], total: 0 },
			files: { results: [{ id: 'f1', name: 'doc.pdf', size: 2048 }], total: 1 },
		})
		const wrapper = mountTabbed()
		await flush()
		const tabs = wrapper.findAll('.cn-related-objects-widget__tab')
		const labels = tabs.wrappers.map((w) => w.find('.cn-related-objects-widget__tab-label').text())
		// Objects (1), Files (1), Mails (1) are non-empty; Meetings (0) is omitted.
		expect(labels).toEqual(expect.arrayContaining(['Objects', 'Files', 'Mails']))
		expect(labels).not.toContain('Meetings')
		const counts = tabs.wrappers.map((w) => w.find('.cn-related-objects-widget__count').text())
		expect(counts).toContain('1')
	})

	it('uses register/schema props over @self when building endpoint URLs', async () => {
		const fetchMock = mockFetchBySuffix({ relations: {}, uses: { results: [], total: 0 }, used: { results: [], total: 0 }, files: { results: [], total: 0 } })
		global.fetch = fetchMock
		mount(CnRelatedObjectsWidget, {
			propsData: { objectData: SELF, register: 'override-reg', schema: 'override-schema' },
			stubs,
		})
		await flush()
		const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]))
		expect(calledUrls.every((u) => u.includes('/override-reg/override-schema/L1/'))).toBe(true)
	})

	it('shows the empty state and no tabs when every group is empty', async () => {
		global.fetch = mockFetchBySuffix({ relations: {}, uses: { results: [], total: 0 }, used: { results: [], total: 0 }, files: { results: [], total: 0 } })
		const wrapper = mountTabbed()
		await flush()
		expect(wrapper.findAll('.cn-related-objects-widget__tab').length).toBe(0)
		expect(wrapper.find('.cn-related-objects-widget__empty').exists()).toBe(true)
	})

	it('deep-links a file row to its Nextcloud file permalink in a new tab', async () => {
		global.fetch = mockFetchBySuffix({
			relations: {},
			uses: { results: [], total: 0 },
			used: { results: [], total: 0 },
			files: { results: [{ id: 4242, name: 'doc.pdf', size: 10 }], total: 1 },
		})
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {})
		const wrapper = mountTabbed()
		await flush()
		// Files is the only non-empty group → its tab is active.
		await wrapper.find('.cn-related-objects-widget__row').trigger('click')
		expect(openSpy).toHaveBeenCalledWith('/f/4242', '_blank', 'noopener,noreferrer')
		openSpy.mockRestore()
	})

	it('falls back to select-related for a leaf with no owning-app page (notes)', async () => {
		global.fetch = mockFetchBySuffix({
			relations: { notes: { results: [{ id: 'n1', message: 'A note' }], total: 1 } },
			uses: { results: [], total: 0 },
			used: { results: [], total: 0 },
			files: { results: [], total: 0 },
		})
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {})
		const wrapper = mountTabbed()
		await flush()
		await wrapper.find('.cn-related-objects-widget__row').trigger('click')
		expect(openSpy).not.toHaveBeenCalled()
		expect(wrapper.emitted('select-related')[0][0]).toMatchObject({ group: 'notes' })
		openSpy.mockRestore()
	})

	it('deep-links a deck card to its board/card route', async () => {
		global.fetch = mockFetchBySuffix({
			relations: { deck: { results: [{ id: 9, boardId: 3, cardId: 9, title: 'Card' }], total: 1 } },
			uses: { results: [], total: 0 },
			used: { results: [], total: 0 },
			files: { results: [], total: 0 },
		})
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {})
		const wrapper = mountTabbed()
		await flush()
		await wrapper.find('.cn-related-objects-widget__row').trigger('click')
		expect(openSpy).toHaveBeenCalledWith('/apps/deck/board/3/card/9', '_blank', 'noopener,noreferrer')
		openSpy.mockRestore()
	})

	it('falls back to the deprecated store path and warns once when layout="list"', async () => {
		// Fresh module so the one-time deprecation flag starts unset.
		let FreshWidget
		jest.isolateModules(() => {
			FreshWidget = require('../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue').default
		})
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		global.fetch = jest.fn()
		const store = makeStore({ fetchUses: jest.fn().mockResolvedValue([{ id: 'a1', title: 'Alpha' }]) })
		const wrapper = mount(FreshWidget, {
			propsData: { objectData: SELF, objectType: 'lead', layout: 'list', store },
			stubs,
		})
		await flush()
		expect(global.fetch).not.toHaveBeenCalled()
		expect(store.fetchUses).toHaveBeenCalled()
		expect(wrapper.text()).toContain('Alpha')
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('deprecated'))
		warn.mockRestore()
	})

	it('includeGroups whitelists which relation groups are visible', () => {
		const wrapper = mountWidget({ includeGroups: ['objects', 'mails'] })
		wrapper.setData({ groups: [
			{ key: 'objects', items: [{ id: 1 }], total: 1 },
			{ key: 'files', items: [{ id: 2 }], total: 1 },
			{ key: 'mails', items: [{ id: 3 }], total: 1 },
			{ key: 'events', items: [], total: 0 },
		] })
		expect(wrapper.vm.visibleGroups.map((g) => g.key)).toEqual(['objects', 'mails'])
	})

	it('shows every non-empty group when includeGroups is empty', () => {
		const wrapper = mountWidget({ includeGroups: [] })
		wrapper.setData({ groups: [
			{ key: 'objects', items: [{ id: 1 }], total: 1 },
			{ key: 'files', items: [], total: 0 },
			{ key: 'mails', items: [{ id: 3 }], total: 1 },
		] })
		expect(wrapper.vm.visibleGroups.map((g) => g.key)).toEqual(['objects', 'mails'])
	})
})
