/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A plain footnote under the facts, without a note band (DqZaakBesluiten
 * Beschikking "Na het ondertekenen is de beschikking niet meer te wijzigen").
 */
import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

/**
 * Mount the facts widget with the given content.
 *
 * @param {object} content Extra content.
 * @param {object|null} record The record.
 * @return {object} The wrapper.
 */
function mountFacts(content, record = { id: 'l-1', status: 'draft' }) {
	return mount(CnFactsWidget, {
		propsData: { objectData: record, content: { fields: [{ path: 'status', label: 'Status' }], ...content } },
		provide: { cnTranslate: (s) => (s === 'Signed letters cannot change.' ? 'Ondertekend is definitief.' : s) },
		stubs: { NcLoadingIcon: true },
	})
}

describe('CnFactsWidget footnote', () => {
	it('draws the translated footnote as a plain line, not a note card', () => {
		const w = mountFacts({ footnote: 'Signed letters cannot change.' })
		const line = w.find('[data-testid="cn-facts-footnote"]')
		expect(line.exists()).toBe(true)
		expect(line.element.tagName).toBe('DIV')
		expect(line.text()).toBe('Ondertekend is definitief.')
		expect(w.find('[data-testid="cn-facts-notice"]').exists()).toBe(false)
	})

	it('draws nothing without a footnote', () => {
		expect(mountFacts({}).find('[data-testid="cn-facts-footnote"]').exists()).toBe(false)
		expect(mountFacts({ footnote: '  ' }).find('[data-testid="cn-facts-footnote"]').exists()).toBe(false)
	})
})
