/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnRelatedObjectsWidget — aggregates an object's relations
 * (uses/used/contracts), files, and leaf-integration entry points into
 * grouped, clickable sections on the shared CnWidgetWrapper chrome.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

import CnRelatedObjectsWidget from '../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import { integrations } from '../../src/integrations/registry.js'

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
	await Promise.resolve()
	await Promise.resolve()
	await Promise.resolve()
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
