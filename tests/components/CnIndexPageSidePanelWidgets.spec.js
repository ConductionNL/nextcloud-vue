/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten's side panel: the applied saved search with its count and
 * an alert above a threshold, and "Uw exports", the reader's own exports with
 * a Download button. Both are built-in widgets an index page's `sidePanel`
 * can name (`saved-view-alert`, `exports`); the alert reads the page through
 * the `cnIndexList` the page provides and stores OpenRegister's view alert.
 */
const mockPatch = jest.fn()
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), patch: (...a) => mockPatch(...a) } }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'pieter', isAdmin: false }) }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url) => `/index.php${url}`,
	generateRemoteUrl: (path) => `/remote.php/${path}`,
}))

const { flushPromises, mount } = require('@vue/test-utils')
const CnSavedViewAlertWidget = require('../../src/components/CnSavedViewAlertWidget/CnSavedViewAlertWidget.vue').default
const CnExportsWidget = require('../../src/components/CnExportsWidget/CnExportsWidget.vue').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const { BUILT_IN_WIDGETS } = require('../../src/components/CnWidgetGrid/builtInWidgets.js')

const VIEW = { id: 7, uuid: 'v-7', name: 'Meldingen verlichting', owner: 'pieter', alert: null }

/**
 * Mount the alert widget over a page context.
 *
 * @param {object} list The `cnIndexList` the page would provide.
 * @param {object} content The widget content.
 * @return {object} The wrapper.
 */
