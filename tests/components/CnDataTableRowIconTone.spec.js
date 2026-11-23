/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqOrganisaties: the leading icon cell carries the page's tile tone.
 *
 * @spec openspec/changes/board-row-icon-tile/specs/data-table/spec.md#requirement-a-board-tables-leading-icon-sits-on-a-tile
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

function iconCell(props) {
	return mount(CnDataTable, {
		propsData: { rows: [{ id: 'o1', tradeName: 'Buurtvereniging Oost' }], columns: ['tradeName'], rowIcon: 'Domain', ...props },
		stubs: { CnIcon: true },
	}).find('td.cn-table-col--icon')
}

describe('CnDataTable rowIconTone', () => {
	it('marks the icon cell with the tone', () => {
		expect(iconCell({ rowIconTone: 'teal' }).classes()).toContain('cn-table-col--icon-teal')
	})

	it('falls back to primary for an unknown or missing tone', () => {
		expect(iconCell({}).classes()).toContain('cn-table-col--icon-primary')
		expect(iconCell({ rowIconTone: 'purple' }).classes()).toContain('cn-table-col--icon-primary')
	})
})
