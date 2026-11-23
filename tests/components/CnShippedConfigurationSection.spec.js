/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What an app shipped, what this instance changed, and what it authored: one
 * row per seeded object with its state in words and the newer version offered
 * per object (dossiq's ShippedConfiguration, now shared by every seeding app).
 *
 * @spec openspec/changes/shipped-configuration-section/specs/shipped-configuration-section/spec.md
 */
var mockGet = jest.fn()
var mockPost = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))

import { flushPromises, mount } from '@vue/test-utils'
import CnShippedConfigurationSection from '../../src/components/CnShippedConfigurationSection/CnShippedConfigurationSection.vue'

const ENDPOINT = '/apps/app/api/starter/shipped'
const SCHEMAS = [{ slug: 'caseType', label: 'Case types' }, { slug: 'roleType', label: 'Roles' }]

/**
 * @param {object} [props] Extra props.
 * @return {Promise<object>} The mounted section, its first read settled.
 */
async function mountSection(props = {}) {
	const w = mount(CnShippedConfigurationSection, { props: { endpoint: ENDPOINT, schemas: SCHEMAS, ...props } })
	await flushPromises()
	return w
}

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
})

describe('CnShippedConfigurationSection', () => {
	it('reads the first schema and names each state in words', async () => {
		mockGet.mockResolvedValue({ data: { items: [
			{ targetObject: 'a', title: 'A', state: 'shipped', set: 'base', setVersion: '1.0' },
			{ targetObject: 'b', title: 'B', state: 'changed', set: 'base', setVersion: '1.0', updateAvailable: true, latestVersion: '1.1' },
			{ targetObject: 'c', title: 'C', state: 'local' },
			{ targetObject: 'd', title: 'D', state: 'removed', updateAvailable: true, latestVersion: '1.1' },
		] } })
		const w = await mountSection()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/app/api/starter/shipped/caseType')
		const state = (id) => w.find(`[data-testid="cn-shipped-state-${id}"]`).text()
		expect(state('a')).toBe('Shipped, unchanged')
		expect(state('b')).toBe('Shipped, changed here')
		expect(state('c')).toBe('Yours')
		expect(state('d')).toBe('Shipped, removed here')
		// A newer version is offered only where one is waiting and the row is still there.
		expect(w.find('[data-testid="cn-shipped-adopt-a"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-shipped-adopt-d"]').exists()).toBe(false)
		// Taking it over a local change says the change goes.
		expect(w.find('[data-testid="cn-shipped-adopt-b"]').text()).toBe('Take 1.1 and lose your change')
	})

	it('adopts with the loss accepted for a changed row and reads again', async () => {
		mockGet.mockResolvedValue({ data: { items: [{ targetObject: 'b', state: 'changed', set: 'base', updateAvailable: true, latestVersion: '1.1' }] } })
		mockPost.mockResolvedValue({ data: { adopted: true } })
		const w = await mountSection()
		await w.find('[data-testid="cn-shipped-adopt-b"]').trigger('click')
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/app/api/starter/shipped/caseType/b/adopt', { set: 'base', acceptLocalChangeLoss: true })
		expect(mockGet).toHaveBeenCalledTimes(2)
	})

	it('shows the server\'s reason when an adoption is refused', async () => {
		mockGet.mockResolvedValue({ data: { items: [{ targetObject: 'b', state: 'shipped', updateAvailable: true, latestVersion: '1.1' }] } })
		mockPost.mockRejectedValue({ response: { data: { reason: 'The set is retired.' } } })
		const w = await mountSection()
		await w.find('[data-testid="cn-shipped-adopt-b"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-shipped-configuration-adopt-error"]').text()).toBe('The set is retired.')
	})

	it('says how many the register holds when the ledger is empty, and nothing seeded only when it holds none', async () => {
		mockGet.mockImplementation((url) => Promise.resolve({ data: url.includes('/objects/') ? { total: 24 } : { items: [] } }))
		let w = await mountSection({ countUrl: '/apps/openregister/api/objects/app/{schema}' })
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/app/caseType', { params: { _limit: 1 } })
		expect(w.find('[data-testid="cn-shipped-configuration-empty"]').text()).toContain('The register holds 24 of these')
		mockGet.mockImplementation((url) => Promise.resolve({ data: url.includes('/objects/') ? { total: 0 } : { items: [] } }))
		w = await mountSection({ countUrl: '/apps/openregister/api/objects/app/{schema}' })
		expect(w.find('[data-testid="cn-shipped-configuration-empty"]').text()).toBe('Nothing has been seeded yet.')
	})

	it('empties the table and says so when the ledger cannot be read', async () => {
		mockGet.mockRejectedValue(new Error('500'))
		const w = await mountSection()
		expect(w.find('[data-testid="cn-shipped-configuration-error"]').text()).toBe('Could not read the shipped configuration.')
		expect(w.findAll('[data-testid^="cn-shipped-state-"]')).toHaveLength(0)
	})
})
