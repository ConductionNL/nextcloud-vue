/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnVersionHistory — object version-history list and
 * field-by-field diff viewer. Asserts fetch wiring, empty/loaded
 * states, single-entry and two-entry-compare diffs, the changed-only
 * default with "Show all fields" toggle, and add/remove/change tint
 * classes on nested JSON lines.
 */

const { mount } = require('@vue/test-utils')
const CnVersionHistory = require('../../src/components/CnVersionHistory/CnVersionHistory.vue').default

// `@nextcloud/vue` is globally mocked to dumb `<div class="stub ...">`
// placeholders (see `tests/__mocks__/nextcloud-vue.js`); swap in real
// interactive elements locally, mirroring the pattern used across the
// suite (e.g. `tests/components/CnPropertyValueCell.spec.js`).
const stubs = {
	NcButton: { template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>', props: ['disabled', 'variant'] },
	// Contract note: `@nextcloud/vue` 9 (Vue 3) renamed this component's
	// `checked` prop / `update:checked` event to the standard `modelValue` /
	// `update:modelValue` pair. A stub still speaking the v8 names binds
	// nothing and emits an event no caller listens for, so the toggle looks
	// wired but is dead.
	NcCheckboxRadioSwitch: {
		template: '<input type="checkbox" class="nc-switch" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
	},
}

function mockFetchOnce(payload, ok = true) {
	global.fetch = jest.fn().mockResolvedValueOnce({ ok, json: () => Promise.resolve(payload) })
}

function mountHistory(propsData) {
	return mount(CnVersionHistory, { propsData, stubs })
}

async function flush(wrapper) {
	await wrapper.vm.$nextTick()
	await wrapper.vm.$nextTick()
}

describe('CnVersionHistory — history list', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no entries', async () => {
		mockFetchOnce({ results: [], total: 0 })
		const wrapper = mountHistory({ register: 'r1', schema: 's1', objectId: 'o1' })
		await flush(wrapper)
		expect(wrapper.text()).toContain('No version history yet')
		wrapper.unmount()
	})

	it('renders entries newest-first with version/action/user and shows load-more when total exceeds the page', async () => {
		mockFetchOnce({
			results: [
				{ id: '2', version: '1.1.0', action: 'update', userName: 'bob', created: '2026-01-02T10:00:00Z', changed: {} },
				{ id: '1', version: '1.0.0', action: 'create', userName: 'alice', created: '2026-01-01T10:00:00Z', changed: {} },
			],
			total: 5,
		})
		const wrapper = mountHistory({ register: 'r1', schema: 's1', objectId: 'o1', pageSize: 2 })
		await flush(wrapper)
		const rows = wrapper.findAll('.cn-version-history__row')
		expect(rows).toHaveLength(2)
		expect(rows.at(0).text()).toContain('1.1.0')
		expect(rows.at(0).text()).toContain('bob')
		expect(wrapper.text()).toContain('Load more')
		wrapper.unmount()
	})

	it('fetches against the OpenRegister audit-trails endpoint with the expected pagination params', async () => {
		mockFetchOnce({ results: [], total: 0 })
		mountHistory({ register: 'r1', schema: 's1', objectId: 'o1' })
		await Promise.resolve()
		const calledUrl = global.fetch.mock.calls[0][0]
		expect(calledUrl).toContain('/objects/r1/s1/o1/audit-trails')
		expect(calledUrl).toContain('_page=1')
		expect(calledUrl).toContain('_sort%5Bcreated%5D=DESC')
	})
})

