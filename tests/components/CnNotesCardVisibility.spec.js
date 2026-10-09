/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/timeline-visibility-controls/tasks.md#task-1
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnNotesCard from '../../src/components/CnNotesCard/CnNotesCard.vue'

const NOTES = [
	{ id: 'n1', message: 'Old note', actorId: 'jan', actorDisplayName: 'Jan', creationDateTime: '2026-10-01T10:00:00Z' },
	{ id: 'n2', message: 'Public note', actorId: 'jan', actorDisplayName: 'Jan', creationDateTime: '2026-10-02T10:00:00Z', visibility: 'public' },
]
const stubs = {
	CnDetailCard: { template: '<div><slot /></div>' },
	CnUserActionMenu: true,
	NcLoadingIcon: true,
	NcButton: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>' },
	NcCheckboxRadioSwitch: { props: ['modelValue', 'type'], emits: ['update:modelValue'], template: '<input type="checkbox" v-bind="$attrs" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />' },
}
const mountCard = (props = {}) => mount(CnNotesCard, { props: { registerId: 'r', schemaId: 's', objectId: 'o', ...props }, global: { stubs } })

beforeEach(() => {
	global.fetch = jest.fn(async (url, init) => {
		if (init && init.method) {
			return { ok: true, status: 200, json: async () => ({}) }
		}
		return { ok: true, status: 200, json: async () => ({ results: NOTES.map((n) => ({ ...n })) }) }
	})
})

const writes = () => fetch.mock.calls.filter((c) => c[1] && c[1].method)

describe('CnNotesCard visibility', () => {
	it('declares both props off by default and renders nothing extra', async () => {
		expect(CnNotesCard.props.canSetVisibility.default).toBe(false)
		expect(CnNotesCard.props.showVisibility.default).toBe(false)
		const w = mountCard()
		await flushPromises()
		expect(w.find('[data-testid="cn-visibility-chip"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-notes-card-visibility-toggle"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-notes-card-visibility-switch"]').exists()).toBe(false)
	})

	it('a reader sees chips (old note internal) and no toggle or choice', async () => {
		const w = mountCard({ showVisibility: true })
		await flushPromises()
		expect(w.findAll('[data-testid="cn-visibility-chip"]').map((c) => c.attributes('data-visibility')).sort()).toEqual(['internal', 'public'])
		expect(w.find('[data-testid="cn-notes-card-visibility-toggle"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-notes-card-visibility-switch"]').exists()).toBe(false)
	})

	it('writes an internal note by default and sends the visibility', async () => {
		const w = mountCard({ canSetVisibility: true })
		await flushPromises()
		w.vm.newNoteText = 'Hello'
		await w.vm.submitNote()
		expect(JSON.parse(writes()[0][1].body)).toEqual({ message: 'Hello', visibility: 'internal' })
	})

	it('writes a public note after the switch is set, then resets to internal', async () => {
		const w = mountCard({ canSetVisibility: true })
		await flushPromises()
		await w.get('[data-testid="cn-notes-card-visibility-switch"]').setValue(true)
		w.vm.newNoteText = 'Hello'
		await w.vm.submitNote()
		expect(JSON.parse(writes()[0][1].body).visibility).toBe('public')
		expect(w.vm.newNoteVisibility).toBe('internal')
	})

	it('sends no visibility when the caller may not set it', async () => {
		const w = mountCard({ showVisibility: true })
		await flushPromises()
		w.vm.newNoteText = 'Hello'
		await w.vm.submitNote()
		expect(JSON.parse(writes()[0][1].body)).toEqual({ message: 'Hello' })
	})

	it('toggles a note through the same write path and updates its chip', async () => {
		const w = mountCard({ canSetVisibility: true })
		await flushPromises()
		const toggles = w.findAll('[data-testid="cn-notes-card-visibility-toggle"]')
		expect(toggles.map((b) => b.text()).sort()).toEqual(['Make internal', 'Make public'])
		await w.vm.toggleVisibility(NOTES[0])
		const [url, init] = writes()[0]
		expect(url).toContain('/notes/n1')
		expect(init.method).toBe('PATCH')
		expect(JSON.parse(init.body)).toEqual({ visibility: 'public' })
		expect(w.vm.allNotes.find((n) => n.id === 'n1').visibility).toBe('public')
		expect(w.emitted('visibility-changed')[0][0]).toEqual({ id: 'n1', visibility: 'public' })
	})

	it('infers nothing from the current user: no prop, no toggle', async () => {
		global.OC = { currentUser: 'jan' }
		const w = mountCard({ showVisibility: true })
		await flushPromises()
		expect(w.find('[data-testid="cn-notes-card-visibility-toggle"]').exists()).toBe(false)
		delete global.OC
	})
})
