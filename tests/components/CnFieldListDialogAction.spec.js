/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldListWidget row actions that open a registered dialog (dossiq's
 * FileSetItems: the items of a frozen file set, read only, with Compare on an
 * item whose file that went out is not its original).
 *
 * @spec openspec/changes/abstract-field-list/specs/field-list/spec.md
 */
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

const { mount } = require('@vue/test-utils')
const CnFieldListWidget = require('../../src/components/CnFieldListWidget/CnFieldListWidget.vue').default

const stubs = {
	NcButton: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
	NcActions: { template: '<div class="actions" v-bind="$attrs"><slot /></div>' },
	NcActionButton: { emits: ['click'], template: '<button class="action" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
	NcTextField: true,
	NcSelect: true,
}

const SET = {
	id: 'set-1',
	case: 'case-9',
	items: [
		{ fileName: 'besluit.pdf', classification: 'openbaar', sha256: 'aa11', deliveredRef: 'f1', originalRef: 'f1' },
		{ fileName: 'advies.pdf', classification: 'deels_openbaar', sha256: 'bb22', deliveredRef: 'f2-redacted', originalRef: 'f2' },
		{ fileName: 'bijlage.pdf', classification: 'geheim', sha256: 'cc33', deliveredRef: '', originalRef: 'f3' },
	],
}

const CONTENT = {
	field: 'items',
	variant: 'table',
	readOnly: true,
	emptyText: 'This set has no items.',
	columns: [
		{ header: 'File name', path: 'fileName' },
		{ header: 'Classification', path: 'classification', map: { openbaar: 'Public', deels_openbaar: 'Disclosed in part' } },
		{ header: 'SHA-256', path: 'sha256', code: true },
	],
	rowActions: [{
		id: 'compare',
		label: 'Compare',
		ariaLabel: 'Compare {fileName} with the original',
		placement: 'inline',
		dialog: 'DocumentCompareDialog',
		props: { filesUrl: '/apps/dossiq/api/cases/@object.case/woo/delivered-sets/@objectId/items/@index' },
		when: { deliveredRef: { set: true, neq: '@originalRef' } },
	}],
}

/**
 * @param {object} [content] The widget content.
 * @param {object} [object] The set.
 * @param {Function} [open] The modal opener.
 * @return {object} The wrapper.
 */
function make(content = CONTENT, object = SET, open = jest.fn()) {
	return mount(CnFieldListWidget, {
		props: { content, objectData: object, objectId: 'set-1' },
		global: { stubs, provide: { cnOpenModal: open, cnTranslate: (k) => ({ Public: 'Openbaar' })[k] ?? k } },
	})
}

describe('CnFieldListWidget dialog row actions', () => {
	it('draws a read-only table with the columns, a mapped label and a code cell', () => {
		const wrapper = make()
		const headers = wrapper.findAll('thead th')

		expect(headers.map((th) => th.text())).toEqual(['File name', 'Classification', 'SHA-256', 'Actions'])
		expect(headers.every((th) => th.attributes('scope') === 'col')).toBe(true)
		expect(wrapper.find('[data-testid="cn-field-list-row-item-0"]').text()).toContain('Openbaar')
		expect(wrapper.find('[data-testid="cn-field-list-row-item-2"]').text()).toContain('geheim')
		expect(wrapper.find('[data-testid="cn-field-list-row-item-1"] code').text()).toBe('bb22')
		expect(wrapper.find('[data-testid="cn-field-list-open-add"]').exists()).toBe(false)
	})

	it('offers Compare only where the file that went out is not the original', () => {
		const wrapper = make()

		expect(wrapper.find('[data-testid="cn-field-list-action-compare-item-0"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-field-list-action-compare-item-1"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-field-list-action-compare-item-2"]').exists()).toBe(false)
	})

	it('names the button after its row', () => {
		const button = make().find('[data-testid="cn-field-list-action-compare-item-1"]')

		expect(button.attributes('aria-label')).toBe('Compare advies.pdf with the original')
		expect(button.text()).toBe('Compare')
	})

	it('opens the registered dialog with its props filled from the object and the row', async () => {
		const open = jest.fn()
		const wrapper = make(CONTENT, SET, open)
		await wrapper.find('[data-testid="cn-field-list-action-compare-item-1"]').trigger('click')

		expect(open).toHaveBeenCalledWith('DocumentCompareDialog', { filesUrl: '/index.php/apps/dossiq/api/cases/case-9/woo/delivered-sets/set-1/items/1' })
	})

	it('offers no dialog whose props cannot be filled', () => {
		const wrapper = make(CONTENT, { ...SET, case: '' })

		expect(wrapper.find('[data-testid="cn-field-list-action-compare-item-1"]').exists()).toBe(false)
	})

	it('keeps request actions out of a read-only list', () => {
		const content = { ...CONTENT, rowActions: [{ id: 'redo', label: 'Redo', request: { url: '/apps/x' } }] }

		expect(make(content).find('[data-testid="cn-field-list-menu-item-0"]').exists()).toBe(false)
	})

	it('says the set is empty', () => {
		expect(make(CONTENT, { ...SET, items: [] }).find('[data-testid="cn-field-list-empty"]').text()).toBe('This set has no items.')
	})
})
