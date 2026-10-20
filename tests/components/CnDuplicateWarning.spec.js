/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDuplicateWarning: "this may already exist", from OpenRegister's scored
 * matches (dossiq's DuplicateWarningModal at case intake; pipelinq contacts).
 *
 * @spec openspec/changes/duplicate-warning/specs/duplicate-warning/spec.md#requirement-a-generic-duplicate-warning
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnDuplicateWarning from '../../src/components/CnDuplicateWarning/CnDuplicateWarning.vue'
import { candidateWithoutBlanks, duplicateAffordances } from '../../src/utils/duplicateWarning.js'
import { openDuplicateWarning } from '../../src/utils/openDuplicateWarning.js'

jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

const MATCHES = [
	{ uuid: 'c-1', score: 0.914, matchedOn: ['requester', 'title'] },
	{ uuid: 'c-2', score: 0.8, matchedOn: [] },
]
const RECORDS = [{ id: 'c-1', title: 'Verlichting fietspad Lindelaan', identifier: '2026-0082' }]

const STUBS = {
	CnDialog: { name: 'CnDialog', props: ['name'], template: '<div class="dialog" :data-name="name"><slot /><slot name="actions" /></div>' },
	NcTextField: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' },
	NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
}

/**
 * Mount the warning.
 *
 * @param {object} props Props.
 * @return {import('@vue/test-utils').VueWrapper} The warning.
 */
function mountWarning(props = {}) {
	return mount(CnDuplicateWarning, {
		props: { matches: MATCHES, records: RECORDS, recordUrl: '/apps/dossiq/cases/{uuid}', fieldLabels: { requester: 'Requester', title: 'Subject' }, ...props },
		global: { stubs: STUBS, provide: { cnTranslate: (k) => ({ Requester: 'Aanvrager', Subject: 'Onderwerp' })[k] ?? k } },
	})
}

const continueButton = (w) => w.find('[data-testid="cn-duplicate-warning-continue"]')

describe('CnDuplicateWarning', () => {
	it('lists each match with its title, meta, fields and score, hiding one the user may not read', () => {
		const w = mountWarning()
		const rows = w.findAll('[data-testid="cn-duplicate-warning-match"]')
		expect(rows[0].find('a').attributes('href')).toBe('/nc/apps/dossiq/cases/c-1')
		expect(rows[0].text()).toContain('Verlichting fietspad Lindelaan')
		expect(rows[0].text()).toContain('2026-0082')
		expect(rows[0].text()).toContain('Aanvrager, Onderwerp (91%)')
		expect(rows[1].find('a').exists()).toBe(false)
		expect(rows[1].text()).toContain('A record you may not open')
		expect(rows[1].text()).toContain('Matched on the score, not on a single field (80%)')
		expect(w.find('.note').attributes('data-type')).toBe('warning')
	})

	it('under warn files it anyway with what it was filed over', async () => {
		const w = mountWarning()
		await continueButton(w).trigger('click')
		expect(w.emitted('file')).toEqual([[{ reason: '', over: ['c-1', 'c-2'] }]])
	})

	it('under block offers no way through, unless the user may override and says why', async () => {
		const blocked = mountWarning({ policy: 'block' })
		expect(blocked.find('.note').attributes('data-type')).toBe('error')
		expect(continueButton(blocked).exists()).toBe(false)
		expect(blocked.find('[data-testid="cn-duplicate-warning-blocked"]').exists()).toBe(true)

		const coordinator = mountWarning({ policy: 'block', mayOverride: true })
		expect(continueButton(coordinator).attributes('disabled')).toBeDefined()
		await coordinator.find('input').setValue('Second request, different plot')
		await continueButton(coordinator).trigger('click')
		expect(coordinator.emitted('file')[0][0].reason).toBe('Second request, different plot')
	})

	it('takes its own headline and goes back on cancel', async () => {
		const w = mountWarning({ headline: '{count} open cases look like this one.' })
		expect(w.find('.note').text()).toBe('2 open cases look like this one.')
		await w.find('[data-testid="cn-duplicate-warning-cancel"]').trigger('click')
		expect(w.emitted('close')).toHaveLength(1)
	})

	it('decides the affordances and leaves blanks out of the candidate', () => {
		expect(duplicateAffordances({ matches: [] })).toEqual({ show: false, blocked: false, mayContinue: false, needsReason: false })
		expect(duplicateAffordances({ matches: MATCHES, checked: false }).show).toBe(false)
		expect(duplicateAffordances({ matches: MATCHES, policy: 'blok' })).toEqual({ show: true, blocked: false, mayContinue: true, needsReason: false })
		expect(candidateWithoutBlanks({ title: 'x', ref: '', tags: [], none: null, n: 0 })).toEqual({ title: 'x', n: 0 })
	})

	it('opens from code and resolves with the decision or null', async () => {
		const decided = openDuplicateWarning({ matches: MATCHES, records: RECORDS })
		await flushPromises()
		document.querySelector('[data-testid="cn-duplicate-warning-continue"]').click()
		await expect(decided).resolves.toEqual({ reason: '', over: ['c-1', 'c-2'] })

		const cancelled = openDuplicateWarning({ matches: MATCHES })
		await flushPromises()
		document.querySelector('[data-testid="cn-duplicate-warning-cancel"]').click()
		await expect(cancelled).resolves.toBeNull()
		expect(document.querySelector('[data-testid="cn-duplicate-warning"]')).toBeNull()
	})
})
