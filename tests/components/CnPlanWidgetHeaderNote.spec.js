/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnPlanWidget `content.headerNote`: the card's note at the right of its
 * title (DqZaak "Zaakplan ... Mijlpalen en onderdelen van dit Woo-verzoek").
 *
 * @spec openspec/changes/plan-header-note/specs/plan-widget/spec.md#requirement-a-plan-card-can-carry-a-note-beside-its-title
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnPlanWidget from '../../src/components/CnPlanWidget/CnPlanWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p, generateFilePath: (p) => p, imagePath: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const STUBS = { NcEmptyContent: true, NcLoadingIcon: true }

/**
 * Mount the widget and let it read.
 *
 * @param {object} content The widget content.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The widget.
 */
async function mountWidget(content) {
	const w = mount(CnPlanWidget, {
		props: { objectData: { id: 'z-82' }, content },
		global: { stubs: STUBS, provide: { cnTranslate: (key) => (key === 'Milestones and parts of this case' ? 'Mijlpalen en onderdelen van deze zaak' : key) } },
	})
	await flushPromises()
	return w
}

describe('CnPlanWidget headerNote', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { items: [] } })
	})

	it('reports the translated note for the title row', async () => {
		const w = await mountWidget({ headerNote: 'Milestones and parts of this case' })
		expect(w.emitted('header')).toEqual([[{ note: 'Mijlpalen en onderdelen van deze zaak' }]])
	})

	it('reports no header without a note', async () => {
		const w = await mountWidget({})
		expect(w.emitted('header')).toBeUndefined()
	})
})
