/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnMenuItemEditor — the menu widget form's recursive item row.
 * Covers the icon field, which was migrated from a free-text input (letting
 * editors type values CnMenuItemIcon can't resolve, e.g. Nextcloud `icon-*`
 * CSS classes) to CnIconBrowser's default trigger — the same picker every
 * other widget form uses for its icon field.
 */
import { mount } from '@vue/test-utils'
import CnMenuItemEditor from '../../src/components/CnMenuItemEditor/CnMenuItemEditor.vue'

function mountEditor(item, depth = 1, showIcons = true) {
	return mount(CnMenuItemEditor, {
		propsData: { item, depth, path: [0], showIcons },
	})
}

describe('CnMenuItemEditor — icon field', () => {
	it('emits the picker value directly (not an option object) on the icon field', () => {
		const wrapper = mountEditor({ label: 'Docs', url: '/docs', icon: '', children: [] })
		wrapper.vm.emitFieldChange('icon', 'Star')
		const events = wrapper.emitted('update-item')
		const payload = events[events.length - 1][0]
		expect(payload.path).toEqual([0])
		expect(payload.item.icon).toBe('Star')
		// Untouched fields carry over unchanged.
		expect(payload.item.label).toBe('Docs')
	})

	it('clears the icon when the picker emits an empty value', () => {
		const wrapper = mountEditor({ label: 'Docs', url: '/docs', icon: 'Star', children: [] })
		wrapper.vm.emitFieldChange('icon', '')
		const events = wrapper.emitted('update-item')
		const payload = events[events.length - 1][0]
		expect(payload.item.icon).toBe('')
	})

	it('shows the picker\'s default "Icon" text placeholder until an icon is picked', () => {
		const empty = mountEditor({ label: 'Docs', icon: '', children: [] })
		expect(empty.find('.cn-icon-browser__trigger-placeholder').exists()).toBe(true)
		const picked = mountEditor({ label: 'Docs', icon: 'M1 2 3', children: [] })
		expect(picked.find('.cn-icon-browser__trigger-placeholder').exists()).toBe(false)
	})

	it('no longer renders a free-text icon input', () => {
		const wrapper = mountEditor({ label: 'Docs', icon: '', children: [] })
		expect(wrapper.find('.cn-menu-item-editor__input--icon').exists()).toBe(false)
	})

	it('shows the icon picker by default (showIcons defaults to true)', () => {
		const wrapper = mountEditor({ label: 'Docs', icon: '', children: [] })
		expect(wrapper.find('.cn-icon-browser').exists()).toBe(true)
	})

	it('hides the icon picker when showIcons is false', () => {
		const wrapper = mountEditor({ label: 'Docs', icon: '', children: [] }, 1, false)
		expect(wrapper.find('.cn-icon-browser').exists()).toBe(false)
	})

	it('forwards showIcons to nested child rows', () => {
		const item = {
			label: 'Parent',
			icon: '',
			children: [{ label: 'Child', icon: '', children: [] }],
		}
		const hidden = mountEditor(item, 1, false)
		expect(hidden.findAll('.cn-icon-browser').length).toBe(0)

		const shown = mountEditor(item, 1, true)
		expect(shown.findAll('.cn-icon-browser').length).toBe(2)
	})
})
