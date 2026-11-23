/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record's newest change reaches the widgets: with `recordLastChange`
 * (or `headerMetaLastChange`) CnDetailPage provides it as `cnRecordLastChange`,
 * and a facts card reads it as `_lastChange.*` ("Laatst gewijzigd op 3 oktober
 * door Pieter Jansen", DqContact and DqOrganisatie "Historie").
 *
 * @spec openspec/changes/record-last-change-in-widgets/specs/record-last-change-in-widgets/spec.md#requirement-a-widget-can-read-who-changed-the-record-last
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
const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const store = {
	objects: { 'dossiq-contact': { 'c-1': { name: 'Sanne de Vries' } } },
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
}
const settle = () => new Promise((resolve) => setTimeout(resolve))

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { results: [{ action: 'update', user: 'pieter', userName: 'Pieter Jansen', created: '2026-10-03T09:00:00+00:00' }] } })
})

describe('the record\'s last change in widgets', () => {
	it('CnDetailPage reads it with recordLastChange and provides it', async () => {
		const w = mount(CnDetailPage, { propsData: { title: 'Contact', register: 'dossiq', schema: 'contact', objectId: 'c-1', objectStore: store, recordLastChange: true } })
		await settle()
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(w.vm.$.provides.cnRecordLastChange.value).toMatchObject({ userName: 'Pieter Jansen' })
	})

	it('a facts card reads _lastChange.* from it, and leaves a labelled part out without it', () => {
		const content = { fields: [{ as: 'text', parts: [{ text: 'Last changed' }, { path: '_lastChange.userName', label: 'by' }], separator: ' ' }] }
		const withChange = mount(CnFactsWidget, {
			props: { objectData: { name: 'Sanne' }, content },
			global: { provide: { cnRecordLastChange: { value: { userName: 'Pieter Jansen' } } } },
		})
		expect(withChange.text()).toContain('Last changed by Pieter Jansen')
		const without = mount(CnFactsWidget, { props: { objectData: { name: 'Sanne' }, content } })
		expect(without.text()).toContain('Last changed')
		expect(without.text()).not.toContain('by')
	})
})
