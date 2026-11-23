/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `accessPurpose.checkUrl`: the page asks the app first whether the reader
 * must state a purpose. `{ required: false }` (the app recorded it itself,
 * as for the case's own handler) opens the record without the dialog; any
 * other answer or a failure asks as before. An option's `hint` reaches the
 * dialog translated.
 *
 * @spec openspec/changes/detail-access-purpose/specs/detail-access-purpose/spec.md#requirement-a-detail-page-can-ask-for-a-purpose-before-it-opens
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: (...a) => mockPost(...a), get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}`, generateOcsUrl: (p) => p }))

import { flushPromises, mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const GATE = {
	when: { field: 'specialData', op: 'eq', value: true },
	options: [{ value: 'handling', label: 'Handling the case', hint: 'You become this case\'s handler.' }],
	url: '/apps/dossiq/api/cases/{objectId}/access-purpose',
	checkUrl: '/apps/dossiq/api/cases/{objectId}/access-purpose',
}

/**
 * Mount a detail page over a record held by the consumer.
 *
 * @param {object} [extra] More props.
 * @return {import('@vue/test-utils').VueWrapper} The page.
 */
function mountPage(extra = {}) {
	return mount(CnDetailPage, {
		props: {
			title: 'Melding Jeugdwet',
			objectType: 'case',
			objectId: 'case-1',
			objectStore: { objects: { case: { 'case-1': { id: 'case-1', specialData: true } } } },
			accessPurpose: GATE,
			...extra,
		},
		slots: { default: '<p class="record-body">De huisarts meldt zorgen</p>' },
		global: {
			provide: { cnTranslate: (key) => ({ 'You become this case\'s handler.': 'Je wordt behandelaar van deze zaak.' }[key] || key) },
			stubs: {
				CnAccessPurposeDialog: {
					name: 'CnAccessPurposeDialog',
					props: ['options', 'loading', 'error'],
					emits: ['submit', 'cancel'],
					template: '<div class="purpose-dialog"></div>',
				},
			},
		},
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
	window.sessionStorage.clear()
})

describe('CnDetailPage accessPurpose checkUrl', () => {
	it('opens the record without the dialog when the app needs no purpose, and remembers it', async () => {
		mockGet.mockResolvedValue({ data: { required: false, recorded: true } })
		const w = mountPage()
		await flushPromises()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/dossiq/api/cases/case-1/access-purpose')
		expect(w.find('.purpose-dialog').exists()).toBe(false)
		expect(w.find('.record-body').exists()).toBe(true)
		expect(mockPost).not.toHaveBeenCalled()
		expect(window.sessionStorage.getItem('cn-access-purposes')).toContain('case-1')
	})

	it('asks when the app says a purpose is required, or cannot be asked', async () => {
		mockGet.mockResolvedValue({ data: { required: true } })
		const asked = mountPage()
		await flushPromises()
		expect(asked.find('.purpose-dialog').exists()).toBe(true)
		expect(asked.find('.record-body').exists()).toBe(false)

		mockGet.mockRejectedValue(new Error('offline'))
		const failed = mountPage()
		await flushPromises()
		expect(failed.find('.purpose-dialog').exists()).toBe(true)
	})

	it('hands the dialog each option with its hint, translated', async () => {
		mockGet.mockResolvedValue({ data: { required: true } })
		const w = mountPage()
		await flushPromises()
		expect(w.findComponent({ name: 'CnAccessPurposeDialog' }).props('options')).toEqual([
			{ value: 'handling', label: 'Handling the case', hint: 'Je wordt behandelaar van deze zaak.' },
		])
	})
})
