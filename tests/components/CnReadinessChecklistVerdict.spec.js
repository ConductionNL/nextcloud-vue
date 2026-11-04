/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A readiness list gives a count, a verdict and a confirm that waits until
 * every item is met (board DqZaakDocumenten "Volledigheid van de aanvraag").
 *
 * @spec openspec/changes/readiness-verdict/specs/readiness-verdict/spec.md
 */
import { mount } from '@vue/test-utils'
import CnReadinessChecklist from '../../src/components/CnReadinessChecklist/CnReadinessChecklist.vue'

const OPEN = [
	{ id: 'a', label: 'Request', met: true },
	{ id: 'b', label: 'Contact', met: true },
	{ id: 'c', label: 'Period', met: false },
	{ id: 'd', label: 'Mandate', met: null },
]

const VERDICT = { met: 'Complete', unmet: 'Not yet complete' }

function mountList(props) {
	return mount(CnReadinessChecklist, {
		props: { summary: '{met} of {total} present, {open} missing', verdict: VERDICT, confirmLabel: 'Confirm', ...props },
		global: {
			stubs: {
				NcButton: { name: 'NcButton', props: ['disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
			},
		},
	})
}

describe('CnReadinessChecklist verdict', () => {
	it('counts an unknown item as open and reads the unmet verdict', () => {
		const w = mountList({ items: OPEN })
		expect(w.find('[data-testid="cn-readiness-checklist-summary"]').text()).toBe('2 of 4 present, 2 missing')
		const verdict = w.find('[data-testid="cn-readiness-checklist-verdict"]')
		expect(verdict.text()).toBe('Not yet complete')
		expect(verdict.attributes('role')).toBe('status')
	})

	it('holds the confirm until every item is met, then emits it', async () => {
		const w = mountList({ items: OPEN })
		const confirm = w.find('[data-testid="cn-readiness-checklist-confirm"]')
		expect(confirm.attributes('disabled')).toBeDefined()
		await w.setProps({ items: OPEN.map((item) => ({ ...item, met: true })) })
		expect(w.find('[data-testid="cn-readiness-checklist-verdict"]').text()).toBe('Complete')
		expect(confirm.attributes('disabled')).toBeUndefined()
		await confirm.trigger('click')
		expect(w.emitted('confirm')).toHaveLength(1)
	})

	it('does not read an empty list as complete', () => {
		const w = mountList({ items: [] })
		expect(w.find('[data-testid="cn-readiness-checklist-verdict"]').text()).toBe('Not yet complete')
		expect(w.find('[data-testid="cn-readiness-checklist-confirm"]').attributes('disabled')).toBeDefined()
	})

	it('draws the note and the actions slot', () => {
		const w = mount(CnReadinessChecklist, {
			props: { items: OPEN, note: 'The clock stops meanwhile.' },
			slots: { actions: '<button class="more">Ask</button>' },
		})
		expect(w.find('[data-testid="cn-readiness-checklist-note"]').text()).toBe('The clock stops meanwhile.')
		expect(w.find('.more').exists()).toBe(true)
		expect(w.find('[data-testid="cn-readiness-checklist-confirm"]').exists()).toBe(false)
	})

	it('draws none of it without the props', () => {
		const w = mount(CnReadinessChecklist, { props: { items: OPEN } })
		expect(w.find('[data-testid="cn-readiness-checklist-head"]').exists()).toBe(false)
		expect(w.find('.cn-readiness-checklist__actions').exists()).toBe(false)
	})
})
