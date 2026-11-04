/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnShareList, widget type `share-list` (DqZaakBetrokkenen "Delen buiten de
 * organisatie"): one row per share with Copy link and Revoke; a refusal is
 * the card's notice through the page dispatcher.
 *
 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-revoking-a-share-says-a-refusal-in-the-card
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnShareList from '../../src/components/CnShareList/CnShareList.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnShareList/index.js'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => ({ cnFetchJson: (...a) => mockFetchJson(...a) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))

const SHARES = [
	{ id: 's1', kind: 'case', title: 'Zaak 2026-0110, lezen en reageren', meta: 'gemaakt door Pieter Jansen op 6 okt', status: 'active', url: 'https://cloud.example/s/7Qk2' },
	{ id: 's2', kind: 'file', title: 'Advies.pdf', status: 'revoked', url: 'https://cloud.example/s/x' },
]
const CONTENT = {
	url: '/apps/dossiq/api/cases/{objectId}/shares',
	revoke: { url: '/apps/dossiq/api/shares/{id}' },
	statusLabels: { active: 'Actief', revoked: 'Ingetrokken' },
	copyLabel: 'Link kopiëren',
	revokeLabel: 'Intrekken',
}
const BUTTON = { props: ['variant', 'disabled'], emits: ['click'], template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' }

/**
 * @param {Function} [dispatch] The page dispatcher.
 * @return {Promise<object>} The mounted list.
 */
async function mountList(dispatch = jest.fn()) {
	const w = mount(CnShareList, {
		props: { content: CONTENT, objectId: 'case 1' },
		global: { provide: { cnTranslate: (key) => key, cnDispatchAction: dispatch }, stubs: { CnIcon: { props: ['name'], template: '<i :data-name="name" />' }, NcButton: BUTTON } },
	})
	await flushPromises()
	return w
}

describe('CnShareList', () => {
	beforeEach(() => {
		mockFetchJson.mockReset()
		mockFetchJson.mockResolvedValue({ results: SHARES })
	})

	it('reads the shares of the record and draws a row per share', async () => {
		const w = await mountList()
		expect(mockFetchJson).toHaveBeenCalledWith('/index.php/apps/dossiq/api/cases/case%201/shares')
		const rows = w.findAll('[data-testid="cn-share-list-row"]')
		expect(rows).toHaveLength(2)
		expect(rows[0].text()).toContain('Zaak 2026-0110, lezen en reageren')
		expect(rows[0].find('[data-testid="cn-share-list-status"]').text()).toBe('Actief')
		expect(rows[0].find('[data-name="BriefcaseOutline"]').exists()).toBe(true)
		// A revoked share keeps Copy link but has no Revoke.
		expect(rows[1].find('[data-testid="cn-share-list-revoke"]').exists()).toBe(false)
	})

	it('copies a link and says so in a polite live region', async () => {
		const writeText = jest.fn(() => Promise.resolve())
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
		const w = await mountList()
		await w.find('[data-testid="cn-share-list-copy"]').trigger('click')
		await flushPromises()
		expect(writeText).toHaveBeenCalledWith('https://cloud.example/s/7Qk2')
		expect(w.find('[data-testid="cn-share-list-live"]').text()).toBe('Link copied')
	})

	it('revokes through the page dispatcher with noticeInline, and reads again when it lands', async () => {
		const dispatch = jest.fn(async () => ({ ok: true }))
		const w = await mountList(dispatch)
		await w.find('[data-testid="cn-share-list-revoke"]').trigger('click')
		await flushPromises()
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'api-call', url: '/apps/dossiq/api/shares/s1', method: 'DELETE', noticeInline: 'error' }))
		expect(mockFetchJson).toHaveBeenCalledTimes(2)
	})

	it('keeps the row when the revoke is refused', async () => {
		const w = await mountList(jest.fn(async () => ({ ok: false })))
		await w.find('[data-testid="cn-share-list-revoke"]').trigger('click')
		await flushPromises()
		expect(mockFetchJson).toHaveBeenCalledTimes(1)
		expect(w.findAll('[data-testid="cn-share-list-row"]')).toHaveLength(2)
	})

	it('says a failed read, and registers as the share-list widget type', async () => {
		mockFetchJson.mockRejectedValue(new Error('500'))
		const w = await mountList()
		expect(w.find('[data-testid="cn-share-list-error"]').text()).toBe('The shares could not be read.')
		expect(getWidgetTypeEntry('share-list').renderer).toBe(CnShareList)
	})
})
