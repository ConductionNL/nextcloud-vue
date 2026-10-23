/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card subtitle can depend on the record: `[{ when, text }]`, the first
 * entry whose condition holds (an entry without `when` always does). A case
 * type that reviews its documents says "Per document beoordelen of het
 * openbaar kan" under the Files card (DqZaakDocumenten); other case types say
 * nothing.
 *
 * @spec openspec/changes/widget-subtitle-by-condition/specs/widget-subtitle-by-condition/spec.md#requirement-a-card-subtitle-can-depend-on-the-record
 */
import { pickConditionalText } from '../../src/utils/conditionalText.js'

const REVIEWED = { field: '@context.caseType.documentReview.enabled', op: 'eq', value: true }
const SPEC = [{ when: REVIEWED, text: 'Assess per document whether it can be public.' }]

describe('pickConditionalText', () => {
	it('keeps a plain string', () => {
		expect(pickConditionalText('Notes', null)).toBe('Notes')
	})

	it('picks the first entry whose condition holds', () => {
		const data = { '@context': { caseType: { documentReview: { enabled: true } } } }
		expect(pickConditionalText(SPEC, data)).toBe('Assess per document whether it can be public.')
	})

	it('says nothing when no condition holds, or before the record is there', () => {
		expect(pickConditionalText(SPEC, { '@context': { caseType: { documentReview: { enabled: false } } } })).toBe('')
		expect(pickConditionalText(SPEC, null)).toBe('')
	})

	it('falls back to an entry without a condition', () => {
		expect(pickConditionalText([...SPEC, { text: 'Files of this case' }], { '@context': { caseType: {} } })).toBe('Files of this case')
	})
})