function mountAlert(list, content = { noun: { one: 'zaak', other: 'zaken' } }) {
	return mount(CnSavedViewAlertWidget, {
		props: { content },
		global: {
			provide: { cnIndexList: list },
			stubs: {
				NcCheckboxRadioSwitch: { name: 'NcCheckboxRadioSwitch', props: ['modelValue', 'disabled'], emits: ['update:modelValue'], template: '<button class="switch" :data-on="String(modelValue)" @click="$emit(\'update:modelValue\', !modelValue)"><slot /></button>' },
				NcTextField: { name: 'NcTextField', props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input class="threshold" :value="modelValue">' },
			},
		},
	})
}

beforeEach(() => {
	mockPatch.mockReset()
	mockGet.mockReset()
})

describe('saved-view-alert widget', () => {
	it('is a built-in widget type, as is exports', () => {
		expect(BUILT_IN_WIDGETS['saved-view-alert']).toBe(CnSavedViewAlertWidget)
		expect(BUILT_IN_WIDGETS.exports).toBe(CnExportsWidget)
	})

	it('says what to do while no saved view is applied', () => {
		const w = mountAlert({ appliedView: null, total: 9 })
		expect(w.find('[data-testid="cn-saved-view-alert-empty"]').exists()).toBe(true)
	})

	it('shows the view\'s name and the count now, with the alert off', () => {
		const w = mountAlert({ appliedView: VIEW, total: 9 })
		expect(w.find('[data-testid="cn-saved-view-alert-name"]').text()).toBe('Meldingen verlichting')
		expect(w.find('[data-testid="cn-saved-view-alert-count"]').text()).toBe('9 zaken')
		expect(w.find('.switch').attributes('data-on')).toBe('false')
		expect(w.find('[data-testid="cn-saved-view-alert-threshold"]').exists()).toBe(false)
	})

	it('switching on stores OpenRegister\'s alert for the reader and hands the view back', async () => {
		const saved = { ...VIEW, alert: { operator: 'gte', threshold: 10, recipients: ['pieter'] } }
		mockPatch.mockResolvedValue({ data: { view: saved } })
		const replaceSavedView = jest.fn()
		const w = mountAlert({ appliedView: VIEW, total: 9, replaceSavedView })
		await w.find('.switch').trigger('click')
		await flushPromises()
		expect(mockPatch).toHaveBeenCalledWith('/index.php/apps/openregister/api/views/v-7', { alert: { operator: 'gte', threshold: 10, recipients: ['pieter'] } })
		expect(replaceSavedView).toHaveBeenCalledWith(saved)
	})

	it('shows the threshold of a view with an alert, saves a new one, and switching off clears it', async () => {
		mockPatch.mockResolvedValue({ data: { view: VIEW } })
		const view = { ...VIEW, alert: { operator: 'gte', threshold: 12, recipients: ['pieter'] } }
		const w = mountAlert({ appliedView: view, total: 9, replaceSavedView: jest.fn() })
		expect(w.find('.switch').attributes('data-on')).toBe('true')
		expect(w.text()).toContain('12 or more')
		await w.findComponent({ name: 'NcTextField' }).vm.$emit('update:modelValue', '15')
		await flushPromises()
		expect(mockPatch).toHaveBeenLastCalledWith('/index.php/apps/openregister/api/views/v-7', { alert: { operator: 'gte', threshold: 15, recipients: ['pieter'] } })
		await w.find('.switch').trigger('click')
		await flushPromises()
		expect(mockPatch).toHaveBeenLastCalledWith('/index.php/apps/openregister/api/views/v-7', { alert: null })
	})

	it('shows the server\'s reason when the alert cannot be saved', async () => {
		mockPatch.mockRejectedValue({ response: { data: { error: 'alert.recipients: name at least one recipient' } } })
		const w = mountAlert({ appliedView: VIEW, total: 9 })
		await w.find('.switch').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-saved-view-alert-error"]').text()).toContain('recipient')
	})

	it('cannot be changed by someone who does not own the view', () => {
		const w = mountAlert({ appliedView: { ...VIEW, owner: 'anouk' }, total: 9 })
		expect(w.findComponent({ name: 'NcCheckboxRadioSwitch' }).props('disabled')).toBe(true)
	})
})

describe('exports widget', () => {
	const today = new Date()
	const inAWeek = new Date(today.getTime() + 7 * 864e5)

	it('lists the reader\'s exports, newest first, with a Download link, and Expires today on the last day', async () => {
		mockGet.mockResolvedValue({
			data: {
				results: [
					{ id: 1, uuid: 'r1', filename: 'woo-2026-q3.csv', fileId: 11, filePath: '/Exports/woo-2026-q3.csv', downloadCount: 1, producedAt: '2026-10-01T10:00:00Z', expiresAt: today.toISOString() },
					{ id: 2, uuid: 'r2', filename: 'zaken-verlichting.xlsx', fileId: 12, filePath: '/Exports/zaken verlichting.xlsx', downloadCount: 3, producedAt: '2026-10-07T10:00:00Z', expiresAt: inAWeek.toISOString() },
					{ id: 3, uuid: 'r3', filename: 'swept.csv', fileId: null, producedAt: '2026-09-01T10:00:00Z' },
				],
			},
		})
		const w = mount(CnExportsWidget, { props: { content: { register: 'dossiq', schema: 'case' } }, global: { stubs: { NcButton: { name: 'NcButton', props: ['href'], template: '<a class="download" :href="href"><slot /></a>' } } } })
		await flushPromises()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/exports', { params: { actor: 'pieter', limit: 10, register: 'dossiq', schema: 'case' } })
		const rows = w.findAll('[data-testid="cn-exports-row"]')
		expect(rows.map((row) => row.find('.cn-exports-widget__name').text())).toEqual(['zaken-verlichting.xlsx', 'woo-2026-q3.csv'])
		expect(rows[0].text()).toContain('downloaded 3 times')
		expect(rows[0].find('.download').attributes('href')).toBe('/remote.php/dav/files/pieter/Exports/zaken%20verlichting.xlsx')
		expect(rows[1].find('[data-testid="cn-exports-expires-today"]').exists()).toBe(true)
	})

	it('says so when there are none, and when they cannot be read', async () => {
		mockGet.mockResolvedValueOnce({ data: { results: [] } })
		const empty = mount(CnExportsWidget, { props: { content: {} } })
		await flushPromises()
		expect(empty.find('[data-testid="cn-exports-empty"]').exists()).toBe(true)
		mockGet.mockRejectedValueOnce(new Error('403'))
		const failed = mount(CnExportsWidget, { props: { content: {} } })
		await flushPromises()
		expect(failed.find('[data-testid="cn-exports-error"]').exists()).toBe(true)
	})
})

describe('CnIndexPage list context', () => {
	it('finds the applied saved view by id, slug or uuid', () => {
		const views = [{ id: 7, uuid: 'v-7', slug: 'verlichting' }, { id: 8 }]
		const find = (id) => CnIndexPage.computed.appliedSavedView.call({ appliedSavedViewId: id, savedViews: views })
		expect(find('7')).toBe(views[0])
		expect(find('verlichting')).toBe(views[0])
		expect(find('')).toBeNull()
	})

	it('puts a changed view back in the list', () => {
		const ctx = { savedViews: [{ id: 7, alert: null }, { id: 8 }] }
		CnIndexPage.methods.replaceSavedView.call(ctx, { id: 7, alert: { threshold: 12 } })
		expect(ctx.savedViews[0].alert).toEqual({ threshold: 12 })
		expect(ctx.savedViews[1]).toEqual({ id: 8 })
	})
})
