/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards put a list's counts under its card title ("4 vastgelegd", "3 in
 * totaal", "5 van 7 stappen klaar", "2 van 4 klaar"). A list says them as its
 * header subtitle: `content.headerSubtitle` on CnObjectListWidget and
 * CnRecordListWidget (the `{total}` / `{count:field=value}` grammar), and
 * `content.summaryInHeader` on CnChecklistWidget.
 *
 * @spec openspec/changes/widget-header-subtitle-counts/specs/widget-header-subtitle-counts/spec.md#requirement-a-list-can-say-its-counts-under-its-card-title
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => new Promise(() => {})), post: jest.fn(), patch: jest.fn() } }))

import { mount, shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnChecklistWidget from '../../src/components/CnChecklistWidget/CnChecklistWidget.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

const NL = { '{total} recorded': '{total} vastgelegd', '{total} in total': '{total} in totaal' }
const translate = (key) => NL[key] ?? key
function lastHeader(w) {
	const events = w.emitted('header') || []
	return events.length ? events[events.length - 1][0] : undefined
}

describe('header subtitle counts', () => {
	it('CnObjectListWidget says its total under the title, translated', async () => {
		const w = shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'r', schema: 'contactmoment', columns: [{ key: 'date', label: 'Date' }], headerSubtitle: '{total} recorded' } },
			provide: { cnTranslate: translate },
			stubs: { CnDataTable: true },
		})
		w.vm.rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
		w.vm.total = 4
		await nextTick()
		expect(lastHeader(w).subtitle).toBe('4 vastgelegd')
	})

	it('CnObjectListWidget reports no header without a subtitle or an export', async () => {
		const w = shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'r', schema: 's', columns: [{ key: 'a', label: 'A' }] } },
			stubs: { CnDataTable: true },
		})
		w.vm.rows = [{ id: 'a' }]
		await nextTick()
		expect(w.emitted('header')).toBeUndefined()
	})

	it('CnRecordListWidget says its counts under the title', async () => {
		const w = mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 'step', headerSubtitle: '{count:status=completed} of {total} steps done' } },
			global: { provide: { cnTranslate: translate }, stubs: { CnIcon: true, NcLoadingIcon: true } },
		})
		w.vm.rows = [{ status: 'completed' }, { status: 'completed' }, { status: 'pending' }]
		w.vm.total = 3
		w.vm.emitHeader()
		expect(lastHeader(w).subtitle).toBe('2 of 3 steps done')
	})

	it('CnChecklistWidget moves its "2 of 4 done" into the header with summaryInHeader', async () => {
		const items = [{ id: 'a', label: 'A', checked: true }, { id: 'b', label: 'B', checked: false }]
		const inHeader = mount(CnChecklistWidget, { props: { objectData: { checklist: items }, content: { summaryInHeader: true } } })
		await nextTick()
		expect(lastHeader(inHeader).subtitle).toBe('1 of 2 done')
		expect(inHeader.find('[data-testid="cn-checklist-summary"]').exists()).toBe(false)

		const inBody = mount(CnChecklistWidget, { props: { objectData: { checklist: items }, content: {} } })
		await nextTick()
		expect(inBody.emitted('header')).toBeUndefined()
		expect(inBody.find('[data-testid="cn-checklist-summary"]').exists()).toBe(true)
	})
})
