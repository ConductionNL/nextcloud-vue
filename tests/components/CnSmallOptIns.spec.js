/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Three small opt-ins the decidiq and learniq lanes asked for: a gated
 * primary action, a headerless object list, and a date cell with the time
 * of day. The first assertion of each pins today's default.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-small-opt-ins-from-the-decidiq-and-learniq-lanes
 */
import { mount } from '@vue/test-utils'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'
import CnCellRenderer from '../../src/components/CnCellRenderer/CnCellRenderer.vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (url) => Promise.resolve({ status: 200, data: String(url).includes('/schemas') ? {} : { results: [{ id: '1', title: 'One' }], total: 1 } }),
	},
}))

function mountNav(nav, permissions) {
	return mount(CnAppNav, {
		propsData: { permissions },
		global: {
			provide: { cnManifest: { version: '1.0.0', pages: [{ id: 'Cases', route: '/cases' }], menu: [{ id: 'c', label: 'Cases', route: 'Cases' }], nav }, cnTranslate: (k) => k },
			mocks: { $route: { name: 'Cases', path: '/cases' }, $router: { resolve: () => ({ href: '#' }) } },
		},
	})
}

describe('CnAppNav — gated primary action', () => {
	it('renders an ungated primary action as before', () => {
		expect(mountNav({ primaryAction: { label: 'New', route: 'Cases' } }, ['x']).find('[data-testid="cn-nav-primary-action"]').exists()).toBe(true)
	})

	it('hides a primary action whose permission the reader lacks, and shows it when held', () => {
		const action = { label: 'New', route: 'Cases', permission: 'cases.create' }
		expect(mountNav({ primaryAction: action }, ['cases.read']).find('[data-testid="cn-nav-primary-action"]').exists()).toBe(false)
		expect(mountNav({ primaryAction: action }, ['cases.create']).find('[data-testid="cn-nav-primary-action"]').exists()).toBe(true)
	})

	it('hides a primary action whose visibleIf fails', () => {
		const w = mountNav({ primaryAction: { label: 'New', route: 'Cases', visibleIf: { appInstalled: 'no-such-app' } } }, [])
		expect(w.find('[data-testid="cn-nav-primary-action"]').exists()).toBe(false)
	})
})

describe('CnCellRenderer — date widget time of day', () => {
	const value = '2026-10-05T08:30:00'
	it('shows the date alone by default', () => {
		const text = mount(CnCellRenderer, { propsData: { value, widget: 'date' } }).text()
		expect(text).toMatch(/2026/)
		expect(text).not.toMatch(/8[:.]30/)
	})

	it('adds the time with showTime and shows only the time with timeOnly', () => {
		const both = mount(CnCellRenderer, { propsData: { value, widget: 'date', widgetProps: { showTime: true } } }).text()
		expect(both).toMatch(/2026/)
		expect(both).toMatch(/8[:.]30/)
		const time = mount(CnCellRenderer, { propsData: { value, widget: 'date', widgetProps: { timeOnly: true } } }).text()
		expect(time).toMatch(/8[:.]30/)
		expect(time).not.toMatch(/2026/)
	})
})

describe('CnObjectListWidget — hideHeader', () => {
	// Declared inside the describe: jest hoists `jest.mock` to the file top,
	// and this file's other suites mount no object list.
	const { shallowMount } = require('@vue/test-utils')
	const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

	function mountList(content) {
		return shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'r', schema: 's', ...content } },
			stubs: { CnDataTable: true, CnFormDialog: true },
			mocks: { t: (_app, s) => s },
		})
	}

	async function table(w) {
		for (let turn = 0; turn < 8; turn++) {
			await Promise.resolve()
		}
		await w.vm.$nextTick()
		return w.findComponent({ name: 'CnDataTable' })
	}

	it('keeps the table header by default and drops it with hideHeader', async () => {
		expect((await table(mountList({}))).props('hideHeader')).toBe(false)
		expect((await table(mountList({ hideHeader: true }))).props('hideHeader')).toBe(true)
	})
})
