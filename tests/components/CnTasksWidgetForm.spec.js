/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTasksWidgetForm — the config sub-form for a `tasks` placement.
 *
 * The contract that matters: every field change re-emits the WHOLE content
 * blob (a partial emit silently drops the other keys on save), defaults are
 * always usable, and a stored scope outside the endpoint's vocabulary is
 * normalised rather than forwarded.
 */
import { mount } from '@vue/test-utils'

const CnTasksWidgetForm = require('../../src/components/CnTasksWidgetForm/CnTasksWidgetForm.vue').default

function mountForm(props = {}) {
	return mount(CnTasksWidgetForm, { propsData: props })
}

describe('CnTasksWidgetForm', () => {
	it('starts from usable defaults', () => {
		const w = mountForm()
		expect(w.vm.assembledContent).toEqual({
			scope: 'assigned',
			limit: 6,
			pollSeconds: 30,
			rowRoute: '',
			emptyText: '',
		})
		expect(w.vm.validate()).toBe(true)
	})

	it('pre-fills from the placement being edited', () => {
		const w = mountForm({
			editingWidget: { content: { scope: 'pooled', limit: 3, pollSeconds: 0, rowRoute: 'TaskDetail', emptyText: 'All clear' } },
		})
		expect(w.vm.assembledContent).toEqual({
			scope: 'pooled',
			limit: 3,
			pollSeconds: 0,
			rowRoute: 'TaskDetail',
			emptyText: 'All clear',
		})
	})

	it('normalises a stored scope outside the vocabulary', () => {
		const w = mountForm({ editingWidget: { content: { scope: 'everyone-else' } } })
		expect(w.vm.scope).toBe('assigned')
	})

	it('re-emits the whole content blob on every field change', () => {
		const w = mountForm()
		w.vm.updateField('limit', 9)
		w.vm.onScopePick({ id: 'watched' })

		const emitted = w.emitted('update:content')
		expect(emitted.length).toBe(2)
		expect(emitted[1][0]).toEqual({
			scope: 'watched',
			limit: 9,
			pollSeconds: 30,
			rowRoute: '',
			emptyText: '',
		})
	})

	it('falls back to the assigned scope when the pick is cleared', () => {
		const w = mountForm()
		w.vm.onScopePick(null)
		expect(w.emitted('update:content')[0][0].scope).toBe('assigned')
	})
})
