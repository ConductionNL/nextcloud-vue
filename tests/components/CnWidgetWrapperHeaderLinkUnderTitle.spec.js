/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header link can sit under the title instead of in the header's actions
 * (`placement: "title"`): DqDashboard draws "Alles bekijken" under
 * "Vastgelopen zaken", "Zaken die u volgt" and "Recent geopend".
 *
 * @spec openspec/changes/header-link-under-title/specs/header-link-under-title/spec.md
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

const stubs = {
	NcActions: { name: 'NcActions', template: '<div class="nc-actions-stub"><slot /></div>' },
	NcActionButton: { name: 'NcActionButton', template: '<button><slot /></button>' },
	NcActionLink: { name: 'NcActionLink', template: '<a><slot /></a>' },
	RouterLink: { name: 'RouterLink', props: ['to'], template: '<a class="router-link-stub" :data-to="JSON.stringify(to)"><slot /></a>' },
}

function mountWrapper(headerLink) {
	return mount(CnWidgetWrapper, {
		propsData: { title: 'Stalled cases', showTitle: true, showActions: false, headerLink },
		global: {
			stubs,
			mocks: { $route: { name: 'Dashboard' }, $router: { push: jest.fn() } },
			provide: { cnTranslate: (key) => (key === 'View all' ? 'Alles bekijken' : key) },
		},
	})
}

const LINK = '[data-testid="cn-widget-wrapper-header-link"]'

describe('CnWidgetWrapper — a header link under the title', () => {
	it('draws the link under the title, in the title block, and leaves the actions empty', () => {
		const wrapper = mountWrapper({ label: 'View all', route: 'Cases', query: { _watching: 'true' }, placement: 'title' })
		const stack = wrapper.find('.cn-widget-wrapper__title-stack')
		expect(stack.exists()).toBe(true)
		expect(stack.find('h3').text()).toBe('Stalled cases')
		const link = stack.find(LINK)
		expect(link.text()).toBe('Alles bekijken')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'Cases', query: { _watching: 'true' } })
		expect(wrapper.find('.cn-widget-wrapper__actions').exists()).toBe(false)
		expect(wrapper.findAll(LINK)).toHaveLength(1)
	})

	it('keeps the link in the header actions without the placement', () => {
		const wrapper = mountWrapper({ label: 'View all', route: 'Cases' })
		expect(wrapper.find('.cn-widget-wrapper__actions').find(LINK).exists()).toBe(true)
		expect(wrapper.find('.cn-widget-wrapper__title-stack').exists()).toBe(false)
	})
})
