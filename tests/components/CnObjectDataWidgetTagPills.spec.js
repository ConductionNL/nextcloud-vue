/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaak "Zaakgegevens": the labels read as pills, each with a remove button,
 * then "+ Label", and a muted hint under them.
 *
 * @spec openspec/changes/data-widget-tag-pills/specs/data-widget/spec.md
 */
import { mount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const SCHEMA = { properties: { labels: { type: 'array', items: { type: 'string' } } } }
const OVERRIDES = { labels: { widget: 'tags', tagPills: true, hint: 'Free words.' } }

/**
 * @param {object} props Extra props.
 * @return {object} The mounted widget.
 */
function mountWidget(props = {}) {
	return mount(CnObjectDataWidget, {
		props: { schema: SCHEMA, objectData: { id: '1', labels: ['spoed', 'bezwaar'] }, objectType: 'case', overrides: OVERRIDES, editable: true, ...props },
		global: {
			stubs: {
				CnWidgetWrapper: { template: '<div><slot /></div>' },
				CnFormDialog: true,
				CnObjectMetadataModal: true,
				NcSelect: { name: 'NcSelect', template: '<div class="select" />' },
				NcButton: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>' },
			},
		},
	})
}

describe('CnObjectDataWidget tag pills', () => {
	it('draws each tag as a pill with a remove button, then + Label and the hint', () => {
		const w = mountWidget()
		const tags = w.find('[data-testid="cn-object-data-tags-labels"]')
		expect(tags.findAll('.cn-object-data-widget__tag').map((t) => t.text())).toEqual(['spoed', 'bezwaar'])
		expect(tags.findAll('[data-testid="cn-object-data-tag-remove-labels"]')[0].attributes('aria-label')).toBe('Remove spoed')
		expect(w.find('[data-testid="cn-object-data-tag-add-labels"]').text()).toBe('+ Label')
		expect(w.text()).toContain('Free words.')
	})

	it('saves the field without the removed tag', async () => {
		const saveObject = jest.fn(async (type, data) => data)
		const w = mountWidget({ store: { saveObject, getError: jest.fn() } })
		await w.findAll('[data-testid="cn-object-data-tag-remove-labels"]')[0].trigger('click')
		expect(saveObject).toHaveBeenCalledWith('case', expect.objectContaining({ labels: ['bezwaar'] }))
	})

	it('opens the tags editor from + Label', async () => {
		const w = mountWidget()
		await w.find('[data-testid="cn-object-data-tag-add-labels"]').trigger('click')
		expect(w.vm.editingField).toBe('labels')
	})

	it('draws no remove or add buttons when the field is not editable', () => {
		const w = mountWidget({ editable: false })
		expect(w.findAll('.cn-object-data-widget__tag')).toHaveLength(2)
		expect(w.find('[data-testid="cn-object-data-tag-remove-labels"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-object-data-tag-add-labels"]').exists()).toBe(false)
	})

	it('keeps the plain value without tagPills (control)', () => {
		const w = mountWidget({ overrides: { labels: { widget: 'tags' } } })
		expect(w.find('[data-testid="cn-object-data-tags-labels"]').exists()).toBe(false)
	})
})
