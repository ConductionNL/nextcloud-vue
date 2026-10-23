/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktype's header reads "laatst gewijzigd 2 okt door Lars de Koning".
 * A record does not say who changed it last; its audit trail does. With
 * `headerMetaLastChange` the page reads the newest create or update entry
 * and offers it to the meta line as `{_lastChange.userName}` and
 * `{_lastChange.created|date}`.
 *
 * @spec openspec/changes/header-meta-last-change/specs/detail-page/spec.md#requirement-the-header-meta-line-can-name-who-changed-the-record-last
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args), post: jest.fn(), put: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path, params = {}) => '/index.php' + path.replace(/\{(\w+)\}/g, (all, key) => params[key]),
}))

const { mount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const store = {
	objects: { 'dossiq-caseType': { 'ct-1': { title: 'Omgevingsvergunning regulier' } } },
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
}
const settle = () => new Promise((resolve) => setTimeout(resolve))

/**
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountPage(props) {
	return mount(CnDetailPage, {
		propsData: { title: 'Case type', register: 'dossiq', schema: 'caseType', objectId: 'ct-1', objectStore: store, ...props },
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { results: [{ action: 'update', user: 'lars', userName: 'Lars de Koning', created: '2026-10-02T09:00:00+00:00' }] } })
})

describe('CnDetailPage headerMetaLastChange', () => {
	it('reads the newest create or update entry of the record', async () => {
		mountPage({ headerMeta: 'last changed by {_lastChange.userName}', headerMetaLastChange: true })
		await settle()
		expect(mockGet).toHaveBeenCalledTimes(1)
		const [url, config] = mockGet.mock.calls[0]
		expect(url).toBe('/index.php/apps/openregister/api/objects/dossiq/caseType/ct-1/audit-trails')
		expect(config.params).toMatchObject({ _limit: 1, sort: 'created', order: 'DESC', action: 'create,update' })
	})

	it('fills the meta line with who changed it', async () => {
		const w = mountPage({ headerMeta: 'last changed by {_lastChange.userName}', headerMetaLastChange: true })
		await settle()
		expect(w.vm.headerMetaText).toBe('last changed by Lars de Koning')
	})

	it('asks nothing without the option', async () => {
		mountPage({ headerMeta: '{title}' })
		await settle()
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('drops the token when the trail cannot be read', async () => {
		mockGet.mockRejectedValue(new Error('403'))
		const w = mountPage({ headerMeta: '{title} · by {_lastChange.userName}', headerMetaLastChange: true })
		await settle()
		expect(w.vm.headerMetaText).toBe('Omgevingsvergunning regulier')
	})
})
