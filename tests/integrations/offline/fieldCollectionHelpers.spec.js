/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

import {
	classifyGps,
	validateChecklistAnswers,
	checklistProgress,
	syncIndicator,
	GPS_POOR_ACCURACY_M,
} from '../../../src/integrations/offline/fieldCollectionHelpers.js'

describe('fieldCollectionHelpers', () => {
	describe('classifyGps', () => {
		it('classifies a precise fix as good', () => {
			expect(classifyGps({ accuracy: 5 }).quality).toBe('good')
		})

		it('warns on a poor fix', () => {
			const r = classifyGps({ accuracy: GPS_POOR_ACCURACY_M + 1 })
			expect(r.quality).toBe('poor')
			expect(r.warning).toBeTruthy()
		})

		it('reports sensorless when no fix is available', () => {
			expect(classifyGps(null, false).quality).toBe('sensorless')
			expect(classifyGps(null).quality).toBe('sensorless')
		})
	})

	describe('validateChecklistAnswers', () => {
		const template = {
			items: [
				{ questionId: 'q1', type: 'text', required: true },
				{ questionId: 'q2', type: 'photo_required', required: true },
				{ questionId: 'q3', type: 'text', required: false },
			],
		}

		it('blocks when a required answer is empty', () => {
			const r = validateChecklistAnswers(template, { q1: { answer: '' }, q2: { evidenceRefs: ['e'] } })
			expect(r.valid).toBe(false)
			expect(r.errors.map((e) => e.questionId)).toContain('q1')
		})

		it('blocks when a required photo is missing', () => {
			const r = validateChecklistAnswers(template, { q1: { answer: 'ok' }, q2: { evidenceRefs: [] } })
			expect(r.valid).toBe(false)
			expect(r.errors.map((e) => e.questionId)).toContain('q2')
		})

		it('passes when all required items are satisfied', () => {
			const r = validateChecklistAnswers(template, { q1: { answer: 'ok' }, q2: { evidenceRefs: ['e'] } })
			expect(r.valid).toBe(true)
			expect(r.errors).toHaveLength(0)
		})
	})

	describe('checklistProgress', () => {
		it('counts answered items including photo evidence', () => {
			const template = {
				items: [
					{ questionId: 'q1', type: 'text' },
					{ questionId: 'q2', type: 'photo_required' },
					{ questionId: 'q3', type: 'text' },
				],
			}
			const answers = { q1: { answer: 'a' }, q2: { evidenceRefs: ['e'] }, q3: { answer: '' } }
			expect(checklistProgress(template, answers)).toEqual({ done: 2, total: 3 })
		})
	})

	describe('syncIndicator', () => {
		it('is error when offline', () => {
			expect(syncIndicator(2, false).tone).toBe('error')
		})

		it('is warning when there are pending changes online', () => {
			expect(syncIndicator(3, true).tone).toBe('warning')
		})

		it('is success when synced online', () => {
			expect(syncIndicator(0, true).tone).toBe('success')
		})
	})
})
