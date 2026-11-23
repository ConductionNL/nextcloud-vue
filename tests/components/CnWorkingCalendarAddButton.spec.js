/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A host can draw the calendar's Add day in its own title row: with
 * `addButton: false` the calendar leaves its button out and the host opens
 * the form through `openAdd()` (DqInstellingenAlgemeen "Dag toevoegen").
 *
 * @spec openspec/changes/settings-section-title-actions/specs/settings-section-title-actions/spec.md#requirement-a-working-calendar-can-leave-add-day-to-its-host
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
	const w = mount(CnWorkingCalendarWidget, { props: { content }, global: { stubs: { NcLoadingIcon: true } } })
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
	return w
}

describe('CnWorkingCalendarWidget Add day from the host', () => {
	it('draws its own Add day by default', async () => {
		const w = await mountCalendar(CONTENT)
		expect(w.find('[data-testid="cn-working-calendar-add"]').exists()).toBe(true)
	})

	it('leaves the button out with addButton false, and still opens the form from the host', async () => {
		const w = await mountCalendar({ ...CONTENT, addButton: false })
		expect(w.find('[data-testid="cn-working-calendar-add"]').exists()).toBe(false)
		w.vm.openAdd()
		await nextTick()
		expect(w.vm.adding).toBe(true)
	})
})
