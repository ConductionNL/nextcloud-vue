/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The widget's content region is named by its title through aria-labelledby.
 * Two wrappers with the same widget id (every CnObjectDataWidget on a record
 * page defaults to the object type) must not share the title id, or each
 * region is announced with the first card's title (WCAG 1.3.1, 4.1.2).
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

const stubs = { NcActions: true, NcActionButton: true, NcActionLink: true }

function mountAttached(title, widgetId) {
	const host = document.createElement('div')
	document.body.appendChild(host)
	return mount(CnWidgetWrapper, {
		propsData: { title, widgetId, showTitle: true },
		stubs,
		mocks: { $route: { name: 'Case' } },
		attachTo: host,
	})
}

function regionName(wrapper) {
	const region = wrapper.find('[role="region"]').element
	return document.getElementById(region.getAttribute('aria-labelledby'))?.textContent.trim()
}

describe('CnWidgetWrapper — title id', () => {
	afterEach(() => {
		document.body.innerHTML = ''
	})

	it('keeps the widget id in the title id when it is unique on the page', () => {
		const wrapper = mountAttached('Zaakgegevens', 'case-data')
		expect(wrapper.find('h3').attributes('id')).toBe('cn-widget-wrapper-title-case-data')
		expect(regionName(wrapper)).toBe('Zaakgegevens')
	})

	it('names each region by its own title when two widgets share a widget id', async () => {
		const first = mountAttached('Zaakgegevens', 'case')
		const second = mountAttached('Prioriteit', 'case')
		await second.vm.$nextTick()
		const ids = [first, second].map((w) => w.find('h3').attributes('id'))
		expect(new Set(ids).size).toBe(2)
		expect(ids[0]).toBe('cn-widget-wrapper-title-case')
		expect(regionName(first)).toBe('Zaakgegevens')
		expect(regionName(second)).toBe('Prioriteit')
	})
})
