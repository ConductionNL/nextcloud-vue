/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `footnote` draws a muted line under the table, through the host translate,
 * as DqTermijnen draws "Een ingebrekestelling telt pas als de beslistermijn
 * voorbij is (Awb 4:17). ..." under Ingebrekestellingen. A refused or failed
 * read shows no table, and no footnote either.
 *
 * @spec openspec/changes/object-table-footnote/specs/object-table-footnote/spec.md#requirement-an-object-table-can-carry-a-footnote
 */

import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnWidgetObjectTable from '../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'
import { invalidateEndpointSourceCache } from '../../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(() => ({ objectTypeRegistry: {}, errors: {} })),
}))

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const endpointSource = { url: '/apps/app/api/notices', responsePath: 'rows' }
const NOTE = 'A notice of default counts once the term has passed (Awb 4:17).'

describe('CnWidgetObjectTable footnote', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('draws the footnote under the table, through the host translate', async () => {
		axios.get.mockResolvedValue({ data: { rows: [{ id: 'a', name: 'A' }] } })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: { endpointSource, columns: ['name'], footnote: NOTE },
			global: { provide: { cnTranslate: (key) => `nl:${key}` } },
			provide: { cnTranslate: (key) => `nl:${key}` },
		})
		await flush()
		const note = wrapper.find('[data-testid="cn-widget-object-table-footnote"]')
		expect(note.exists()).toBe(true)
		expect(note.text()).toBe(`nl:${NOTE}`)
	})

	it('draws none when the read failed', async () => {
		axios.get.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 500, data: { message: 'failed' } } }))
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { endpointSource, columns: ['name'], footnote: NOTE } })
		await flush()
		expect(wrapper.find('[data-testid="cn-widget-object-table-footnote"]').exists()).toBe(false)
	})

	it('draws none without one', async () => {
		axios.get.mockResolvedValue({ data: { rows: [] } })
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { endpointSource, columns: ['name'] } })
		await flush()
		expect(wrapper.find('[data-testid="cn-widget-object-table-footnote"]').exists()).toBe(false)
	})

	it('sets it 12px under the table in 13px muted text, as the board does', () => {
		const sfc = fs.readFileSync(path.join(__dirname, '../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'), 'utf8')
		const at = sfc.indexOf('.cn-widget-object-table__footnote {')
		const body = sfc.slice(at, sfc.indexOf('}', at))
		expect(at).toBeGreaterThan(-1)
		expect(body).toContain('margin: 12px 0 0')
		expect(body).toContain('font-size: 13px')
		expect(body).toContain('color: var(--color-text-maxcontrast)')
	})
})