describe('CnVersionHistory — single-entry diff', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('opens a changed-fields-only diff table when a row is clicked', async () => {
		mockFetchOnce({
			results: [
				{
					id: '1',
					version: '1.1.0',
					action: 'update',
					created: '2026-01-01T10:00:00Z',
					changed: {
						name: { old: 'Acme', new: 'Acme B.V.' },
						email: { old: 'x@y.nl', new: null },
					},
				},
			],
			total: 1,
		})
		const wrapper = mountHistory({ register: 'r1', schema: 's1', objectId: 'o1' })
		await flush(wrapper)
		await wrapper.find('.cn-version-history__row-main').trigger('click')
		await flush(wrapper)

		const fieldCells = wrapper.findAll('.cn-version-history__diff-field')
		expect(fieldCells).toHaveLength(2)
		expect(wrapper.text()).toContain('name')
		expect(wrapper.text()).toContain('Acme')
		expect(wrapper.text()).toContain('Acme B.V.')
		expect(wrapper.text()).toContain('email')
		wrapper.unmount()
	})

	it('shows the no-changes label when the entry has no changed fields', async () => {
		mockFetchOnce({
			results: [{ id: '1', version: '1.0.0', action: 'create', created: '2026-01-01T10:00:00Z', changed: {} }],
			total: 1,
		})
		const wrapper = mountHistory({ register: 'r1', schema: 's1', objectId: 'o1' })
		await flush(wrapper)
		await wrapper.find('.cn-version-history__row-main').trigger('click')
		await flush(wrapper)
		expect(wrapper.text()).toContain('No field changes to show')
		wrapper.unmount()
	})

	it('the "Show all fields" toggle reveals unchanged nested rows', async () => {
		mockFetchOnce({
			results: [
				{
					id: '1',
					version: '1.1.0',
					action: 'update',
					created: '2026-01-01T10:00:00Z',
					changed: {
						address: {
							old: { street: 'Main St', city: 'Utrecht' },
							new: { street: 'Elm St', city: 'Utrecht' },
						},
					},
				},
			],
			total: 1,
		})
		const wrapper = mountHistory({ register: 'r1', schema: 's1', objectId: 'o1' })
		await flush(wrapper)
		await wrapper.find('.cn-version-history__row-main').trigger('click')
		await flush(wrapper)

		// Default: only the changed "street" line is visible, not the unchanged "city" line.
		expect(wrapper.text()).toContain('street')
		expect(wrapper.text()).not.toContain('city')

		const toggle = wrapper.find('.cn-version-history__diff-toolbar .nc-switch')
		await toggle.setChecked(true)
		await flush(wrapper)

		expect(wrapper.text()).toContain('city')
		wrapper.unmount()
	})

	it('applies add/remove/change tint classes to nested JSON lines', async () => {
		mockFetchOnce({
			results: [
				{
					id: '1',
					version: '1.1.0',
					action: 'update',
					created: '2026-01-01T10:00:00Z',
					changed: {
						address: {
							old: { street: 'Main St', city: 'Utrecht' },
							new: { street: 'Elm St', city: 'Utrecht', country: 'NL' },
						},
					},
				},
			],
			total: 1,
		})
		const wrapper = mountHistory({ register: 'r1', schema: 's1', objectId: 'o1' })
		await flush(wrapper)
		await wrapper.find('.cn-version-history__row-main').trigger('click')
		await flush(wrapper)

		expect(wrapper.find('.cn-version-history__diff-line--changed').exists()).toBe(true)
		expect(wrapper.find('.cn-version-history__diff-line--added').exists()).toBe(true)
		wrapper.unmount()
	})

	it('closing the diff returns to the list', async () => {
		mockFetchOnce({
			results: [{ id: '1', version: '1.0.0', action: 'create', created: '2026-01-01T10:00:00Z', changed: { a: { old: 1, new: 2 } } }],
			total: 1,
		})
		const wrapper = mountHistory({ register: 'r1', schema: 's1', objectId: 'o1' })
		await flush(wrapper)
		await wrapper.find('.cn-version-history__row-main').trigger('click')
		await flush(wrapper)
		expect(wrapper.find('.cn-version-history__diff-table').exists()).toBe(true)

		const backButtons = wrapper.findAll('button').filter((b) => b.text() === 'Back to history')
		await backButtons.at(0).trigger('click')
		await flush(wrapper)
		expect(wrapper.find('.cn-version-history__diff-table').exists()).toBe(false)
		expect(wrapper.find('.cn-version-history__rows').exists()).toBe(true)
		wrapper.unmount()
	})
})

describe('CnVersionHistory — two-entry compare', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('folds the range between two checked entries and diffs the folded state', async () => {
		mockFetchOnce({
			results: [
				{ id: '2', version: '1.2.0', action: 'update', created: '2026-01-02T10:00:00Z', changed: { status: { old: 'review', new: 'published' } } },
				{ id: '1', version: '1.1.0', action: 'update', created: '2026-01-01T10:00:00Z', changed: { status: { old: 'draft', new: 'review' } } },
			],
			total: 2,
		})
		const wrapper = mountHistory({ register: 'r1', schema: 's1', objectId: 'o1' })
		await flush(wrapper)

		const checkboxes = wrapper.findAll('.cn-version-history__row .nc-switch')
		expect(checkboxes).toHaveLength(2)
		await checkboxes.at(0).setChecked(true)
		await checkboxes.at(1).setChecked(true)
		await flush(wrapper)

		const compareButton = wrapper.findAll('button').filter((b) => b.text().includes('Compare selected')).at(0)
		expect(compareButton.attributes('disabled')).toBeUndefined()
		await compareButton.trigger('click')
		await flush(wrapper)

		expect(wrapper.text()).toContain('status')
		expect(wrapper.text()).toContain('draft')
		expect(wrapper.text()).toContain('published')
		// The intermediate "review" value should not leak into the folded diff.
		const cells = wrapper.findAll('.cn-version-history__diff-value')
		const cellTexts = cells.map((c) => c.text())
		expect(cellTexts).not.toContain('review')
		wrapper.unmount()
	})

	it('the compare button is disabled until exactly two entries are checked', async () => {
		mockFetchOnce({
			results: [
				{ id: '2', version: '1.2.0', action: 'update', created: '2026-01-02T10:00:00Z', changed: {} },
				{ id: '1', version: '1.1.0', action: 'update', created: '2026-01-01T10:00:00Z', changed: {} },
			],
			total: 2,
		})
		const wrapper = mountHistory({ register: 'r1', schema: 's1', objectId: 'o1' })
		await flush(wrapper)

		const compareButton = () => wrapper.findAll('button').filter((b) => b.text().includes('Compare selected')).at(0)
		expect(compareButton().attributes('disabled')).toBeDefined()

		const checkboxes = wrapper.findAll('.cn-version-history__row .nc-switch')
		await checkboxes.at(0).setChecked(true)
		await flush(wrapper)
		expect(compareButton().attributes('disabled')).toBeDefined()
		wrapper.unmount()
	})
})
