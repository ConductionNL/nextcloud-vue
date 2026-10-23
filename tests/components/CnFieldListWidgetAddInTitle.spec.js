/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `add.placement: "title"` puts the add button in the card's title row
 * (DqZaaktype Varianten: "Variant toevoegen" beside the title): the widget
 * reports it on its `header` event instead of drawing it in the body, and the
 * form it opens sits above the rows.
 *
 * @spec openspec/changes/field-list-add-in-card-title/specs/field-list/spec.md#requirement-a-field-lists-add-button-can-sit-in-the-card-title-row
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: {} })), patch: jest.fn(), post: jest.fn() },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

const { mount } = require('@vue/test-utils')
const CnFieldListWidget = require('../../src/components/CnFieldListWidget/CnFieldListWidget.vue').default

const VARIANTS = {
	field: 'variants',
	key: 'name',
	row: { title: 'name', meta: ['description'] },
	add: { label: 'Add a variant', trigger: 'button', fields: [{ key: 'name', label: 'Name', required: true }] },
}

/**
 * Mount the widget.
 *
 * @param {object} add Overrides for `content.add`.
 * @return {object} The wrapper.
 */
function mountList(add) {
	return mount(CnFieldListWidget, {
		props: { content: { ...VARIANTS, add: { ...VARIANTS.add, ...add } }, objectData: { id: 'c-1', variants: [{ name: 'Regulier' }] }, objectId: 'c-1', register: 'dossiq', schema: 'caseType' },
		global: {
			provide: { cnTranslate: (key) => key },
			stubs: {
				NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				NcNoteCard: true,
				NcTextField: { props: ['modelValue', 'label'], template: '<label>{{ label }}</label>' },
				NcSelect: true,
			},
		},
	})
}

/**
 * The last `header` event's payload.
 *
 * @param {object} w The wrapper.
 * @return {object|null} The payload.
 */
function lastHeader(w) {
	const events = w.emitted('header') || []
	return events.length ? events[events.length - 1][0] : null
}

describe('CnFieldListWidget add in the card title row', () => {
	it('reports the add button on its header event and draws none in the body', async () => {
		const w = mountList({ placement: 'title' })
		await w.vm.$nextTick()
		const header = lastHeader(w)
		expect(header.actions).toHaveLength(1)
		expect(header.actions[0]).toMatchObject({ label: 'Add a variant', icon: 'Plus' })
		expect(w.find('[data-testid="cn-field-list-open-add"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-field-list-add"]').exists()).toBe(false)
	})

	it('opens the form above the rows from that button, and closes it again', async () => {
		const w = mountList({ placement: 'title' })
		await w.vm.$nextTick()
		lastHeader(w).actions[0].run()
		await w.vm.$nextTick()
		const html = w.html()
		expect(w.find('[data-testid="cn-field-list-add"]').exists()).toBe(true)
		expect(html.indexOf('data-testid="cn-field-list-add"')).toBeLessThan(html.indexOf('Regulier'))
		lastHeader(w).actions[0].run()
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-field-list-add"]').exists()).toBe(false)
	})

	it('reports no header action for the other placements', async () => {
		for (const placement of ['header', 'footer']) {
			const w = mountList({ placement })
			await w.vm.$nextTick()
			const header = lastHeader(w)
			expect(header === null || header.actions.length === 0).toBe(true)
			expect(w.find('[data-testid="cn-field-list-open-add"]').exists()).toBe(true)
		}
	})

	it('reports no header action on a read-only list', async () => {
		const w = mount(CnFieldListWidget, {
			props: { content: { ...VARIANTS, readOnly: true, add: { ...VARIANTS.add, placement: 'title' } }, objectData: { id: 'c-1', variants: [] }, objectId: 'c-1' },
			global: { provide: { cnTranslate: (key) => key }, stubs: { NcButton: true, NcNoteCard: true, NcTextField: true, NcSelect: true } },
		})
		await w.vm.$nextTick()
		const header = lastHeader(w)
		expect(header === null || header.actions.length === 0).toBe(true)
	})
})
