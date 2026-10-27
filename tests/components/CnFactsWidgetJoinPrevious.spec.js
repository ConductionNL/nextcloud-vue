/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * facts-line-joins-previous: a line can be written on after the line before
 * it as one paragraph (DqContact "Bereikbaar via": the last contact and the
 * registration note), and stands alone when there is no line before it.
 *
 * @spec openspec/changes/facts-line-joins-previous/specs/facts-widget/spec.md#requirement-a-line-can-join-the-line-before-it
 */
import { mount } from '@vue/test-utils'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

const FIELDS = [
	{ as: 'line', path: 'lastContact' },
	{ as: 'line', text: 'Telefoon en e-mail staan niet in de basisregistratie.', joinPrevious: true, joinSeparator: '. ' },
]

/**
 * @param {object} record The record.
 * @return {object} Wrapper.
 */
function mountFacts(record) {
	return mount(CnFactsWidget, {
		props: { objectData: record, content: { fields: FIELDS } },
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcLoadingIcon: true } },
	})
}

describe('CnFactsWidget: joinPrevious', () => {
	it('writes the note on after the last contact, as one paragraph', () => {
		const lines = mountFacts({ id: 'p', lastContact: 'Laatst contact op 14 oktober, via e-mail' }).findAll('.cn-facts-widget__line')
		expect(lines).toHaveLength(1)
		expect(lines[0].text()).toBe('Laatst contact op 14 oktober, via e-mail. Telefoon en e-mail staan niet in de basisregistratie.')
		expect(lines[0].classes()).toContain('cn-facts-widget__line--joined')
	})

	it('keeps the note when there is no last contact', () => {
		const lines = mountFacts({ id: 'p' }).findAll('.cn-facts-widget__line')
		expect(lines).toHaveLength(1)
		expect(lines[0].text()).toBe('Telefoon en e-mail staan niet in de basisregistratie.')
	})
})
