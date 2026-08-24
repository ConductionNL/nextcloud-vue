/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An enum cell renders as a status badge whose text is the raw schema value,
 * so a Dutch table showed `submitted` under a Dutch column header. The badge
 * label is now translated.
 *
 * The trap this file mainly exists for: CnStatusBadge resolves its colour by
 * looking the LABEL up in `colorMap`. Translating the label alone would have
 * silently dropped every badge colour — the badge still renders, just grey —
 * which is exactly the kind of regression a "does it show Dutch?" assertion
 * misses. Hence `colorKey`, and hence the colour assertions below.
 */

import { mount } from '@vue/test-utils'

import CnCellRenderer from '@/components/CnCellRenderer/CnCellRenderer.vue'

const property = {
	type: 'string',
	title: 'Status',
	enum: ['submitted', 'approved'],
	colorMap: { submitted: 'warning', approved: 'success' },
}

const cnTranslate = (key) => ({ submitted: 'ingediend', approved: 'goedgekeurd' })[key] ?? key

const mountCell = (value, provide) => mount(CnCellRenderer, { propsData: { value, property }, provide })

describe('CnCellRenderer — enum badge translation', () => {
	it('translates the badge label', () => {
		const wrapper = mountCell('submitted', { cnTranslate })

		expect(wrapper.text()).toContain('ingediend')
		expect(wrapper.text()).not.toContain('submitted')
		wrapper.unmount()
	})

	it('keeps the colorMap variant, which is keyed on the RAW value', () => {
		const wrapper = mountCell('submitted', { cnTranslate })

		expect(wrapper.find('.cn-status-badge--warning').exists()).toBe(true)
		wrapper.unmount()
	})

	it('CONTROL: the same colour assertion holds untranslated', () => {
		const wrapper = mountCell('submitted')

		expect(wrapper.text()).toContain('submitted')
		expect(wrapper.find('.cn-status-badge--warning').exists()).toBe(true)
		wrapper.unmount()
	})

	it('resolves a second value/colour pair (not a single hard-coded case)', () => {
		const wrapper = mountCell('approved', { cnTranslate })

		expect(wrapper.text()).toContain('goedgekeurd')
		expect(wrapper.find('.cn-status-badge--success').exists()).toBe(true)
		wrapper.unmount()
	})
})
