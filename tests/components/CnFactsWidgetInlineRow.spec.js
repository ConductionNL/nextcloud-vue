/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * facts-row-inline: a row with `inline: true` spans both columns as one line,
 * so a masked BSN keeps its Show button beside it (DqContact "Identiteit").
 *
 * @spec openspec/changes/facts-row-inline/specs/facts-widget/spec.md#requirement-a-facts-row-can-be-one-line-across-both-columns
 */
import { mount } from '@vue/test-utils'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

/**
 * @param {object} content Widget content.
 * @return {object} Wrapper.
 */
function mountFacts(content) {
	return mount(CnFactsWidget, {
		props: { objectData: { id: 'p-1', bsn: '999994001', secret: 'Nee' }, content },
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcLoadingIcon: true } },
	})
}

describe('CnFactsWidget: inline row', () => {
	it('marks an inline row and keeps the others in the grid', () => {
		const w = mountFacts({ fields: [
			{ path: 'bsn', label: 'BSN', format: 'masked', reveal: true, inline: true },
			{ path: 'secret', label: 'Data protection' },
		] })
		expect(w.find('[data-testid="cn-fact-bsn"]').classes()).toContain('cn-facts-widget__row--inline')
		expect(w.find('[data-testid="cn-fact-bsn"] [data-testid="cn-fact-reveal-bsn"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-fact-secret"]').classes()).not.toContain('cn-facts-widget__row--inline')
	})
})
