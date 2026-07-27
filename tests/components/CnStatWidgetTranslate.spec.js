/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnStatWidget's label/caption translation — the manifest-authored
 * `content.label` and `content.caption` are run through the host translate
 * function (the `translate` prop, else the injected `cnTranslate`) so a KPI
 * tile localises to the user's language instead of showing the raw source
 * string. Falls back to an identity function when no translator is provided.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

import { mount } from '@vue/test-utils'

import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

// A widget with no source resolves no value; we only assert on the label/caption.
const content = { label: 'New cases', caption: 'this month' }

describe('CnStatWidget — label/caption translation', () => {
	it('translates the label + caption via the injected cnTranslate', () => {
		const dict = { 'New cases': 'Nieuwe zaken', 'this month': 'deze maand' }
		const wrapper = mount(CnStatWidget, {
			propsData: { content },
			stubs,
			provide: { cnTranslate: (key) => dict[key] ?? key },
		})
		expect(wrapper.find('.cn-stat-widget__label').text()).toBe('Nieuwe zaken')
		expect(wrapper.find('.cn-stat-widget__caption').text()).toBe('deze maand')
		wrapper.unmount()
	})

	it('prefers the explicit translate prop over the injected cnTranslate', () => {
		const wrapper = mount(CnStatWidget, {
			propsData: { content, translate: () => 'FROM_PROP' },
			stubs,
			provide: { cnTranslate: () => 'FROM_INJECT' },
		})
		expect(wrapper.find('.cn-stat-widget__label').text()).toBe('FROM_PROP')
		wrapper.unmount()
	})

	it('renders the raw source string when no translator is provided (identity fallback)', () => {
		const wrapper = mount(CnStatWidget, { propsData: { content }, stubs })
		expect(wrapper.find('.cn-stat-widget__label').text()).toBe('New cases')
		expect(wrapper.find('.cn-stat-widget__caption').text()).toBe('this month')
		wrapper.unmount()
	})
})
