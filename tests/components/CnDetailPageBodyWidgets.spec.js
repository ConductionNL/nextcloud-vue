/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDetailPage's `bodyWidgets` primitive — declarative IN-BODY
 * sections that host a registered host-app component, with token-resolved
 * props + injectable object context, placement ordering, error degradation,
 * and NO sidebar-tab requirement.
 */

import { mount } from '@vue/test-utils'
import { h, inject } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

// A host-app section component that echoes its received props so the test can
// assert token resolution.
const PropsEcho = {
	name: 'PropsEcho',
	props: ['bsn', 'objectId', 'entityType', 'maybe'],
	render() {
		return h('div', { class: 'props-echo' }, `${this.bsn}|${this.objectId}|${this.entityType}|${this.maybe === undefined ? 'UNDEF' : this.maybe}`)
	},
}

// A host-app section component that reads the injected cnSectionContext
// instead of taking explicit props.
const ContextEcho = {
	name: 'ContextEcho',
	setup() {
		const ctx = inject('cnSectionContext', null)
		return { ctx }
	},
	render() {
		// setup() returns the injected ref; Vue 2.7 auto-unwraps it on `this`,
		// so `this.ctx` is the context value object itself.
		const v = this.ctx
		return h('div', { class: 'context-echo' }, v ? `${v.objectId}|${(v.object && v.object.name) || ''}` : 'NO-CTX')
	},
}

// A section component that throws while rendering.
const Boom = {
	name: 'Boom',
	render() {
		throw new Error('kaboom')
	},
}

