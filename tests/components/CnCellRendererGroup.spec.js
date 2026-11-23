import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/nextcloud-group-surfaces/specs/data-display/spec.md#requirement-a-group-cell-shows-the-groups-display-name
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnCellRenderer from '../../src/components/CnCellRenderer/CnCellRenderer.vue'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'
import { clearGroupNameCache } from '../../src/utils/groupAutocomplete.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const NAMES = { toezicht: 'Toezicht en handhaving', behandelaars: 'Behandelaars' }

const groupProperty = { type: 'string', referenceType: 'nextcloud-group' }

describe('CnCellRenderer group cell', () => {
	beforeEach(() => {
		clearGroupNameCache()
		axios.get.mockReset()
		// The core autocomplete endpoint: a known group comes back with its
		// display name, an unknown one with nothing (then cloud/groups, empty).
		axios.get.mockImplementation(async (url, config) => {
			const gid = config && config.params && config.params.search
			const data = NAMES[gid] ? [{ id: gid, label: NAMES[gid], source: 'groups' }] : []
			return { data: { ocs: { data } } }
		})
	})

	it('shows the id first, then the display name', async () => {
		const w = mount(CnCellRenderer, { props: { value: 'toezicht', property: groupProperty } })
		expect(w.text()).toBe('toezicht')
		await flushPromises()
		expect(w.text()).toBe('Toezicht en handhaving')
	})

	it('works for format nc-group, an explicit widget and a list of groups', async () => {
		const a = mount(CnCellRenderer, { props: { value: 'behandelaars', property: { type: 'string', format: 'nc-group' } } })
		const b = mount(CnCellRenderer, { props: { value: 'toezicht', widget: 'group' } })
		const c = mount(CnCellRenderer, { props: { value: ['toezicht', 'behandelaars'], property: { type: 'array', items: groupProperty } } })
		await flushPromises()
		expect(a.text()).toBe('Behandelaars')
		expect(b.text()).toBe('Toezicht en handhaving')
		expect(c.text()).toBe('Toezicht en handhaving, Behandelaars')
	})

	it('shows the id of a group it cannot find, and a dash for no group', async () => {
		const w = mount(CnCellRenderer, { props: { value: 'ghost', property: groupProperty } })
		const empty = mount(CnCellRenderer, { props: { value: '', property: groupProperty } })
		await flushPromises()
		expect(w.text()).toBe('ghost')
		expect(empty.text()).toBe('—')
	})

	it('a column formatter still wins', async () => {
		const w = mount(CnCellRenderer, {
			props: { value: 'toezicht', property: groupProperty, formatter: 'upper' },
			global: { provide: { cnFormatters: { upper: (v) => String(v).toUpperCase() } } },
		})
		await flushPromises()
		expect(w.text()).toBe('TOEZICHT')
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('a Team column in CnDataTable shows names and asks once per group', async () => {
		const w = mount(CnDataTable, {
			props: {
				schema: { properties: { title: { type: 'string' }, assignedGroup: groupProperty } },
				columns: [{ key: 'title', label: 'Title' }, { key: 'assignedGroup', label: 'Team' }],
				rows: [
					{ id: '1', title: 'A', assignedGroup: 'toezicht' },
					{ id: '2', title: 'B', assignedGroup: 'toezicht' },
					{ id: '3', title: 'C', assignedGroup: 'behandelaars' },
				],
			},
		})
		await flushPromises()
		const cells = w.findAll('.cn-group-name-cell').map((c) => c.text())
		expect(cells).toEqual(['Toezicht en handhaving', 'Toezicht en handhaving', 'Behandelaars'])
		expect(axios.get).toHaveBeenCalledTimes(2)
	})
})
