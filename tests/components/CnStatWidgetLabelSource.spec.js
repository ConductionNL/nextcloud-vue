/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a label that reads "<source> · <name>" sets the source in
 * bold ink (LpVandaag: "dossiq · Cases"). Other labels, and other looks, keep
 * the label as one piece of text.
 *
 * @spec openspec/specs/tile-widget/spec.md
 */

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '@/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * @param {string} label The tile's label.
 * @param {boolean} isBoard Board look on.
 * @return {Promise<object>} The wrapper.
 */
async function tile(label, isBoard = true) {
	const w = mount(CnStatWidget, {
		propsData: { content: { label, valueField: 'n', endpointSource: { url: `/apps/x/${label}-${isBoard}` } } },
		stubs: { NcLoadingIcon: { template: '<span />' } },
		global: { provide: { cnWorkspaceContext: {}, ...(isBoard ? { cnLook: 'board' } : {}) } },
	})
	await flush()
	return w
}

describe('CnStatWidget: the source in a board label', () => {
	beforeEach(() => {
		axios.get.mockResolvedValue({ data: { n: 8 } })
	})

	it('sets the source before " · " in bold', async () => {
		const w = await tile('dossiq · Cases')
		expect(w.find('.cn-kpi-card__title-source').text()).toBe('dossiq')
		expect(w.find('.cn-kpi-card__title-text').text()).toBe('dossiq · Cases')
	})

	it('keeps a label without a source as one piece of text', async () => {
		const w = await tile('Open cases')
		expect(w.find('.cn-kpi-card__title-source').exists()).toBe(false)
		expect(w.find('.cn-kpi-card__title-text').text()).toBe('Open cases')
	})

	it('keeps the label whole outside the board look', async () => {
		const w = await tile('dossiq · Cases', false)
		expect(w.find('.cn-kpi-card__title-source').exists()).toBe(false)
	})
})
