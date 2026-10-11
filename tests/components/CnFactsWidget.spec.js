/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFactsWidget — the `facts` widget (abstract-facts-widget).
 *
 * What is guarded: configured fields of the CURRENT object or of a SOURCE
 * object render as rows / title / line / pill / link; an empty value drops
 * its entry; a source id token that does not resolve sends NO request; labels
 * go through the host translate; and the widget is a content-only catalog
 * type, so a detail page gives it the titled card.
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnFactsWidget/index.js'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Mount the widget with a translate that marks every translated string.
 *
 * @param {object} propsData The props.
 * @param {object} [provide] Extra provides.
 * @return {object} The wrapper.
 */
function mountFacts(propsData, provide = {}) {
	return mount(CnFactsWidget, {
		propsData,
		provide: { cnTranslate: (key) => `T(${key})`, ...provide },
		stubs: {
			NcLoadingIcon: true,
			RouterLink: {
				props: ['to'],
				template: '<a class="stub-link" :data-to="JSON.stringify(to)"><slot /></a>',
			},
		},
	})
}

const portal = {
	id: 'p-1',
	title: 'Gemeente Zuiddrecht',
	domains: [{ hostname: 'zuiddrecht.nl' }, { hostname: 'www.zuiddrecht.nl' }],
	locales: ['nl'],
	status: 'published',
	theme: '',
	'@self': { updated: '2025-02-14T10:00:00Z' },
}

