/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqInstellingenAlgemeen writes what the red days mean under the calendar
 * ("Rood: feestdag of sluitingsdag. ..."), not under the card title. The
 * widget draws `content.footnote` after the month grid, through the host's
 * translate.
 *
 * @spec openspec/changes/working-calendar-footnote/specs/working-calendar-footnote/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(() => Promise.resolve({ data: { dates: [] } })), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn(() => Promise.resolve([{ id: 'cal-1', workingWeekdays: [1, 2, 3, 4, 5], rules: [], exceptions: [] }])) }))

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnWorkingCalendarWidget from '../../src/components/CnWorkingCalendarWidget/CnWorkingCalendarWidget.vue'

const CONTENT = { calendar: { register: 'flow-timers', schema: 'working-calendar' } }

async function mountCalendar(content) {
	const w = mount(CnWorkingCalendarWidget, {
		props: { content },
		global: { stubs: { NcLoadingIcon: true }, provide: { cnTranslate: (key) => ({ 'Red: a holiday.': 'Rood: een feestdag.' })[key] || key } },
	})
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
	return w
}

describe('CnWorkingCalendarWidget footnote', () => {
	it('writes the footnote after the month grid, translated', async () => {
		const w = await mountCalendar({ ...CONTENT, footnote: 'Red: a holiday.' })
		const note = w.find('[data-testid="cn-working-calendar-footnote"]')
		expect(note.text()).toBe('Rood: een feestdag.')
		const html = w.html()
		expect(html.indexOf('cn-working-calendar__grid')).toBeLessThan(html.indexOf('cn-working-calendar-footnote'))
	})

	it('writes none without one', async () => {
		const w = await mountCalendar(CONTENT)
		expect(w.find('[data-testid="cn-working-calendar-footnote"]').exists()).toBe(false)
	})
})
