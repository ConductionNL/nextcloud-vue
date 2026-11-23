/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A menu entry may name its saved view by uuid, as an example set writes it
 * (DqFilterInMenu: Pieter's "Termijn deze week" in his menu). The panel
 * knows the view is in the menu, and the page's sync keeps the entry and
 * stores it under the view's id.
 *
 * @spec openspec/changes/saved-view-menu-by-uuid/specs/saved-view-menu-by-uuid/spec.md#requirement-a-menu-entry-may-name-its-view-by-uuid
 */
const { mount } = require('@vue/test-utils')
const { syncSavedViewMenu } = require('../../src/utils/savedViewMenu.js')
const CnSavedViewsPanel = require('../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue').default

const view = { id: 12, uuid: '551f656a-b8ba-4647-927c-25995d4d9c93', name: 'Termijn deze week', owner: 'pieter', '@self': { access: 'owner' } }

describe('saved view menu entries by uuid', () => {
	it('keeps an entry that names the view by uuid and stores it under the id', () => {
		const entries = [{ id: view.uuid, page: 'Cases', name: 'Termijn deze week' }, { id: 'gone', page: 'Cases', name: 'Gone' }]
		expect(syncSavedViewMenu(entries, 'Cases', [view])).toEqual([{ id: '12', page: 'Cases', name: 'Termijn deze week' }])
	})

	it('leaves an entry by id as it was', () => {
		const entries = [{ id: '12', page: 'Cases', name: 'Old name' }]
		expect(syncSavedViewMenu(entries, 'Cases', [view])).toEqual([{ id: '12', page: 'Cases', name: 'Termijn deze week' }])
	})

	it('marks the view in the menu in the panel when the menu names it by uuid', () => {
		const w = mount(CnSavedViewsPanel, { props: { views: [view], currentUserId: 'pieter', menuIds: [view.uuid] } })
		expect(w.get('[data-testid="cn-saved-views-menu"][data-view-id="12"]').text()).toContain('Remove from menu')
	})
})
