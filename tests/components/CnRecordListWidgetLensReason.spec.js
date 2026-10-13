/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list explains an unavailable personal lens in its empty line
 * (screens-record-list-lens-reason).
 *
 * @spec openspec/changes/screens-record-list-lens-reason/specs/record-list-lens-reason/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

async function mountList(data, content = {}, translate) {
	axios.get.mockResolvedValue({ data })
	const wrapper = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'case', title: '{title}', filter: { _recent: true }, emptyText: 'No cases', ...content } },
		global: { provide: translate ? { cnTranslate: translate } : {}, stubs: { NcLoadingIcon: true } },
	})
	await flushPromises()
	await flushPromises()
	return wrapper
}

const empty = (wrapper) => wrapper.find('[data-testid="cn-record-list-empty"]').text()
const unavailable = { results: [], total: 0, '@self': { lenses: { recent: { available: false, reason: 'audit-trail-disabled' } } } }

describe('CnRecordListWidget lens reason', () => {
	beforeEach(() => axios.get.mockReset())

	it('asks for the lens and explains why it is empty', async () => {
		const wrapper = await mountList(unavailable)
		expect(axios.get.mock.calls[0][1].params._recent).toBe(true)
		expect(empty(wrapper)).toBe('This server does not keep track of what you open.')
	})

	it('takes the app wording, lens.reason before reason, through translate', async () => {
		const texts = { 'recent.audit-trail-disabled': 'Recent cases need the audit trail.', 'audit-trail-disabled': 'No audit trail.' }
		expect(empty(await mountList(unavailable, { lensReasonTexts: texts }))).toBe('Recent cases need the audit trail.')
		const translate = (key) => (key === 'No audit trail.' ? 'Geen audit trail.' : key)
		expect(empty(await mountList(unavailable, { lensReasonTexts: { 'audit-trail-disabled': 'No audit trail.' } }, translate))).toBe('Geen audit trail.')
	})

	it('keeps emptyText without a report, for an available lens and for a reason without text', async () => {
		expect(empty(await mountList({ results: [], total: 0 }))).toBe('No cases')
		expect(empty(await mountList({ results: [], total: 0, '@self': { lenses: { recent: { available: true, reason: null } } } }))).toBe('No cases')
		expect(empty(await mountList({ results: [], total: 0, '@self': { lenses: { recent: { available: false, reason: 'something-new' } } } }))).toBe('No cases')
	})

	it('shows the rows when there are rows', async () => {
		const wrapper = await mountList({ ...unavailable, results: [{ id: 'a', title: 'A' }], total: 1 })
		expect(wrapper.find('[data-testid="cn-record-list-empty"]').exists()).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-record-list-item"]')).toHaveLength(1)
	})
})
