/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/transition-input-reference-and-subfields/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnTransitionInputDialog from '../../src/dialogs/CnTransitionInputDialog.vue'

const SCHEMA = {
	properties: {
		municipalityFeedback: {
			type: 'object',
			title: 'Municipality feedback',
			required: ['masRoute'],
			properties: {
				masRoute: { type: 'string', title: 'MAS route' },
				note: { type: 'string', title: 'Note' },
				receivedAt: { type: 'string', title: 'Received at' },
				recordedBy: { type: 'string', title: 'Recorded by' },
			},
		},
	},
}
const CURRENT = { municipalityFeedback: { receivedAt: null, recordedBy: null } }

function mountDialog(input, extra = {}) {
	return mount(CnTransitionInputDialog, {
		props: { transition: { action: 'recordMunicipalityFeedback', label: 'Record answer', inputs: [input] }, schema: SCHEMA, currentObject: CURRENT, ...extra },
	})
}
const box = (w, sub) => w.get(`[data-testid="cn-transition-input-municipalityFeedback-${sub}"]`)

describe('object inputs', () => {
	it('asks only for the named sub-fields', () => {
		const w = mountDialog({ field: 'municipalityFeedback', fields: ['masRoute', 'note'] })
		expect(w.findAll('.cn-transition-input__subfield').map((e) => e.attributes('data-testid'))).toEqual([
			'cn-transition-input-municipalityFeedback-masRoute',
			'cn-transition-input-municipalityFeedback-note',
		])
	})

	it('shows every sub-property without a fields list', () => {
		const w = mountDialog({ field: 'municipalityFeedback' })
		expect(w.findAll('.cn-transition-input__subfield')).toHaveLength(4)
	})

	it('sends one object: the current value with the typed sub-values merged over it, no dotted keys', async () => {
		const w = mountDialog({ field: 'municipalityFeedback', fields: ['masRoute', 'note'] })
		w.vm.setSubValue('municipalityFeedback', 'masRoute', 'Route B')
		w.vm.setSubValue('municipalityFeedback', 'note', 'Called on Monday')
		await w.vm.$nextTick()
		w.vm.onConfirm()
		const data = w.emitted('confirm')[0][0]
		expect(data).toEqual({ municipalityFeedback: { receivedAt: null, recordedBy: null, masRoute: 'Route B', note: 'Called on Monday' } })
		expect(Object.keys(data).some((k) => k.includes('.'))).toBe(false)
	})

	it('keeps sub-fields that were not asked for, and skips an untouched empty one', () => {
		const current = { municipalityFeedback: { receivedAt: '2026-10-01', recordedBy: 'jan' } }
		const w = mountDialog({ field: 'municipalityFeedback', fields: ['masRoute', 'note'] }, { currentObject: current })
		w.vm.setSubValue('municipalityFeedback', 'masRoute', 'A')
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0].municipalityFeedback).toEqual({ receivedAt: '2026-10-01', recordedBy: 'jan', masRoute: 'A' })
	})

	it('blocks confirm until a required sub-field is filled', async () => {
		const w = mountDialog({ field: 'municipalityFeedback', fields: ['masRoute', 'note'] })
		const confirm = () => w.get('[data-testid="cn-transition-input-confirm"]')
		expect(confirm().attributes('disabled')).toBeDefined()
		w.vm.setSubValue('municipalityFeedback', 'masRoute', 'A')
		await w.vm.$nextTick()
		expect(confirm().attributes('disabled')).toBeUndefined()
	})

	it('shows the current value of a sub-field it asks for', () => {
		const current = { municipalityFeedback: { note: 'Earlier note' } }
		const w = mountDialog({ field: 'municipalityFeedback', fields: ['note'] }, { currentObject: current })
		expect(w.vm.subValue('municipalityFeedback', 'note')).toBe('Earlier note')
	})

	it('marks a sub-field the refusal names as input.sub', () => {
		const w = mountDialog({ field: 'municipalityFeedback', fields: ['masRoute'] }, { fieldErrors: ['municipalityFeedback.masRoute'] })
		expect(w.find('[data-testid="cn-transition-input-error-municipalityFeedback.masRoute"]').exists()).toBe(true)
	})
})
