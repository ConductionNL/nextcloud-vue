/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqSociaalDomein: the handler row is labelled by the case type ("Regisseur"),
 * else by its own label.
 *
 * @spec openspec/changes/facts-label-from-path/specs/facts-widget/spec.md#requirement-a-facts-row-can-take-its-label-from-the-record-or-its-context
 */
import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

function labelWith(caseType) {
	const w = mount(CnFactsWidget, {
		props: {
			content: { fields: [{ label: 'Handler', labelPath: '@context.caseType.handlerLabel', path: 'assignee' }] },
			objectData: { assignee: 'Fatma Kaya' },
		},
		global: { provide: { cnDetailVisibilityRows: { value: { caseType } } } },
	})
	return w.text()
}

describe('CnFactsWidget labelPath', () => {
	it('labels the row from the context when it holds text', () => {
		expect(labelWith({ handlerLabel: 'Regisseur' })).toContain('Regisseur')
	})

	it('falls back to the label', () => {
		expect(labelWith({})).toContain('Handler')
		expect(labelWith({ handlerLabel: '  ' })).toContain('Handler')
	})
})
