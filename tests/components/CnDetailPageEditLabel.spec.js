/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The header Edit button's manifest label goes through the host translate
 * (detail-edit-label-translate), like the other manifest labels: dossiq's
 * "Deviate with a reason" reads "Afwijken met reden" on a Dutch page.
 *
 * @spec openspec/changes/detail-edit-label-translate/specs/detail-page/spec.md#requirement-the-edit-button-label-follows-the-reader-s-language
 */
import { shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function mountPage(props = {}) {
	return shallowMount(CnDetailPage, {
		props: { title: 'Case', ...props },
		global: {
			provide: { cnTranslate: (key) => ({ 'Deviate with a reason': 'Afwijken met reden' }[key] || key) },
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

describe('CnDetailPage edit label', () => {
	it('translates a manifest editLabel through the host translate', () => {
		expect(mountPage({ editLabel: 'Deviate with a reason' }).vm.editActionLabel).toBe('Afwijken met reden')
	})

	it('keeps the library Edit without one', () => {
		expect(mountPage().vm.editActionLabel).toBe('Edit')
	})
})
