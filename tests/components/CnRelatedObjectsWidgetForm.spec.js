/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnRelatedObjectsWidgetForm — the `related` widget's config sub-form.
 * Edits the title and a whitelist of relation groups to display; emits
 * update:content with { title, groups }. Always valid (no required fields).
 */
import { shallowMount } from '@vue/test-utils'
import CnRelatedObjectsWidgetForm from '../../src/components/CnRelatedObjectsWidgetForm/CnRelatedObjectsWidgetForm.vue'

const mount = (content) => shallowMount(CnRelatedObjectsWidgetForm, {
	propsData: { editingWidget: { content } },
})

describe('CnRelatedObjectsWidgetForm', () => {
	it('seeds title + groups from the edited widget content', () => {
		const w = mount({ title: 'Links', groups: ['objects', 'files'] })
		expect(w.vm.title).toBe('Links')
		expect(w.vm.groups).toEqual(['objects', 'files'])
		// selected options reflect the seeded keys
		expect(w.vm.selectedOptions.map((o) => o.id)).toEqual(['objects', 'files'])
	})

	it('maps selected options back to group keys and emits content', () => {
		const w = mount({ title: '', groups: [] })
		w.vm.onGroupsInput([{ id: 'mails', label: 'Mails' }, { id: 'events', label: 'Events' }])
		expect(w.vm.groups).toEqual(['mails', 'events'])
		expect(w.emitted('update:content').slice(-1)[0][0]).toEqual({ title: '', groups: ['mails', 'events'] })
	})

	it('offers the full relation-group catalog', () => {
		const w = mount({})
		const ids = w.vm.groupOptions.map((o) => o.id)
		expect(ids).toEqual(expect.arrayContaining(['objects', 'files', 'mails', 'deck', 'tasks']))
	})

	it('is always valid (the widget inherits its object from the page)', () => {
		expect(mount({}).vm.validate()).toEqual([])
	})
})