describe('CnFactsWidget', () => {
	beforeEach(() => {
		mockGet.mockReset()
	})

	it('registers as a renderer-only, content-only catalog type', () => {
		const entry = getWidgetTypeEntry('facts')
		expect(entry).toBeTruthy()
		expect(entry.renderer).toBe(CnFactsWidget)
		expect(entry.form).toBeNull()
		expect(isContentOnlyWidgetDef({ type: 'facts' })).toBe(true)
	})

	it('renders label/value rows of the current object, one list for consecutive rows', () => {
		const w = mountFacts({
			objectData: portal,
			content: {
				fields: [
					{ path: 'domains', label: 'Domain', format: 'list', itemPath: 'hostname' },
					{ path: 'locales', label: 'Language' },
					{ path: '@self.updated', label: 'Last changed', format: 'date-long' },
				],
			},
		})
		expect(w.findAll('dl').length).toBe(1)
		const rows = w.findAll('.cn-facts-widget__row')
		expect(rows.length).toBe(3)
		expect(rows.at(0).find('dt').text()).toBe('T(Domain)')
		expect(rows.at(0).find('dd').text()).toBe('zuiddrecht.nl, www.zuiddrecht.nl')
		expect(rows.at(1).find('dd').text()).toBe('nl')
		expect(rows.at(2).find('dd').text()).toMatch(/14/)
		expect(rows.at(2).find('dd').text()).toMatch(/2025/)
	})

	it('drops an entry whose value is empty, and shows the empty text when nothing is left', () => {
		const w = mountFacts({
			objectData: portal,
			content: { fields: [{ path: 'theme', label: 'Theme' }], emptyText: 'No theme yet' },
		})
		expect(w.find('.cn-facts-widget__row').exists()).toBe(false)
		expect(w.find('[data-testid="cn-facts-empty"]').text()).toBe('T(No theme yet)')
	})

	it('keeps an empty entry when hideEmpty is false', () => {
		const w = mountFacts({
			objectData: portal,
			content: { hideEmpty: false, fields: [{ path: 'theme', label: 'Theme' }] },
		})
		expect(w.findAll('.cn-facts-widget__row').length).toBe(1)
	})

	it('maps a raw value to a translated label, and draws a pill in the mapped variant', () => {
		const w = mountFacts({
			objectData: portal,
			content: {
				fields: [
					{ as: 'pill', path: 'status', map: { published: 'Published' }, variantMap: { published: 'success' } },
					{ path: 'status', label: 'Status', map: { published: 'Published' } },
				],
			},
		})
		const pill = w.findComponent({ name: 'CnStatusBadge' })
		expect(pill.props('label')).toBe('T(Published)')
		expect(pill.props('variant')).toBe('success')
		expect(w.find('dd').text()).toBe('T(Published)')
	})

	it('ignores a pill variant that is not a badge variant', () => {
		const w = mountFacts({
			objectData: portal,
			content: { fields: [{ as: 'pill', path: 'status', variant: 'neon' }] },
		})
		expect(w.findComponent({ name: 'CnStatusBadge' }).props('variant')).toBe('default')
	})

	it('joins line parts with a separator, prefixing labelled parts and dropping empty ones', () => {
		const w = mountFacts({
			objectData: { identifier: '2026-0074', type: 'Bezwaar', requester: '', owner: 'Pieter Jansen' },
			content: {
				fields: [
					{ as: 'line', parts: ['identifier', 'type', 'requester'] },
					{ as: 'line', parts: [{ path: 'owner', label: 'Behandelaar' }] },
				],
			},
		})
		const lines = w.findAll('.cn-facts-widget__line')
		expect(lines.at(0).text()).toBe('2026-0074 · Bezwaar')
		expect(lines.at(1).text()).toBe('T(Behandelaar) Pieter Jansen')
	})

	it('reads a source object by register, schema and an @object token, and links with @source tokens', async () => {
		mockGet.mockResolvedValue({ data: { id: 'c-9', title: 'Bezwaar parkeerboete', status: 'open' } })
		const w = mountFacts({
			objectData: { id: 't-1', case: 'c-9' },
			content: {
				source: { register: 'dossiq', schema: 'case', id: '@object.case' },
				fields: [
					{ as: 'title', path: 'title', route: { name: 'CaseDetail', params: { id: '@source.id' } } },
				],
				link: { label: 'Open the case', route: { name: 'CaseDetail', params: { id: '@source.id' } } },
			},
		})
		await flush()
		await w.vm.$nextTick()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/dossiq/case/c-9')
		const title = w.find('[data-testid="cn-fact-title"]')
		expect(title.text()).toBe('Bezwaar parkeerboete')
		expect(JSON.parse(title.attributes('data-to'))).toEqual({ name: 'CaseDetail', params: { id: 'c-9' } })
		expect(w.find('[data-testid="cn-facts-link"]').text()).toBe('T(Open the case)')
	})

	it('sends no request while the source id token does not resolve', async () => {
		const w = mountFacts({
			objectData: { id: 't-1' },
			content: {
				source: { register: 'dossiq', schema: 'case', id: '@object.case' },
				fields: [{ path: 'title', label: 'Case' }],
				emptyText: 'No case',
			},
		})
		await flush()
		expect(mockGet).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-facts-empty"]').exists()).toBe(true)
	})

	it('reads a url source with the @objectId token', async () => {
		mockGet.mockResolvedValue({ data: { owner: 'Anouk' } })
		mountFacts({
			objectId: 'x-1',
			objectData: { id: 'x-1' },
			content: { source: { url: '/apps/demo/api/summary/@objectId' }, fields: [{ path: 'owner', label: 'Owner' }] },
		})
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/demo/api/summary/x-1')
	})

	it('says so in one quiet line when the source read fails', async () => {
		mockGet.mockRejectedValue(new Error('500'))
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const w = mountFacts({
			objectData: { id: 't-1', case: 'c-9' },
			content: { source: { register: 'dossiq', schema: 'case', id: '@object.case' }, fields: [{ path: 'title', label: 'Case' }] },
		})
		await flush()
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-facts-error"]').exists()).toBe(true)
		warn.mockRestore()
	})

	it('drops the link when a route token does not resolve', () => {
		const w = mountFacts({
			objectData: { title: 'No id here' },
			content: {
				fields: [{ path: 'title', label: 'Title' }],
				link: { label: 'Open', route: { name: 'X', params: { id: '@source.id' } } },
			},
		})
		expect(w.find('[data-testid="cn-facts-link"]').exists()).toBe(false)
	})
})
