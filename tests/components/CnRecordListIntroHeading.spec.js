/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqDashboard's signal tiles draw "Te laat" and "Risico" as group headings,
 * one section each; a section with no rows that says nothing drops its
 * heading too.
 *
 * @spec openspec/changes/record-list-section-intro-heading/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

/** @return {Promise<void>} */
async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const section = (url, intro, extra = {}) => ({ endpointSource: { url }, intro, introAsHeading: true, emptyText: '', title: '{title}', ...extra })

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('late') ? [{ id: 1, title: 'Zaak A' }] : [] }))
})

describe('CnRecordListWidget section intro as heading', () => {
	it('draws the intro as a group heading and drops it with an empty silent section', async () => {
		const w = mount(CnRecordListWidget, { props: { content: { sections: [section('/late', 'Te laat'), section('/risk', 'Risico')] } } })
		await flush()
		const headings = w.findAll('h3[data-testid="cn-record-list-intro"]')
		expect(headings.map((h) => h.text())).toEqual(['Te laat'])
		expect(headings[0].classes()).toContain('cn-record-list__group-heading')
	})

	it('keeps the heading over an empty section that says something', async () => {
		const w = mount(CnRecordListWidget, { props: { content: section('/risk', 'Risico', { emptyText: 'Niets' }) } })
		await flush()
		expect(w.find('h3[data-testid="cn-record-list-intro"]').text()).toBe('Risico')
	})

	it('keeps the plain intro line without introAsHeading (control)', async () => {
		const w = mount(CnRecordListWidget, { props: { content: { ...section('/risk', 'Risico'), introAsHeading: false } } })
		await flush()
		expect(w.find('p[data-testid="cn-record-list-intro"]').text()).toBe('Risico')
	})
})
