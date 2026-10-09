/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/detail-page-object-widgets/tasks.md#task-1
 */
import { shallowMount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnObjectFilesWidget from '../../src/components/CnObjectFilesWidget/CnObjectFilesWidget.vue'

const mountHost = (props) => shallowMount(CnDetailWidgetHost, { props: { widget: { id: 'f', type: 'files', title: 'Files' }, ...props } })

describe('CnDetailWidgetHost files widget', () => {
	it('mounts the object-bound files widget on a detail page', () => {
		const w = mountHost({ register: 'petstore', schema: 'pet', objectId: 'P1' })
		expect(w.vm.renderer).toBe(CnObjectFilesWidget)
	})

	it('keeps the placement-folder widget when there is no object context', () => {
		const w = mountHost({})
		expect(w.vm.renderer).not.toBe(CnObjectFilesWidget)
	})

	it('lets a consumer registry entry for files win', () => {
		const Custom = { name: 'Custom', render: () => null }
		const w = mountHost({ register: 'petstore', schema: 'pet', objectId: 'P1', cnRegistry: { files: Custom } })
		expect(w.vm.renderer).not.toBe(CnObjectFilesWidget)
	})
})
