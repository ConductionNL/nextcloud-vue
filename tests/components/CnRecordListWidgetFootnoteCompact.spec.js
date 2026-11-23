/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget `footnoteCompact`: the toned footnote box without its
 * icon, in small text (DqZaakTaken "Wat hierna komt").
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

async function footnoteOf(extra) {
	const wrapper = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 's', title: '{label}', footnote: 'Een mijlpaal', footnoteVariant: 'info', ...extra } },
		global: { stubs: { NcLoadingIcon: true } },
	})
	await flushPromises()
	return wrapper.find('[data-testid="cn-record-list-footnote"]')
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: [{ id: 'a', label: 'Hoorzitting' }], total: 1 } })
})

describe('CnRecordListWidget footnoteCompact', () => {
	it('keeps the icon on a toned footnote by default', async () => {
		const note = await footnoteOf({})
		expect(note.classes()).not.toContain('cn-record-list__notice--compact')
		expect(note.find('.cn-record-list__notice-icon').exists()).toBe(true)
	})

	it('drops the icon and marks the box compact', async () => {
		const note = await footnoteOf({ footnoteCompact: true })
		expect(note.classes()).toContain('cn-record-list__notice--compact')
		expect(note.find('.cn-record-list__notice-icon').exists()).toBe(false)
		expect(note.text()).toBe('Een mijlpaal')
	})
})
