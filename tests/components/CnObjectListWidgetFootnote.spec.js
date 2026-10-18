/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.footnote` on a dashboard `table` / `object-list` / `object-table`
 * widget (DqTermijnen "Ingebrekestellingen en dwangsommen"): a line under the
 * table, through the host translate.
 */
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

const NL = { 'Awb 4:17 and 4:18': 'Awb 4:17 en 4:18' }

/**
 * Mount the widget with the given content.
 *
 * @param {object} content Extra content keys.
 * @param {Function} [cnTranslate] The host translate.
 * @return {import('@vue/test-utils').VueWrapper} The widget.
 */
function mountList(content, cnTranslate) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'noticeOfDefault', columns: [{ key: 'receiptDate', label: 'Received' }], ...content } },
		provide: cnTranslate ? { cnTranslate } : {},
		stubs: { CnDataTable: true },
	})
}

describe('CnObjectListWidget footnote', () => {
	it('draws content.footnote under the table through the host translate', () => {
		const w = mountList({ footnote: 'Awb 4:17 and 4:18' }, (key) => NL[key] ?? key)
		const note = w.find('[data-testid="cn-object-list-widget-footnote"]')
		expect(note.exists()).toBe(true)
		expect(note.text()).toBe('Awb 4:17 en 4:18')
	})

	it('draws no footnote without one', () => {
		const w = mountList({})
		expect(w.find('.cn-object-list-widget__footnote').exists()).toBe(false)
	})

	it('draws no footnote over a load error', async () => {
		const w = mountList({ footnote: 'Awb 4:17 and 4:18' })
		w.vm.error = 'boom'
		await nextTick()
		expect(w.find('.cn-object-list-widget__footnote').exists()).toBe(false)
	})

	it('draws no footnote while the list waits for its context', () => {
		const w = shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'r', schema: 's', filter: { client: '@workspace.client' }, footnote: 'Note' } },
			provide: { cnWorkspaceContext: {} },
			stubs: { CnDataTable: true },
		})
		expect(w.vm.waitingForContext).toBe(true)
		expect(w.find('.cn-object-list-widget__footnote').exists()).toBe(false)
	})
})
