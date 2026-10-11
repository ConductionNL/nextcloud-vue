/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Body and side cards under the board look: the data card's field grid, the
 * side column's order (notice first, History last with the identifier line),
 * no Actions menu on a side card, and the body/side layout. Pixel values are
 * rules in look-board-detail.css, asserted here against the spec's numbers.
 *
 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-body-and-side-cards-take-the-board-anatomy
 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-tabs-and-their-panel-take-the-body-column
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const store = {
	objects: { 'reg-case': { 'id-1': { name: 'Case', identifier: '2026-0082' } } },
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
}

const WIDGETS = [
	{ id: 'w-deadline', type: 'stat', title: 'Deadline' },
	{ id: 'w-history', type: 'audit-trail', title: 'History' },
	{ id: 'w-requester', type: 'text', title: 'Requester' },
	{ id: 'w-notice', type: 'banner', title: 'Advice requested' },
]

const stubs = {
	CnDashboardGrid: { template: '<div />' },
	CnDetailWidgetHost: { props: ['widget', 'showActions'], template: '<div class="host" :data-actions="String(showActions)">{{ widget.title }}</div>' },
}

function mountPage(props = {}, look = 'board') {
	return mount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: store,
			widgets: WIDGETS,
			sideColumn: ['w-deadline', 'w-history', 'w-requester', 'w-notice'],
			identifierField: 'identifier',
			...props,
		},
		global: { stubs, provide: look ? { cnLook: look } : {} },
	})
}

const sideIds = (w) => w.findAll('.cn-detail-page__side-item').map((el) => el.attributes('data-testid').replace('cn-detail-page-side-', ''))
const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8')
function rule(selector) {
	const at = css.indexOf(`${selector} {`)
	expect(at).toBeGreaterThanOrEqual(0)
	return css.slice(at, css.indexOf('}', at))
}

describe('CnDetailPage side column in the board look', () => {
	it('puts the notice first and the History card last', () => {
		expect(sideIds(mountPage())).toEqual(['w-notice', 'w-deadline', 'w-requester', 'w-history'])
	})

	it('keeps the manifest order without the look', () => {
		expect(sideIds(mountPage({}, null))).toEqual(['w-deadline', 'w-history', 'w-requester', 'w-notice'])
	})

	it('ends the History card with the identifier line', () => {
		const w = mountPage()
		const history = w.get('[data-testid="cn-detail-page-side-w-history"]')
		expect(history.classes()).toContain('cn-detail-page__side-item--with-identifier')
		expect(history.get('[data-testid="cn-detail-page-side-identifier"]').text()).toBe('Identifier: 2026-0082')
		expect(w.findAll('[data-testid="cn-detail-page-side-identifier"]')).toHaveLength(1)
		expect(w.get('[data-testid="cn-detail-page-side-w-notice"]').classes()).toContain('cn-detail-page__side-item--notice')
	})

	it('draws no identifier line without identifierField, and none without the look', () => {
		expect(mountPage({ identifierField: '' }).find('[data-testid="cn-detail-page-side-identifier"]').exists()).toBe(false)
		expect(mountPage({}, null).find('[data-testid="cn-detail-page-side-identifier"]').exists()).toBe(false)
	})

	it('gives side cards no Actions menu by default, and honours an explicit showWidgetActions', () => {
		expect(mountPage().get('.host').attributes('data-actions')).toBe('false')
		expect(mountPage({ showWidgetActions: true }).get('.host').attributes('data-actions')).toBe('true')
		expect(mountPage({}, null).get('.host').attributes('data-actions')).toBe('true')
	})

	it('renders the body before the side column, both under the board root', () => {
		const w = mountPage()
		expect(w.classes()).toEqual(expect.arrayContaining(['cn-detail-page--with-side', 'cn-look-board']))
		const kids = Array.from(w.element.children).map((el) => el.className)
		expect(kids.findIndex((c) => c.includes('cn-detail-page__body'))).toBeLessThan(kids.findIndex((c) => c.includes('cn-detail-page__side')))
	})
})

describe('the body and side layout rules', () => {
	it('gives the body flex 999 1 520px and the side column flex 1 1 300px, 20px apart', () => {
		expect(rule('.cn-look-board.cn-detail-page--with-side')).toMatch(/column-gap: 20px/)
		expect(rule('.cn-look-board.cn-detail-page--with-side > .cn-detail-page__body')).toMatch(/flex: 999 1 520px/)
		expect(rule('.cn-look-board.cn-detail-page--with-side > .cn-detail-page__side')).toMatch(/flex: 1 1 300px/)
	})

	it('pulls the body grid out by its 12px GridStack margin so the strip is level with the side column', () => {
		const grid = rule('.cn-look-board.cn-detail-page--with-side > .cn-detail-page__body > .cn-detail-page__grid')
		expect(grid).toMatch(/margin: -12px/)
		expect(grid).toMatch(/width: auto/)
	})
})

describe('the board card anatomy rules', () => {
	it('draws a body card at radius 12, padding 20px 22px and an h2 of 17px', () => {
		expect(css).toMatch(/--cn-board-heading-size: 17px/)
		expect(rule('.cn-look-board .cn-detail-page .cn-widget-wrapper__header,\n.cn-look-board .cn-detail-page .cn-detail-card__header')).toMatch(/padding: 20px 22px 0/)
		expect(rule('.cn-look-board .cn-detail-page .cn-widget-wrapper:not(:has(.cn-widget-wrapper__header)) > .cn-widget-wrapper__content')).toMatch(/var\(--cn-board-card-padding\)/)
		expect(rule('.cn-look-board .cn-detail-page .cn-widget-wrapper,\n.cn-look-board .cn-detail-page .cn-detail-card')).toMatch(/var\(--cn-board-card-radius\)/)
	})

	it('draws a side card heading as a 15px muted label and hides its Actions menu', () => {
		expect(rule('.cn-look-board .cn-detail-page__side .cn-widget-wrapper__title,\n.cn-look-board .cn-detail-page__side .cn-detail-card__title')).toMatch(/var\(--color-text-maxcontrast\)[\s\S]*var\(--cn-board-side-heading-size\)[\s\S]*font-weight: 600/)
		expect(css).toMatch(/--cn-board-side-heading-size: 15px/)
		expect(rule('.cn-look-board .cn-detail-page__side .cn-widget-wrapper__actions')).toMatch(/display: none/)
	})

	it('uses no hard-coded colour outside the token definitions', () => {
		const outsideTokens = css.replace(/\.cn-look-board \{[\s\S]*?\n\}/, '')
		expect(outsideTokens).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
	})
})

describe('CnObjectDataWidget field grid', () => {
	const mountData = (look) => mount(CnObjectDataWidget, {
		props: {
			title: 'Case data',
			objectData: { name: 'Case', status: 'Open', channel: 'Web' },
			schemaObject: { properties: { name: { type: 'string', title: 'Name' }, status: { type: 'string', title: 'Status' }, channel: { type: 'string', title: 'Channel' } } },
			columns: 2,
		},
		global: { provide: look ? { cnLook: look } : {}, stubs: { CnWidgetWrapper: { template: '<div><slot /></div>' } } },
	})

	it('lists fields in auto-fit 200px columns in the board look', () => {
		expect(mountData('board').vm.gridStyle).toEqual({ 'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))' })
	})

	it('keeps its fixed columns without the look', () => {
		expect(mountData(null).vm.gridStyle).toEqual({ 'grid-template-columns': 'repeat(2, 1fr)' })
	})
})
