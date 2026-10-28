const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIndexListWidget: a list page's list inside a detail page, filtered on the
 * record, with the list's own toolbar and without touching the address.
 *
 * @spec openspec/changes/index-list-widget/specs/index-list-widget/spec.md
 */
const fs = require('fs')
const path = require('path')

jest.mock('../../src/components/CnIndexPage/CnIndexPage.vue', () => ({
	__esModule: true,
	default: {
		name: 'CnIndexPage',
		props: ['register', 'schema', 'filter', 'title', 'showTitle', 'routeState', 'columns', 'lenses', 'viewModes', 'selectable', 'emptyText'],
		template: '<div class="index-stub" />',
	},
}))

const CnIndexListWidget = require('../../src/components/CnIndexListWidget/CnIndexListWidget.vue').default
const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
require('../../src/components/CnIndexListWidget/index.js')

const CONTENT = {
	title: 'Registrations',
	register: 'pipelinq',
	schema: 'eventRegistration',
	filter: { event: '@objectId', street: '@object.street' },
	columns: ['name', 'address', 'status'],
	lenses: [{ label: 'All', filter: {} }, { label: 'Confirmed', filter: { status: 'confirmed' } }],
	viewModes: ['table', 'cards'],
	selectable: true,
	notAnIndexProp: 'dropped',
}

function mountWith(props) {
	return mount(CnIndexListWidget, { props: { content: CONTENT, ...props } })
}

describe('CnIndexListWidget', () => {
	it('is registered as the `index-list` widget type on the detail page', () => {
		const entry = getWidgetTypeEntry('index-list')
		expect(entry.renderer).toBe(CnIndexListWidget)
		expect(entry.surfaces).toContain('detail-page')
	})

	it('lists the other schema filtered on this record, with the page\'s toolbar keys', () => {
		const page = mountWith({ objectId: 'e1', objectData: { street: 'Lindelaan' } }).findComponent({ name: 'CnIndexPage' })
		expect(page.props('register')).toBe('pipelinq')
		expect(page.props('schema')).toBe('eventRegistration')
		expect(page.props('filter')).toEqual({ event: 'e1', street: 'Lindelaan' })
		expect(page.props('lenses')).toEqual(CONTENT.lenses)
		expect(page.props('viewModes')).toEqual(['table', 'cards'])
		expect(page.props('selectable')).toBe(true)
		expect(page.props('title')).toBe('Registrations')
		expect(page.props('showTitle')).toBe(false)
	})

	it('leaves the address to the detail page', () => {
		const page = mountWith({ objectId: 'e1', objectData: { street: 'Lindelaan' } }).findComponent({ name: 'CnIndexPage' })
		expect(page.props('routeState')).toBe(false)
	})

	it('waits for the record before it lists anything', () => {
		expect(mountWith({ objectId: '', objectData: null }).findComponent({ name: 'CnIndexPage' }).exists()).toBe(false)
	})
})

describe('CnIndexPage routeState', () => {
	const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')

	it('writes the address only while routeState holds', () => {
		expect(sfc).toMatch(/persistViewStateToRoute\(state, \{ savedView \} = \{\}\) \{\s*if \(!this\.routeState \|\| /)
		expect(sfc).toMatch(/persistNamedFiltersToRoute\(filters\) \{\s*if \(!this\.routeState \|\| /)
	})
})
