/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page can ask why the reader opens a record before it shows it
 * (detail-access-purpose, DqSociaalDomein): nothing of the record shows while
 * the purpose is not recorded, the purpose goes to the app's endpoint, a
 * refusal keeps the record closed, and the same record is not asked again in
 * the session.
 *
 * @spec openspec/changes/detail-access-purpose/specs/detail-access-purpose/spec.md#requirement-a-detail-page-can-ask-for-a-purpose-before-it-opens
 */
const mockPost = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: (...a) => mockPost(...a), get: jest.fn(() => Promise.resolve({ data: {} })) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}`, generateOcsUrl: (p) => p }))

import { flushPromises, mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const GATE = {
	when: { field: 'specialData', op: 'eq', value: true },
	options: [{ value: 'handling', label: 'Handling the case' }],
	url: '/apps/dossiq/api/cases/{objectId}/access-purpose',
}

/**
 * Mount a detail page over a record held by the consumer.
 *
 * @param {object} object The record.
 * @param {object} [extra] More props.
 * @return {import('@vue/test-utils').VueWrapper} The page.
 */
function mountPage(object, extra = {}) {
	return mount(CnDetailPage, {
		props: {
			title: 'Melding Jeugdwet',
			objectType: 'case',
			objectId: 'case-1',
			objectStore: { objects: { case: { 'case-1': object } } },
			accessPurpose: GATE,
			...extra,
		},
		slots: { default: '<p class="record-body">De huisarts meldt zorgen</p>' },
		global: {
			stubs: {
				CnAccessPurposeDialog: {
					name: 'CnAccessPurposeDialog',
					props: ['options', 'loading', 'error'],
					emits: ['submit', 'cancel'],
					template: '<div class="purpose-dialog">{{ error }}</div>',
				},
			},
		},
	})
}

beforeEach(() => {
	mockPost.mockReset()
	window.sessionStorage.clear()
})

describe('CnDetailPage accessPurpose', () => {
	it('shows nothing of a record that asks for a purpose, and asks', async () => {
		const w = mountPage({ id: 'case-1', specialData: true })
		await flushPromises()
		expect(w.find('[data-testid="cn-detail-page-access-purpose"]').exists()).toBe(true)
		expect(w.find('.purpose-dialog').exists()).toBe(true)
		expect(w.find('.record-body').exists()).toBe(false)
		expect(w.find('[data-testid="cn-detail-page-header"]').exists()).toBe(false)
	})

	it('records the purpose with the endpoint, then opens and remembers it for the session', async () => {
		mockPost.mockResolvedValue({ data: { recorded: true } })
		const w = mountPage({ id: 'case-1', specialData: true })
		await flushPromises()
		w.findComponent({ name: 'CnAccessPurposeDialog' }).vm.$emit('submit', { purpose: 'handling', note: '' })
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/dossiq/api/cases/case-1/access-purpose', { purpose: 'handling', note: '' })
		expect(w.find('.record-body').exists()).toBe(true)

		const again = mountPage({ id: 'case-1', specialData: true })
		await flushPromises()
		expect(again.find('.record-body').exists()).toBe(true)
		expect(again.find('.purpose-dialog').exists()).toBe(false)
	})

	it('keeps the record closed when the endpoint refuses, and says why', async () => {
		mockPost.mockRejectedValue({ response: { status: 503, data: { message: 'The purpose could not be recorded, so the case does not open.' } } })
		const w = mountPage({ id: 'case-1', specialData: true })
		await flushPromises()
		w.findComponent({ name: 'CnAccessPurposeDialog' }).vm.$emit('submit', { purpose: 'other', note: 'Audit' })
		await flushPromises()
		expect(w.find('.record-body').exists()).toBe(false)
		expect(w.find('.purpose-dialog').text()).toContain('could not be recorded')
	})

	it('keeps the record closed when the reader cancels, with a way to state a purpose', async () => {
		const w = mountPage({ id: 'case-1', specialData: true })
		await flushPromises()
		w.findComponent({ name: 'CnAccessPurposeDialog' }).vm.$emit('cancel')
		await flushPromises()
		expect(w.find('.record-body').exists()).toBe(false)
		expect(w.find('[data-testid="cn-detail-page-access-purpose-refused"]').exists()).toBe(true)
	})

	it('opens a record that does not ask without a dialog', async () => {
		const w = mountPage({ id: 'case-1', specialData: false })
		await flushPromises()
		expect(w.find('.record-body').exists()).toBe(true)
		expect(w.find('[data-testid="cn-detail-page-access-purpose"]').exists()).toBe(false)
		expect(mockPost).not.toHaveBeenCalled()
	})
})
