import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `rows` record list's avatar can be the board's 32px circle, 12px from
 * the title (DqZaakBesluiten Adviezen: first row text 67px in, live 75).
 *
 * @spec openspec/changes/record-list-avatar-size/specs/record-list-avatar/spec.md#requirement-a-record-list-avatar-can-be-the-small-circle
 */
import fs from 'fs'
import path from 'path'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'), 'utf8')

/**
 * @param {object} content The content.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The list.
 */
async function mountList(content) {
	axios.get.mockResolvedValue({ data: { results: [{ id: 'a', subject: 'Advies verlichting', advisor: 'Mobiliteit en verkeer' }], total: 1 } })
	const w = mount(CnRecordListWidget, { props: { content }, global: { stubs: { NcLoadingIcon: true, CnIcon: true } } })
	await flushPromises()
	return w
}

describe('CnRecordListWidget avatar size', () => {
	it('marks the list for the small circle with avatar.size 32', async () => {
		const w = await mountList({ register: 'r', schema: 's', title: '{subject}', avatar: { text: '{advisor}', size: 32 } })
		expect(w.find('.cn-record-list__list').classes()).toContain('cn-record-list__list--avatar-small')
		expect(w.find('[data-testid="cn-record-list-avatar"]').text()).toBe('MV')
	})

	it('keeps the 36px circle otherwise', async () => {
		const w = await mountList({ register: 'r', schema: 's', title: '{subject}', avatar: '{advisor}' })
		expect(w.find('.cn-record-list__list').classes()).not.toContain('cn-record-list__list--avatar-small')
	})

	it('marks the list for the person chip with avatar.size 40', async () => {
		const w = await mountList({ register: 'r', schema: 's', title: '{subject}', avatar: { text: '{advisor}', size: 40 } })
		expect(w.find('.cn-record-list__list').classes()).toContain('cn-record-list__list--avatar-person')
		expect(w.find('.cn-record-list__list').classes()).not.toContain('cn-record-list__list--avatar-small')
	})

	it('draws the person chip 40px, 16px bold on the grey ground, in a side column too', () => {
		const at = sfc.indexOf('.cn-record-list__list--avatar-person .cn-record-list__avatar {')
		expect(at).toBeGreaterThan(-1)
		const body = sfc.slice(at, sfc.indexOf('}', at))
		expect(body).toContain('width: 40px')
		expect(body).toContain('font-size: 16px')
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8')
		const side = css.indexOf('.cn-detail-page__side .cn-record-list__list--avatar-person .cn-record-list__row:not(.cn-look-nextcloud *) > .cn-record-list__avatar {')
		expect(side).toBeGreaterThan(-1)
		const sideBody = css.slice(side, css.indexOf('}', side))
		expect(sideBody).toContain('width: 40px')
		expect(sideBody).toContain('background: var(--color-background-hover)')
	})

	it('draws the small circle 32px and 12px from the title', () => {
		const at = sfc.indexOf('.cn-record-list__list--avatar-small .cn-record-list__avatar {')
		const body = sfc.slice(at, sfc.indexOf('}', at))
		expect(body).toContain('width: 32px')
		expect(body).toContain('margin-inline-end: -4px')
	})
})
