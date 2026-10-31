/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldGroupsWidget, the `field-groups` widget: several list fields of the
 * record in one card (board PqKlant Contactkanalen: e-mail, phone, social),
 * each a field list in the pairs look, with one "Add" menu in the card's
 * title row that opens the chosen list's form.
 *
 * @spec openspec/changes/contact-side-cards-generic/specs/contact-side-cards-generic/spec.md#requirement-several-list-fields-share-one-card-and-one-add-menu
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), patch: jest.fn(), post: jest.fn() },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

const { mount } = require('@vue/test-utils')
const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
const { DASHBOARD_CATALOG_WIDGET_KEYS } = require('../../src/utils/libraryWidgetKeys.js')
const { isContentOnlyWidgetDef } = require('../../src/utils/widgetDispatch.js')

require('../../src/components/CnFieldGroupsWidget/index.js')

const CnFieldGroupsWidget = require('../../src/components/CnFieldGroupsWidget/CnFieldGroupsWidget.vue').default

const CHANNELS = {
	add: { label: 'Add', ariaLabel: 'Add channel', placement: 'title' },
	groups: [
		{
			field: 'emails',
			row: { label: ['Email', { path: 'kind', map: { private: 'private' } }], title: 'value' },
			add: { label: 'Email address', fields: [{ key: 'value', label: 'Email address', required: true }] },
		},
		{
			field: 'phones',
			row: { label: ['Phone'], title: 'value' },
			add: { label: 'Phone number', fields: [{ key: 'value', label: 'Phone number', required: true }] },
		},
		{
			field: 'socialProfiles',
			row: { label: [{ path: 'network', map: { linkedin: 'LinkedIn' } }], title: 'handle' },
			add: { label: 'Social profile', fields: [{ key: 'handle', label: 'Handle' }] },
			emptyLabel: 'Social',
			emptyText: 'None yet',
		},
	],
}

const client = {
	id: 'k-1',
	emails: [{ kind: 'private', value: 's.devries@example.nl' }],
	phones: [{ value: '06 12 34 56 78' }],
	socialProfiles: [],
}

/**
 * Mount the widget.
 *
 * @param {object} content The content.
 * @return {object} The wrapper.
 */
function mountGroups(content = CHANNELS) {
	return mount(CnFieldGroupsWidget, {
		props: { content, objectData: client, objectId: 'k-1', register: 'pipelinq', schema: 'client' },
		global: {
			provide: { cnTranslate: (key) => key },
			stubs: {
				NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				NcActions: { template: '<div class="actions-stub"><slot /></div>' },
				NcActionButton: { template: '<button class="action-stub" @click="$emit(\'click\')"><slot /></button>' },
				NcNoteCard: true,
				NcCheckboxRadioSwitch: true,
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

describe('CnFieldGroupsWidget', () => {
	it('registers as a renderer-only, content-only detail type in the library vocabulary', () => {
		const entry = getWidgetTypeEntry('field-groups')
		expect(entry.renderer).toBe(CnFieldGroupsWidget)
		expect(entry.form).toBeNull()
		expect(isContentOnlyWidgetDef({ type: 'field-groups' })).toBe(true)
		expect(DASHBOARD_CATALOG_WIDGET_KEYS).toContain('field-groups')
	})

	it('draws every group as label and value pairs, in order, the empty one as its label', () => {
		const w = mountGroups()
		const labels = w.findAll('dt').map((dt) => dt.text())
		expect(labels).toEqual(['Email, private', 'Phone', 'Social'])
		expect(w.findAll('dd').map((dd) => dd.text())).toEqual(['s.devries@example.nl', '06 12 34 56 78', 'None yet'])
	})

	it('reports one Add menu for the title row with an item per group', async () => {
		const w = mountGroups()
		await w.vm.$nextTick()
		const header = lastHeader(w)
		expect(header.actions).toHaveLength(1)
		expect(header.actions[0]).toMatchObject({ label: 'Add', ariaLabel: 'Add channel', icon: 'Plus', variant: 'secondary' })
		expect(header.actions[0].items.map((item) => item.label)).toEqual(['Email address', 'Phone number', 'Social profile'])
		expect(w.find('[data-testid="cn-field-list-open-add"]').exists()).toBe(false)
	})

	it('opens the chosen group\'s form from its menu item', async () => {
		const w = mountGroups()
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-field-list-add"]').exists()).toBe(false)
		lastHeader(w).actions[0].items[1].run()
		await w.vm.$nextTick()
		const forms = w.findAll('[data-testid="cn-field-list-add"]')
		expect(forms).toHaveLength(1)
		expect(forms[0].text()).toContain('Phone number')
	})

	it('draws an Add menu under the groups without a title placement', async () => {
		const w = mountGroups({ ...CHANNELS, add: { label: 'Add channel' } })
		await w.vm.$nextTick()
		const header = lastHeader(w)
		expect(header === null || header.actions.length === 0).toBe(true)
		const menu = w.find('[data-testid="cn-field-groups-add"]')
		expect(menu.exists()).toBe(true)
		expect(menu.findAll('.action-stub').map((b) => b.text())).toEqual(['Email address', 'Phone number', 'Social profile'])
	})

	it('reports no add on a read-only card', async () => {
		const w = mountGroups({ ...CHANNELS, readOnly: true })
		await w.vm.$nextTick()
		const header = lastHeader(w)
		expect(header === null || header.actions.length === 0).toBe(true)
		expect(w.find('[data-testid="cn-field-groups-add"]').exists()).toBe(false)
	})

	it('passes the shared afterSave to every group', () => {
		const w = mountGroups({ ...CHANNELS, afterSave: { url: '/apps/pipelinq/api/contacts-sync/write-back' } })
		const lists = w.findAllComponents({ name: 'CnFieldListWidget' })
		expect(lists).toHaveLength(3)
		for (const list of lists) {
			expect(list.props('content').afterSave).toEqual({ url: '/apps/pipelinq/api/contacts-sync/write-back' })
			expect(list.props('content').variant).toBe('pairs')
		}
	})
})