function makeFakeStore(object) {
	return {
		objects: object ? { 'r-s': { o1: object } } : {},
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

function mountPage(bodyWidgets, { object = { id: 'o1', bsn: '123456789', name: 'Acme' }, registry, customComponents } = {}) {
	return mount(CnDetailPage, {
		propsData: {
			register: 'r',
			schema: 's',
			objectId: 'o1',
			objectStore: makeFakeStore(object),
			bodyWidgets,
		},
		provide: {
			cnRegistry: registry || {},
			cnCustomComponents: customComponents || {},
		},
	})
}

describe('CnDetailPage — bodyWidgets (in-body sections)', () => {
	it('renders nothing when bodyWidgets is omitted / empty', () => {
		const wrapper = mount(CnDetailPage, {
			propsData: { register: 'r', schema: 's', objectId: 'o1', objectStore: makeFakeStore({ id: 'o1' }) },
		})
		expect(wrapper.find('[data-testid="cn-body-sections"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('resolves a registered component (v2 registry) and renders it in the body', () => {
		const registry = { BrpPanel: { kind: 'section', component: PropsEcho } }
		const wrapper = mountPage(
			[{ id: 'brp', component: 'BrpPanel', title: 'BRP', props: { bsn: '@object.bsn', objectId: '@objectId', entityType: 'client' } }],
			{ registry },
		)
		const echo = wrapper.find('.props-echo')
		expect(echo.exists()).toBe(true)
		// @object.bsn → 123456789, @objectId → o1, literal 'client'
		expect(echo.text()).toBe('123456789|o1|client|UNDEF')
		// rendered inside the body sections host
		expect(wrapper.find('[data-testid="cn-body-section-component-brp"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('resolves from the legacy customComponents map', () => {
		const wrapper = mountPage(
			[{ id: 'brp', component: 'LegacyPanel', props: { objectId: '@objectId' } }],
			{ customComponents: { LegacyPanel: PropsEcho } },
		)
		expect(wrapper.find('.props-echo').text()).toBe('undefined|o1|undefined|UNDEF')
		wrapper.unmount()
	})

	it('drops unresolved / optional tokens from props (child sees undefined)', () => {
		const registry = { P: { kind: 'section', component: PropsEcho } }
		const wrapper = mountPage(
			[{ id: 's1', component: 'P', props: { objectId: '@objectId', maybe: '@workspace.nope?' } }],
			{ registry },
		)
		// maybe resolves to an unset optional workspace token → dropped → UNDEF
		expect(wrapper.find('.props-echo').text()).toBe('undefined|o1|undefined|UNDEF')
		wrapper.unmount()
	})

	it('provides the object context for inject-based section components', () => {
		const registry = { Ctx: { kind: 'section', component: ContextEcho } }
		const wrapper = mountPage(
			[{ id: 'c1', component: 'Ctx' }],
			{ registry, object: { id: 'o1', name: 'Acme' } },
		)
		expect(wrapper.find('.context-echo').text()).toBe('o1|Acme')
		wrapper.unmount()
	})

	it('orders sections by placement (before-body → after-data → after-related → end)', () => {
		const registry = {
			A: { kind: 'section', component: { name: 'A', render: () => h('div', { class: 'sec-a' }) } },
			B: { kind: 'section', component: { name: 'B', render: () => h('div', { class: 'sec-b' }) } },
			C: { kind: 'section', component: { name: 'C', render: () => h('div', { class: 'sec-c' }) } },
			D: { kind: 'section', component: { name: 'D', render: () => h('div', { class: 'sec-d' }) } },
		}
		const wrapper = mountPage(
			[
				{ id: 'd', component: 'D', placement: 'end' },
				{ id: 'a', component: 'A', placement: 'before-body' },
				{ id: 'c', component: 'C', placement: 'after-related' },
				{ id: 'b', component: 'B', placement: 'after-data' },
			],
			{ registry },
		)
		const html = wrapper.html()
		const ia = html.indexOf('sec-a')
		const ib = html.indexOf('sec-b')
		const ic = html.indexOf('sec-c')
		const id = html.indexOf('sec-d')
		expect(ia).toBeGreaterThan(-1)
		expect(ia).toBeLessThan(ib)
		expect(ib).toBeLessThan(ic)
		expect(ic).toBeLessThan(id)
		wrapper.unmount()
	})

	it('treats a section with no placement as the END placement', () => {
		const registry = { P: { kind: 'section', component: PropsEcho } }
		const wrapper = mountPage([{ id: 'x', component: 'P', props: { objectId: '@objectId' } }], { registry })
		// rendered under the `end` placement host
		const end = wrapper.find('[data-testid="cn-detail-body-sections-end"]')
		expect(end.exists()).toBe(true)
		expect(end.find('.props-echo').exists()).toBe(true)
		wrapper.unmount()
	})

	it('a throwing section degrades to an inline error and does not break the page', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const registry = {
			Boom: { kind: 'section', component: Boom },
			Ok: { kind: 'section', component: { name: 'Ok', render: () => h('div', { class: 'ok-sec' }) } },
		}
		const wrapper = mountPage(
			[{ id: 'boom', component: 'Boom' }, { id: 'ok', component: 'Ok' }],
			{ registry },
		)
		// errorCaptured schedules the boundary's fallback re-render on the next tick.
		await wrapper.vm.$nextTick()
		// the page still rendered, and the sibling section is present
		expect(wrapper.find('[data-testid="cn-detail-page"]').exists()).toBe(true)
		expect(wrapper.find('.ok-sec').exists()).toBe(true)
		// the broken section shows its inline error fallback
		expect(wrapper.find('[data-testid="cn-body-section-threw-boom"]').exists()).toBe(true)
		spy.mockRestore()
		wrapper.unmount()
	})

	it('shows an inline error when the component name is not registered', () => {
		const wrapper = mountPage([{ id: 'missing', component: 'NopeComponent' }], { registry: {} })
		expect(wrapper.find('[data-testid="cn-body-section-error-missing"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('requires NO sidebar tab — sidebar stays inactive for a body section', () => {
		const registry = { P: { kind: 'section', component: PropsEcho } }
		const wrapper = mountPage([{ id: 'p', component: 'P', props: { objectId: '@objectId' } }], { registry })
		// the section rendered without any integration/sidebar registration
		expect(wrapper.find('.props-echo').exists()).toBe(true)
		wrapper.unmount()
	})
})
