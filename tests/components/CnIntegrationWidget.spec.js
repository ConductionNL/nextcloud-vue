/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnIntegrationWidget — the tabbed integration widget +
 * single-integration mode that supersedes CnIntegrationCard /
 * CnIntegrationWidgetGrid.
 *
 * Covers:
 *   - tabbed mode renders one tab per available integration, clicking
 *     switches the rendered content
 *   - single mode (`only`) renders no tab strip, just the one leaf
 *   - empty state: an unavailable integration renders NcEmptyContent
 *     with the app icon + a docs link
 *   - `include` allowlist narrows the tab set
 *   - surface filtering honours a descriptor `surfaces` allowlist
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'

import CnIntegrationWidget from '../../src/components/CnIntegrationWidget/CnIntegrationWidget.vue'
import { createIntegrationRegistry } from '../../src/integrations/registry.js'

// Leaf content stubs — each renders an identifiable marker so we can
// assert which integration's content is active. Render functions (not
// `template`) so they work under Vue's runtime-only build in jest.
function leafStub(id) {
	return {
		name: `Stub${id}Tab`,
		props: ['integrationId', 'register', 'schema', 'objectId', 'surface', 'apiBase', 'objectType'],
		render() {
			return h('div', { class: 'leaf-content', attrs: { 'data-leaf': this.integrationId } }, `${id} content`)
		},
	}
}

const widgetStub = { name: 'StubWidget', render: (h) => h('div') }

function makeRegistry(entries) {
	const registry = createIntegrationRegistry()
	for (const e of entries) {
		registry.register(e)
	}
	return registry
}

function baseEntry(id, overrides = {}) {
	return {
		id,
		label: id.charAt(0).toUpperCase() + id.slice(1),
		icon: 'HelpCircleOutline',
		requiredApp: null, // null requiredApp ⇒ always-available built-in
		tab: leafStub(id),
		widget: widgetStub,
		...overrides,
	}
}

function mountWidget(registry, propsData = {}) {
	return mount(CnIntegrationWidget, {
		propsData: {
			registry,
			register: 'decidesk',
			schema: 'meeting',
			objectId: 'obj-1',
			...propsData,
		},
		stubs: {
			// Render NcEmptyContent's slots so we can assert the action link.
			// Render functions (not `template`) for the runtime-only build.
			NcEmptyContent: {
				name: 'NcEmptyContent',
				props: ['name', 'description'],
				render() {
					const slots = this.$slots
					return h('div', { class: 'nc-empty', attrs: { 'data-name': this.name } }, [
						slots.icon,
						slots.action,
					])
				},
			},
			NcButton: {
				name: 'NcButton',
				props: ['href', 'type'],
				render() {
					return h('a', { class: 'nc-button', attrs: { href: this.href } }, this.$slots.default)
				},
			},
		},
	})
}

describe('CnIntegrationWidget — tabbed mode', () => {
	it('renders one tab per available integration', () => {
		const registry = makeRegistry([
			baseEntry('deck', { order: 2 }),
			baseEntry('calendar', { order: 1 }),
		])
		const wrapper = mountWidget(registry)
		const tabs = wrapper.findAll('[role="tab"]')
		expect(tabs.length).toBe(2)
		// order-sorted: calendar (1) before deck (2)
		expect(tabs.at(0).attributes('data-testid')).toBe('cn-integration-widget-tab-calendar')
		expect(tabs.at(1).attributes('data-testid')).toBe('cn-integration-widget-tab-deck')
		wrapper.unmount()
	})

	it('renders the first tab content active and switches on click', async () => {
		const registry = makeRegistry([
			baseEntry('calendar', { order: 1 }),
			baseEntry('deck', { order: 2 }),
		])
		const wrapper = mountWidget(registry)
		expect(wrapper.find('.leaf-content').attributes('data-leaf')).toBe('calendar')

		await wrapper.find('[data-testid="cn-integration-widget-tab-deck"]').trigger('click')
		expect(wrapper.find('.leaf-content').attributes('data-leaf')).toBe('deck')
		wrapper.unmount()
	})

	it('marks the active tab with aria-selected', async () => {
		const registry = makeRegistry([baseEntry('a', { order: 1 }), baseEntry('b', { order: 2 })])
		const wrapper = mountWidget(registry)
		const tabA = wrapper.find('[data-testid="cn-integration-widget-tab-a"]')
		expect(tabA.attributes('aria-selected')).toBe('true')
		await wrapper.find('[data-testid="cn-integration-widget-tab-b"]').trigger('click')
		expect(tabA.attributes('aria-selected')).toBe('false')
		wrapper.unmount()
	})

	it('shows NcEmptyContent when there are no integrations', () => {
		const registry = makeRegistry([])
		const wrapper = mountWidget(registry)
		expect(wrapper.find('[role="tab"]').exists()).toBe(false)
		expect(wrapper.find('.nc-empty').exists()).toBe(true)
		wrapper.unmount()
	})
})

