/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board count line ("14 of 14") and the table footer's count are the
 * library's own strings, so they read "14 van 14" in Dutch.
 *
 * @spec openspec/changes/screens-table-footer-and-system-dates-parity/specs/index-list-board-look/spec.md#requirement-the-count-reads-in-the-users-language
 */
import { translate } from '@nextcloud/l10n'
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import en from '../../l10n/en.json'
import nl from '../../l10n/nl.json'

jest.mock('@nextcloud/l10n', () => ({
	...jest.requireActual('@nextcloud/l10n'),
	translate: jest.fn((app, text, vars) => `[${app}] ${Object.entries(vars || {}).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), text)}`),
}))

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		props: {
			title: 'Tickets',
			schema: { title: 'Ticket', properties: {} },
			objects: [{ id: 1 }, { id: 2 }],
			pagination: { page: 1, pages: 1, total: 14, limit: 20 },
			showTitle: true,
			...extra,
		},
		global: {
			provide: { cnLook: 'board' },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Tickets' } },
			stubs: { CnActionsBar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
		},
	})
}

describe('the count reads in the user language', () => {
	it('sends the default board count line through the library translations', () => {
		expect(mountPage().vm.headerDescription).toBe('[nextcloud-vue] 2 of 14')
		expect(translate).toHaveBeenCalledWith('nextcloud-vue', '{shown} of {total}', { shown: 2, total: 14 })
	})

	it('keeps a page\'s own countText as written', () => {
		expect(mountPage({ countText: '{shown} of {total} open tickets' }).vm.headerDescription).toBe('2 of 14 open tickets')
	})

	it('has the count strings in the Dutch catalogue', () => {
		expect(en.translations['{shown} of {total}']).toBe('{shown} of {total}')
		expect(nl.translations['{shown} of {total}']).toBe('{shown} van {total}')
		expect(nl.translations['{from}–{to} of {total}']).toBe('{from}–{to} van {total}')
	})
})
