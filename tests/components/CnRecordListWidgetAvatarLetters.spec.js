import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `avatar.letters: 2` draws two letters for a one-word name (DqZaakGerelateerd
 * "AD" for Adviesaanvraag), and `avatar.text` may list candidates.
 *
 * @spec openspec/changes/record-list-avatar-letters/specs/record-list-avatar/spec.md#requirement-a-record-list-avatar-can-draw-two-letters-for-one-word
 */
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

/**
 * @param {object} avatar The avatar config.
 * @param {object} row The one row.
 * @return {Promise<string>} The avatar's text.
 */
async function avatarOf(avatar, row) {
	axios.get.mockResolvedValue({ data: { results: [{ id: 'a', title: 'Advies verlichting', ...row }], total: 1 } })
	const w = mount(CnRecordListWidget, { props: { content: { register: 'r', schema: 's', title: '{title}', avatar } }, global: { stubs: { NcLoadingIcon: true, CnIcon: true } } })
	await flushPromises()
	return w.find('[data-testid="cn-record-list-avatar"]').text()
}

describe('CnRecordListWidget avatar letters', () => {
	it('draws two letters of a one-word name with letters 2', async () => {
		expect(await avatarOf({ text: '{type}', letters: 2 }, { type: 'Adviesaanvraag' })).toBe('AD')
	})

	it('draws one letter of a one-word name without it', async () => {
		expect(await avatarOf({ text: '{type}' }, { type: 'Adviesaanvraag' })).toBe('A')
	})

	it('falls back to the next candidate text', async () => {
		expect(await avatarOf({ text: ['{type}', '{kind}'], letters: 2 }, { kind: 'Reeks' })).toBe('RE')
	})
})
