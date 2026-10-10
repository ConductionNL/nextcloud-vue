/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a finished offline checklist run turns into in the queue.
 */

import { DEFAULT_FIELD_INSPECTION_CONFIG } from '../../../src/integrations/builtin/field-inspection.js'
import { buildChecklistSubmission, fillEndpoint } from '../../../src/integrations/offline/checklistSubmission.js'

const template = {
	id: 'tpl-1',
	items: [
		{ questionId: 'a', type: 'yes_no' },
		{ questionId: 'b', type: 'text' },
		{ questionId: 'c', type: 'text' },
	],
}
const plannedItem = { id: 'plan-1', caseRef: 'case-9' }
const answers = {
	a: { answer: 'no', evidenceRefs: ['42'] },
	b: { answer: 'cracked', evidenceRefs: [] },
	c: { answer: '', evidenceRefs: [] },
}

describe('fillEndpoint', () => {
	it('fills placeholders from the planned item and encodes them', () => {
		expect(fillEndpoint('/apps/x/api/cases/{caseRef}/run', { caseRef: 'a/b' })).toBe('/apps/x/api/cases/a%2Fb/run')
	})

	it('reads a dotted path', () => {
		expect(fillEndpoint('/c/{subject.id}', { subject: { id: 's1' } })).toBe('/c/s1')
	})

	it('refuses a placeholder the item does not fill', () => {
		expect(() => fillEndpoint('/apps/x/api/cases/{caseRef}/run', { id: 'p' })).toThrow('caseRef')
	})
})

describe('buildChecklistSubmission', () => {
	it('keeps the object create on resultSchema when no endpoint is configured', () => {
		const op = buildChecklistSubmission(DEFAULT_FIELD_INSPECTION_CONFIG, {
			plannedItem,
			template,
			answers,
			gps: null,
			capturedAt: '2026-10-10T10:00:00Z',
		})

		expect(op.operationType).toBe('create')
		expect(op.schema).toBe('checklistResult')
		expect(op.endpoint).toBeNull()
		expect(op.payload.inspectionRef).toBe('plan-1')
		expect(op.payload.checklistTemplateRef).toBe('tpl-1')
		expect(op.payload.items).toHaveLength(3)
		expect(op.payload.items[0]).toEqual({
			questionId: 'a',
			answer: 'no',
			evidenceRefs: ['42'],
			answeredAt: '2026-10-10T10:00:00Z',
			gpsAtAnswer: { source: 'sensorless' },
		})
	})

	it('builds one submit to the configured endpoint, under the configured keys', () => {
		const config = {
			...DEFAULT_FIELD_INSPECTION_CONFIG,
			resultEndpoint: '/apps/myapp/api/cases/{caseRef}/checklist-run',
			resultTemplateParam: 'checklistId',
			resultPlannedItemParam: 'inspection',
		}
		const gps = { lat: 52.1, lon: 4.3, accuracy: 6 }
		const op = buildChecklistSubmission(config, {
			plannedItem,
			template,
			answers,
			gps,
			gpsSource: 'sensor',
			capturedAt: '2026-10-10T10:00:00Z',
			capturedOffline: true,
		})

		expect(op.operationType).toBe('submit')
		expect(op.endpoint).toBe('/apps/myapp/api/cases/case-9/checklist-run')
		expect(op.payload.checklistId).toBe('tpl-1')
		expect(op.payload.inspection).toBe('plan-1')
		expect(op.payload.capturedOffline).toBe(true)
		expect(op.payload.capturedAt).toBe('2026-10-10T10:00:00Z')
		expect(op.payload.location).toEqual({ lat: 52.1, lon: 4.3, accuracy: 6, source: 'sensor' })
		// An item left open is not sent as an empty answer.
		expect(op.payload.items.map((i) => i.itemId)).toEqual(['a', 'b'])
		expect(op.payload.items[0]).toMatchObject({ itemId: 'a', value: 'no', photos: ['42'] })
	})

	it('names the template and planned item under generic keys by default', () => {
		const op = buildChecklistSubmission({ resultEndpoint: '/apps/x/{id}' }, { plannedItem, template, answers })

		expect(op.payload.templateId).toBe('tpl-1')
		expect(op.payload.plannedItem).toBe('plan-1')
		expect(op.payload.capturedOffline).toBe(false)
		expect(op.payload.location).toBeUndefined()
	})

	it('refuses to queue a run whose endpoint cannot be filled', () => {
		expect(() => buildChecklistSubmission({ resultEndpoint: '/apps/x/{caseRef}' }, {
			plannedItem: { id: 'p' },
			template,
			answers,
		})).toThrow()
	})
})
