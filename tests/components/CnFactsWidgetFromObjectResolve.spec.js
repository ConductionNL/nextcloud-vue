/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `from: "object"` entry with `resolve` on a sourced facts card reads its
 * reference from the page's own object (board DqSociaalDomein "De melding":
 * the case's Zaaktype on a card whose source is the family plan), also while
 * the source finds nothing.
 *
 * @spec openspec/changes/facts-from-object-resolve/specs/facts-widget/spec.md#requirement-a-from-object-entry-resolves-its-reference-from-the-page-object
 */
var mockResolve = jest.fn()
var mockGet = jest.fn()

jest.mock('../../src/composables/useRefLabels.js', () => ({
	__esModule: true,
	useRefLabels: () => ({ resolve: (...args) => mockResolve(...args) }),
}))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { flushPromises, mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const content = {
	source: { register: 'dossiq', schema: 'gezinsplan', filter: { caseId: '@objectId' } },
	fields: [
		{ from: 'object', label: 'Case type', path: 'caseType', resolve: { register: 'dossiq', schema: 'caseType', labelField: 'title' } },
		{ label: 'Family plan', path: 'status' },
	],
}

function mountFacts() {
	return mount(CnFactsWidget, {
		propsData: { content, objectData: { id: 'c-1', caseType: 'ct-1' }, objectId: 'c-1' },
		provide: { cnTranslate: (key) => key },
		stubs: { NcLoadingIcon: true },
	})
}

describe('CnFactsWidget: from-object entry with resolve', () => {
	beforeEach(() => {
		mockResolve.mockReset()
		mockResolve.mockImplementation(async (register, schema, ids) => Object.fromEntries(ids.map((id) => [id, id === 'ct-1' ? 'Melding Jeugdwet' : `Other ${id}`])))
	})

	it('resolves the page object\'s reference beside a found source', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: 'g-1', status: 'In opbouw', caseType: 'ct-other' }], total: 1 } })
		const w = mountFacts()
		await flushPromises()
		await flushPromises()
		expect(mockResolve).toHaveBeenCalledWith('dossiq', 'caseType', ['ct-1'], 'title')
		expect(w.find('[data-testid="cn-fact-caseType"] .cn-facts-widget__value').text()).toBe('Melding Jeugdwet')
	})

	it('resolves it when the source finds nothing', async () => {
		mockGet.mockResolvedValue({ data: { results: [], total: 0 } })
		const w = mountFacts()
		await flushPromises()
		await flushPromises()
		expect(w.find('[data-testid="cn-fact-caseType"] .cn-facts-widget__value').text()).toBe('Melding Jeugdwet')
	})
})
