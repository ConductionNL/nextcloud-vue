/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `countSubtitle` (manifest `config.countSubtitle`) puts the collection's
 * total in the header's description: "{total} open cases" reads "48 open
 * cases". Without it the plain description shows, as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-an-index-page-title-is-a-manifest-key
 */
const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const baseProps = {
	title: 'All cases',
	schema: { title: 'Case', properties: { title: { type: 'string' } } },
	objects: [],
	loading: false,
	showTitle: true,
	pagination: { page: 1, pages: 6, limit: 8, total: 48 },
}

const stubs = {
	CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true,
	CnIndexSidebar: true, CnMassDeleteDialog: true, CnMassCopyDialog: true, CnMassExportDialog: true,
	CnMassImportDialog: true, CnDeleteDialog: true, CnCopyDialog: true, CnFormDialog: true,
	CnAdvancedFormDialog: true, NcLoadingIcon: true, NcEmptyContent: true,
}

function mountIndex(extraProps = {}) {
	return mount(CnIndexPage, {
		props: { ...baseProps, ...extraProps },
		global: {
			stubs,
			provide: { cnTranslate: (key) => (key === '{total} open cases' ? '{total} lopende zaken' : key) },
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
		},
	})
}

describe('CnIndexPage — countSubtitle', () => {
	it('shows the plain description without a countSubtitle', () => {
		const wrapper = mountIndex({ description: 'Every case in your teams' })
		expect(wrapper.find('.cn-page-header').text()).toContain('Every case in your teams')
	})

	it('fills {total} with the pagination total, through the host translate', () => {
		const wrapper = mountIndex({ description: 'Every case in your teams', countSubtitle: '{total} open cases' })
		const text = wrapper.find('.cn-page-header').text()
		expect(text).toContain('48 lopende zaken')
		expect(text).not.toContain('Every case in your teams')
	})

	it('falls back to the description while no total is known', () => {
		const wrapper = mountIndex({ description: 'Every case in your teams', countSubtitle: '{total} open cases', pagination: null })
		expect(wrapper.find('.cn-page-header').text()).toContain('Every case in your teams')
	})
})
