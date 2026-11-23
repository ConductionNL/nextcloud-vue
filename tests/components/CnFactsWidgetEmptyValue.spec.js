/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFactsWidget `emptyValue`: an entry without a value reads its declared
 * words and stays drawn (board DqZaak, "Overschreven: Nee" on the Prioriteit card).
 *
 * @spec openspec/changes/facts-entry-empty-value/specs/facts-widget/spec.md
 */
import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

function mountFacts(content, objectData) {
	return mount(CnFactsWidget, {
		propsData: { content, objectData },
		provide: { cnTranslate: (key) => (key === 'No' ? 'Nee' : key) },
		stubs: { NcLoadingIcon: true },
	})
}

const override = { path: 'priorityOverride', label: 'Overridden', map: { high: 'High' }, emptyValue: 'No', suffix: '!' }

describe('CnFactsWidget emptyValue', () => {
	it('draws an empty entry with its translated empty value under hideEmpty', () => {
		const w = mountFacts({ fields: [override] }, { id: 'z-1' })
		expect(w.find('[data-testid="cn-fact-priorityOverride"] .cn-facts-widget__value').text()).toBe('Nee')
	})

	it('shows the value when there is one', () => {
		const w = mountFacts({ fields: [override] }, { id: 'z-2', priorityOverride: 'high' })
		expect(w.find('[data-testid="cn-fact-priorityOverride"] .cn-facts-widget__value').text()).toBe('High!')
	})

	it('still drops an empty entry without emptyValue', () => {
		const w = mountFacts({ fields: [{ path: 'priorityOverride', label: 'Overridden' }] }, { id: 'z-3' })
		expect(w.find('[data-testid="cn-fact-priorityOverride"]').exists()).toBe(false)
	})
})
