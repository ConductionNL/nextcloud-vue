/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The loaded shipped sets, each removable after a confirm: the admin page's
 * "Example data" list (learniq), shared by every app with a setup wizard.
 *
 * @spec openspec/changes/shipped-configuration-remove-set/specs/shipped-configuration-section/spec.md
 */
var mockGet = jest.fn()
var mockPost = jest.fn()
var mockConfirm = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn(), showConfirmation: (...a) => mockConfirm(...a) }))

import { flushPromises, mount } from '@vue/test-utils'
import CnShippedConfigurationSection from '../../src/components/CnShippedConfigurationSection/CnShippedConfigurationSection.vue'

const SETS_URL = '/apps/app/api/setup/example-sets'
const REMOVE_URL = '/apps/app/api/setup/action/remove-example-set-{id}'

/**
 * @param {object} [props] Extra props.
 * @return {Promise<object>} The mounted section, its first read settled.
 */
async function mountSets(props = {}) {
	const w = mount(CnShippedConfigurationSection, {
		props: { setsUrl: SETS_URL, removeSetUrl: REMOVE_URL, ...props },
		global: { provide: { cnTranslate: (text) => (text === 'Company' ? 'Bedrijf' : text) } },
	})
	await flushPromises()
	return w
}

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
	mockConfirm.mockReset()
	mockGet.mockResolvedValue({ data: { sets: [{ id: 'corporate', label: 'Company' }, { id: 'Bad Id', label: 'x' }] } })
})

describe('CnShippedConfigurationSection loaded sets', () => {
	it('lists the loaded sets with their translated labels, without a ledger', async () => {
		const w = await mountSets()

		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/app/api/setup/example-sets')
		expect(w.find('[data-testid="cn-shipped-configuration-table"]').exists()).toBe(false)
		const rows = w.findAll('[data-testid^="cn-shipped-set-"]')
		expect(rows).toHaveLength(1)
		expect(rows[0].text()).toContain('Bedrijf')
	})

	it('removes a set only after a yes, then says what the server said and reads again', async () => {
		mockPost.mockResolvedValue({ data: { success: true, message: 'Moved 12 objects to the trash.' } })
		const w = await mountSets()

		mockConfirm.mockResolvedValueOnce(false)
		await w.find('[data-testid="cn-shipped-remove-corporate"]').trigger('click')
		await flushPromises()
		expect(mockPost).not.toHaveBeenCalled()

		mockConfirm.mockResolvedValueOnce(true)
		mockGet.mockResolvedValueOnce({ data: { sets: [] } })
		await w.find('[data-testid="cn-shipped-remove-corporate"]').trigger('click')
		await flushPromises()

		expect(mockConfirm).toHaveBeenLastCalledWith(expect.objectContaining({ text: expect.stringContaining('Bedrijf') }))
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/app/api/setup/action/remove-example-set-corporate')
		const note = w.find('[data-testid="cn-shipped-set-result"]')
		expect(note.attributes('type')).toBe('success')
		expect(note.text()).toContain('Moved 12 objects to the trash.')
		expect(w.find('[data-testid="cn-shipped-sets-empty"]').exists()).toBe(true)
	})

	it('reports a refusal as a failure, with the server reason', async () => {
		mockConfirm.mockResolvedValue(true)
		mockPost.mockRejectedValue({ response: { data: { message: 'Only an administrator can remove example data.' } } })
		const w = await mountSets()

		await w.find('[data-testid="cn-shipped-remove-corporate"]').trigger('click')
		await flushPromises()

		const note = w.find('[data-testid="cn-shipped-set-result"]')
		expect(note.attributes('type')).toBe('error')
		expect(note.text()).toContain('Only an administrator')
	})

	it('treats success: false in a 200 answer as a failure', async () => {
		mockConfirm.mockResolvedValue(true)
		mockPost.mockResolvedValue({ data: { success: false, message: 'Nothing to remove.' } })
		const w = await mountSets()

		await w.find('[data-testid="cn-shipped-remove-corporate"]').trigger('click')
		await flushPromises()

		expect(w.find('[data-testid="cn-shipped-set-result"]').attributes('type')).toBe('error')
	})
})
