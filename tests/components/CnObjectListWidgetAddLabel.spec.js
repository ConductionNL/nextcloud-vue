/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Add button of CnObjectListWidget speaks the app's language.
 *
 * `content.addLabel` is manifest copy, so it lives in the APP's catalogue and
 * has to go through the host translate function CnAppRoot provides, the way
 * `emptyText` and `prompt` already do. It printed raw (2.71 and 2.73.1), so a
 * Dutch user read the English manifest string; pipelinq pre-translated its
 * labels as a workaround, which must keep working.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

const NL = { 'Add lead': 'Lead toevoegen' }

function mountList(content, cnTranslate) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'pipelinq', schema: 'lead', columns: [{ key: 'title', label: 'Title' }], ...content } },
		provide: cnTranslate ? { cnTranslate } : {},
		stubs: { CnDataTable: true },
	})
}

describe('CnObjectListWidget — the Add label', () => {
	it('🔴 runs content.addLabel through the host translate function', () => {
		const w = mountList({ addLabel: 'Add lead' }, (key) => NL[key] ?? key)
		expect(w.vm.addLabel).toBe('Lead toevoegen')
	})

	it('leaves a label the app already translated unchanged', () => {
		const w = mountList({ addLabel: 'Lead toevoegen' }, (key) => NL[key] ?? key)
		expect(w.vm.addLabel).toBe('Lead toevoegen')
	})

	it('falls back to the library Add without a manifest label', () => {
		const translate = jest.fn((key) => key)
		const w = mountList({}, translate)
		expect(w.vm.addLabel).toBe('Add')
		expect(translate).not.toHaveBeenCalledWith('Add')
	})

	it('renders the label as is outside an app root', () => {
		const w = mountList({ addLabel: 'Add lead' })
		expect(w.vm.addLabel).toBe('Add lead')
	})
})
