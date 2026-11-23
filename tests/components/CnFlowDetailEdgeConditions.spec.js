/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * @param {boolean} edgeConditions The prop under test.
 * @return {object} The component instance.
 */
function editor(edgeConditions) {
	setActivePinia(createPinia())

	return mount(CnFlowDetail, {
		props: { edgeConditions },
		global: { stubs: { CnGraphCanvas: true, NcEmptyContent: true, Sitemap: true }, mocks: { t: (app, s) => s } },
	}).vm
}

describe('CnFlowDetail line text', () => {
	const line = { data: { label: '', conditionText: 'amount is more than 1000' } }

	it('leaves an unnamed line empty by default', () => {
		expect(editor(false).edgeText(line)).toBe('')
	})

	it('writes the condition on an unnamed line when asked', () => {
		expect(editor(true).edgeText(line)).toBe('amount is more than 1000')
	})

	it('lets the author\'s name win over the condition', () => {
		expect(editor(true).edgeText({ data: { ...line.data, label: 'large' } })).toBe('large')
	})

	it('copes with a line without data', () => {
		expect(editor(true).edgeText({})).toBe('')
	})
})
