/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-registry-public-flag/tasks.md#task-1
 * @spec openspec/changes/widget-registry-public-flag/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnWidgetGrid from '../../src/components/CnWidgetGrid/CnWidgetGrid.vue'
import { dashboardWidgetRegistry, getWidgetTypeEntry, isPublicWidgetType, registerDashboardWidget } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const secretMounted = jest.fn()
const SecretWidget = {
	name: 'SecretWidget',
	created() {
		secretMounted()
	},
	template: '<div class="secret-widget">authenticated data</div>',
}
const OpenWidget = { name: 'OpenWidget', template: '<div class="open-widget">open</div>' }

beforeAll(() => {
	registerDashboardWidget('test-secret', { renderer: SecretWidget, form: {}, defaultContent: {}, displayName: 'Secret', icon: 'X' })
	registerDashboardWidget('test-open', { renderer: OpenWidget, form: {}, defaultContent: {}, displayName: 'Open', icon: 'X', public: true })
})

beforeEach(() => {
	secretMounted.mockClear()
	jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

function grid(widgets, props = {}) {
	return mount(CnWidgetGrid, {
		propsData: { slotName: 'body', widgets, ...props },
		stubs: { CnUnknownWidget: { template: '<div class="placeholder" />' } },
	})
}

const placement = (widgetKey) => ({ widgetKey, slot: 'body', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 1 })

describe('the public flag on the registry', () => {
	it('every registration reports a boolean, and only markdown and the test widget are public', () => {
		const flags = Object.fromEntries(Object.entries(dashboardWidgetRegistry).map(([type, entry]) => [type, entry.public]))
		expect(Object.values(flags).every((v) => typeof v === 'boolean')).toBe(true)
		const publicTypes = Object.keys(flags).filter((t) => flags[t] === true).sort()
		expect(publicTypes).toEqual(['markdown', 'test-open'])
	})

	it('records public only when explicitly passed', () => {
		expect(isPublicWidgetType('test-open')).toBe(true)
		expect(isPublicWidgetType('test-secret')).toBe(false)
		expect(isPublicWidgetType('does-not-exist')).toBe(false)
		expect(getWidgetTypeEntry('test-secret').public).toBe(false)
	})

	it('refuses a non-boolean public rather than coercing it', () => {
		expect(() => registerDashboardWidget('test-bad', { renderer: OpenWidget, public: 'yes' })).toThrow(TypeError)
		expect(getWidgetTypeEntry('test-bad')).toBeNull()
	})
})

describe('CnWidgetGrid under the public host', () => {
	it('mounts a public widget', () => {
		const w = grid([placement('test-open')], { host: 'public' })
		expect(w.find('.open-widget').exists()).toBe(true)
	})

	it('renders a placeholder for a non-public widget and never runs its code', () => {
		const w = grid([placement('test-secret')], { host: 'public' })
		expect(secretMounted).not.toHaveBeenCalled()
		expect(w.find('.secret-widget').exists()).toBe(false)
		expect(w.find('.placeholder').exists()).toBe(true)
	})

	it('does not let a consumer registry or a built-in put a non-public key on the page', () => {
		const w = grid([placement('test-secret')], { host: 'public', registry: { 'test-secret': SecretWidget, 'object-table': SecretWidget } })
		expect(secretMounted).not.toHaveBeenCalled()
		const w2 = grid([placement('object-table')], { host: 'public' })
		expect(w2.find('.placeholder').exists()).toBe(true)
		expect(w.find('.secret-widget').exists()).toBe(false)
	})

	it('one bad key does not take the page down', () => {
		const w = grid([placement('nope'), placement('test-open'), placement('test-open'), placement('test-open')], { host: 'public' })
		expect(w.findAll('.open-widget')).toHaveLength(3)
		expect(w.findAll('.placeholder')).toHaveLength(1)
	})

	it('reads the host from the injected cnHost', () => {
		const w = mount(CnWidgetGrid, {
			propsData: { slotName: 'body', widgets: [placement('test-secret')] },
			provide: { cnHost: 'public' },
			stubs: { CnUnknownWidget: { template: '<div class="placeholder" />' } },
		})
		expect(secretMounted).not.toHaveBeenCalled()
		expect(w.find('.placeholder').exists()).toBe(true)
	})
})

describe('CnWidgetGrid under the Nextcloud host', () => {
	it('still renders a non-public widget', () => {
		const w = grid([placement('test-secret')])
		expect(secretMounted).toHaveBeenCalled()
		expect(w.find('.secret-widget').exists()).toBe(true)
	})
})
