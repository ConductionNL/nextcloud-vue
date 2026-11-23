/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts card takes its entries from a record the page reads beside this
 * one (a case type's `requestFields`), else draws its own `fields`; a
 * template placeholder may name a format ("{periodFrom:year}").
 *
 * @spec openspec/changes/facts-fields-from-context/specs/facts-widget/spec.md
 */
import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const record = {
	description: 'Ik wil de documenten.',
	request: { scope: 'Alle adviezen en mails.', from: '2025-03-01', to: '2026-09-30', kinds: ['correspondentie', 'rapporten'] },
}

function textWith(caseType) {
	const w = mount(CnFactsWidget, {
		props: {
			content: { fieldsFrom: '@context.caseType.requestFields', fields: [{ as: 'text', path: 'description' }] },
			objectData: record,
		},
		global: { provide: { cnDetailVisibilityRows: { value: { caseType } } } },
	})
	return w.text()
}

describe('CnFactsWidget fieldsFrom', () => {
	it('draws the entries the context names', () => {
		const text = textWith({
			requestFields: [
				{ as: 'text', path: 'request.scope' },
				{ as: 'pill', template: 'Periode {request.from:year} tot en met {request.to:year}' },
				{ as: 'pill', path: 'request.kinds', map: { correspondentie: 'Correspondentie', rapporten: 'Rapporten' } },
			],
		})
		expect(text).toContain('Alle adviezen en mails.')
		expect(text).toContain('Periode 2025 tot en met 2026')
		expect(text).toContain('Correspondentie, Rapporten')
		expect(text).not.toContain('Ik wil de documenten.')
	})

	it('draws pills in a row on one line', () => {
		const w = mount(CnFactsWidget, {
			props: { content: { fields: [{ as: 'pill', key: 'a', text: 'A', template: 'A {request.scope}' }, { as: 'pill', key: 'b', path: 'request.kinds' }] }, objectData: record },
		})
		const row = w.find('.cn-facts-widget__pills')
		expect(row.exists()).toBe(true)
		expect(row.find('[data-testid="cn-fact-a"]').exists()).toBe(true)
		expect(row.find('[data-testid="cn-fact-b"]').exists()).toBe(true)
	})

	it('falls back to its own fields when the context names none', () => {
		expect(textWith({})).toContain('Ik wil de documenten.')
		expect(textWith({ requestFields: [] })).toContain('Ik wil de documenten.')
		expect(textWith({ requestFields: 'description' })).toContain('Ik wil de documenten.')
	})
})