describe('CnIntegrationWidget — single mode', () => {
	it('renders no tab strip and only the named leaf', () => {
		const registry = makeRegistry([baseEntry('deck'), baseEntry('calendar')])
		const wrapper = mountWidget(registry, { only: 'deck' })
		expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
		expect(wrapper.find('.leaf-content').attributes('data-leaf')).toBe('deck')
		// compact header with the label
		expect(wrapper.text()).toContain('Deck')
		wrapper.unmount()
	})

	it('renders an empty state when `only` references an unknown leaf', () => {
		const registry = makeRegistry([baseEntry('deck')])
		const wrapper = mountWidget(registry, { only: 'does-not-exist' })
		expect(wrapper.find('.leaf-content').exists()).toBe(false)
		expect(wrapper.find('.nc-empty').exists()).toBe(true)
		wrapper.unmount()
	})
})

describe('CnIntegrationWidget — empty / unavailable state', () => {
	it('renders NcEmptyContent with a docs link when the integration is unavailable', () => {
		// requiredApp set + isAppInstalled-style signal absent ⇒ unavailable.
		// The descriptor carries `available: false` so resolution is
		// deterministic without OC globals.
		const registry = makeRegistry([
			baseEntry('deck', { requiredApp: 'deck', available: false, appName: 'Deck' }),
		])
		const wrapper = mountWidget(registry, { only: 'deck' })
		expect(wrapper.find('.leaf-content').exists()).toBe(false)
		const empty = wrapper.find('.nc-empty')
		expect(empty.exists()).toBe(true)
		expect(empty.attributes('data-name')).toContain('Deck')
		const link = wrapper.find('.nc-button')
		expect(link.attributes('href')).toBe('https://openregister.conduction.nl/docs/Integrations/deck/')
		wrapper.unmount()
	})

	it('still renders a tab for an unavailable integration in tabbed mode', () => {
		const registry = makeRegistry([
			baseEntry('deck', { requiredApp: 'deck', available: false }),
		])
		const wrapper = mountWidget(registry)
		expect(wrapper.find('[data-testid="cn-integration-widget-tab-deck"]').exists()).toBe(true)
		expect(wrapper.find('.nc-empty').exists()).toBe(true)
		wrapper.unmount()
	})

	it('uses "not configured" copy for external integrations', () => {
		const registry = makeRegistry([
			baseEntry('xwiki', { group: 'external', requiredApp: null, available: false, appName: 'xWiki' }),
		])
		const wrapper = mountWidget(registry, { only: 'xwiki' })
		expect(wrapper.find('.nc-empty').attributes('data-name')).toContain('not configured')
		wrapper.unmount()
	})
})

describe('CnIntegrationWidget — filtering', () => {
	it('include allowlist narrows the tab set', () => {
		const registry = makeRegistry([
			baseEntry('a', { order: 1 }),
			baseEntry('b', { order: 2 }),
			baseEntry('c', { order: 3 }),
		])
		const wrapper = mountWidget(registry, { include: ['a', 'c'] })
		const ids = wrapper.findAll('[role="tab"]').wrappers.map((w) => w.attributes('data-testid'))
		expect(ids).toEqual([
			'cn-integration-widget-tab-a',
			'cn-integration-widget-tab-c',
		])
		wrapper.unmount()
	})

	it('surface filtering honours a descriptor surfaces allowlist', () => {
		const registry = makeRegistry([
			baseEntry('a', { order: 1, surfaces: ['detail-page'] }),
			baseEntry('b', { order: 2, surfaces: ['user-dashboard'] }),
		])
		const wrapper = mountWidget(registry, { surface: 'detail-page' })
		const ids = wrapper.findAll('[role="tab"]').wrappers.map((w) => w.attributes('data-testid'))
		expect(ids).toEqual(['cn-integration-widget-tab-a'])
		wrapper.unmount()
	})
})
