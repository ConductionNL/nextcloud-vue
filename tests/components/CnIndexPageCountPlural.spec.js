/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `countSubtitle` as `{ singular, plural }`: shillinq's invoice list read
 * "1 facturen". The form is picked by the total through the app's plural
 * translation (the real @nextcloud/l10n, with a registered app bundle), or by
 * `total === 1` without an app id.
 *
 * @spec openspec/changes/index-count-plural/specs/index-header/spec.md#requirement-the-count-line-takes-a-singular-and-a-plural-form
 */
import { mount } from '@vue/test-utils'
import { register } from '@nextcloud/l10n'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const FORMS = { singular: '{total} invoice', plural: '{total} invoices' }

function mountPage(total, extra = {}, provide = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Invoices',
			objects: Array.from({ length: Math.min(total, 3) }, (_, i) => ({ id: i + 1 })),
			pagination: { page: 1, pages: 1, total, limit: 20 },
			showTitle: true,
			countSubtitle: FORMS,
			...extra,
		},
		global: {
			provide,
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Invoices' } },
			stubs: { CnActionsBar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnIcon: true },
		},
	})
}

describe('CnIndexPage: countSubtitle with a singular and a plural', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
	})

	it('takes the singular for one and the plural otherwise', () => {
		expect(mountPage(1).vm.headerDescription).toBe('1 invoice')
		expect(mountPage(12).vm.headerDescription).toBe('12 invoices')
		expect(mountPage(0).vm.headerDescription).toBe('0 invoices')
	})

	it('keeps a string countSubtitle as before (control)', () => {
		expect(mountPage(1, { countSubtitle: '{total} invoices' }).vm.headerDescription).toBe('1 invoices')
	})

	it('reads the app\'s Dutch plural forms', () => {
		globalThis._nc_l10n_language = 'nl'
		register('shillinq-test', { '_{total} invoice_::_{total} invoices_': ['{total} factuur', '{total} facturen'] })
		expect(mountPage(1, {}, { cnAppId: 'shillinq-test' }).vm.headerDescription).toBe('1 factuur')
		expect(mountPage(12, {}, { cnAppId: 'shillinq-test' }).vm.headerDescription).toBe('12 facturen')
	})

	it('fills {shown} under the board look', () => {
		const forms = { singular: '{shown} of {total} invoice', plural: '{shown} of {total} invoices' }
		expect(mountPage(12, { countSubtitle: forms }, { cnLook: 'board' }).vm.headerDescription).toBe('3 of 12 invoices')
		expect(mountPage(1, { countSubtitle: forms }, { cnLook: 'board', cnAppId: 'shillinq-test' }).vm.headerDescription).toBe('1 of 1 invoice')
	})

	it('lets countText win under the board look', () => {
		expect(mountPage(12, { countText: '{total} open' }, { cnLook: 'board' }).vm.headerDescription).toBe('12 open')
	})
})
