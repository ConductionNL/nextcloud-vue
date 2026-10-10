/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Under the board look the `add` header button carries a plus ("+ Nieuw
 * verzoek" on PqTickets) unless the manifest names an icon; the Nextcloud look
 * keeps the declared icon only.
 *
 * @spec openspec/changes/screens-index-header-buttons-parity/specs/index-list-board-look/spec.md#requirement-the-add-header-button-carries-a-plus
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

function mountPage(headerButtons, look = 'board') {
	return mount(CnIndexPage, {
		props: {
			title: 'Tickets',
			schema: { title: 'Ticket', properties: {} },
			objects: [],
			showTitle: true,
			headerButtons,
		},
		global: {
			provide: { cnLook: look },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Tickets' } },
			stubs: {
				CnActionsBar: true,
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
			},
		},
	})
}

function iconOf(w, action) {
	return w.vm.resolvedHeaderButtons.find((b) => b.action === action).icon
}

describe('CnIndexPage board header: the add button', () => {
	it('takes the plus under the board look', () => {
		const w = mountPage([{ action: 'add', variant: 'primary', label: 'New request' }])
		expect(iconOf(w, 'add')).toBe('Plus')
	})

	it('keeps an icon the manifest names', () => {
		const w = mountPage([{ action: 'add', variant: 'primary', label: 'New request', icon: 'FileDocumentPlus' }])
		expect(iconOf(w, 'add')).toBe('FileDocumentPlus')
	})

	it('adds no icon to other buttons', () => {
		const w = mountPage([{ action: 'refresh', label: 'Refresh' }])
		expect(iconOf(w, 'refresh')).toBe('')
	})

	it('adds no icon under the Nextcloud look', () => {
		const w = mountPage([{ action: 'add', variant: 'primary', label: 'New request' }], 'nextcloud')
		expect(iconOf(w, 'add')).toBe('')
	})
})
