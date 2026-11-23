/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

import {
	checklistProgress,
	classifyGps,
	GPS_POOR_ACCURACY_M,
	normaliseChecklistTemplate,
	syncIndicator,
	validateChecklistAnswers,
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

	describe('normaliseChecklistTemplate', () => {
		const sectioned = {
			id: 'tpl',
			version: 3,
			sections: [
				{ name: 'Fundering', items: [
					{ id: 'f1', label: 'Wapening zichtbaar?', responseType: 'yes_no_na', required: true, photoRequired: 'nooit' },
					{ id: 'f2', label: 'Foto van de bekisting', responseType: 'photo', photoRequired: 'altijd' },
				] },
				{ name: 'Dak', items: [
					{ id: 'd1', label: 'Opmerkingen', responseType: 'text' },
					{ label: 'No key, skipped', responseType: 'text' },
				] },
			],
		}
		const config = {
			sectionsField: 'sections',
			itemKeyField: 'id',
			itemTextField: 'label',
			itemTypeField: 'responseType',
			itemTypeMap: { yes_no_na: 'yes_no' },
			photoRequiredField: 'photoRequired',
			photoRequiredValue: 'altijd',
		}

		it('flattens sections into the flat item contract, keeping the template keys', () => {
			const t = normaliseChecklistTemplate(sectioned, config)

			expect(t.id).toBe('tpl')
			expect(t.version).toBe(3)
			expect(t.items.map((i) => i.questionId)).toEqual(['f1', 'f2', 'd1'])
			expect(t.items[0]).toMatchObject({ text: 'Wapening zichtbaar?', type: 'yes_no', required: true, photoRequired: false })
			expect(t.items[1]).toMatchObject({ type: 'photo', required: false, photoRequired: true })
		})

		it('leaves a flat template as it was under the default config', () => {
			const flat = { items: [{ questionId: 'q1', text: 'Q', type: 'yes_no', required: true }] }
			const t = normaliseChecklistTemplate(flat)

			expect(t.items).toEqual([{ questionId: 'q1', text: 'Q', type: 'yes_no', required: true, photoRequired: false }])
		})

		it('returns null for no template', () => {
			expect(normaliseChecklistTemplate(null, config)).toBeNull()
		})

		it('gates a photoRequired item on evidence even when it is optional', () => {
			const t = normaliseChecklistTemplate(sectioned, config)
			const answers = { f1: { answer: 'yes' }, f2: { answer: 'yes', evidenceRefs: [] } }

			const r = validateChecklistAnswers(t, answers)
			expect(r.valid).toBe(false)
			expect(r.errors.map((e) => e.questionId)).toEqual(['f2'])

			answers.f2.evidenceRefs = ['77']
			expect(validateChecklistAnswers(t, answers).valid).toBe(true)
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
		it('reports waiting work rather than a fault when offline', () => {
			const state = syncIndicator(2, false)

			expect(state.tone).toBe('warning')
			expect(state.text).toContain('2')
		})

		it('is warning when there are pending changes online', () => {
			expect(syncIndicator(3, true).tone).toBe('warning')
		})

		it('is success when synced online', () => {
			expect(syncIndicator(0, true).tone).toBe('success')
		})

		// 🔴 THE REGRESSION THIS PAIR EXISTS FOR. `pendingCount` counts pending,
		// conflict and syncing; a `failed` operation is in none of them. So a
		// device holding a stranded inspection reached the last branch and said
		// "All changes synced" in green: the one surface that could have told
		// the inspector their morning had not left the device said the opposite.
		it('does not call a device with stuck work synced', () => {
			const state = syncIndicator(0, true, 1)

			expect(state.tone).toBe('error')
			expect(state.text).toContain('1')
		})

		// Stuck outranks offline. Offline passes on its own; stuck does not.
		it('names stuck work even while offline', () => {
			expect(syncIndicator(4, false, 2).tone).toBe('error')
			expect(syncIndicator(4, false, 2).text).toContain('2')
		})
	})
})
