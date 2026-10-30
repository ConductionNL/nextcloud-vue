/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A notes list can put its record-every button pair in another dashboard card
 * (`noteAction.recordAll.placement: { widget }`): DqDagAfsluiten draws "Klaar
 * voor vandaag?" as its own card after "Vandaag vastgelegd", its title and
 * sentence the card's, the Annuleren / Dag afsluiten pair under a rule at its
 * foot. Without that card on the page the pair stays under the rows. Every
 * dashboard grid item names its widget (`data-cn-widget-id`) so it can be found.
 *
 * @spec openspec/changes/record-all-in-its-own-card/specs/record-list-notes/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const fs = require('fs')
const path = require('path')

async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const OPEN = [{ id: 'case:c1', title: 'Bezwaar parkeerboete Havenstraat', routeName: 'CaseDetail', subjectId: 'c1', notesUrl: '/n/c1' }]

function content(placement) {
	return {
		endpointSource: { url: '/apps/dossiq/api/personal-queue/day', responsePath: 'open' },
		presentation: 'notes',
		title: '{title}',
		rowRouteField: 'routeName',
		rowIdField: 'subjectId',
		noteAction: {
			urlField: 'notesUrl',
			label: 'Record it',
			draftsKey: 'end-of-day-placed',
			recordAll: { label: 'Close out your day', title: 'Ready for today?', text: 'The button records every note.', cancel: { label: 'Cancel', route: 'MyWorkHome' }, ...(placement ? { placement } : {}) },
		},
	}
}

function mountList(c) {
	return mount(CnRecordListWidget, {
		props: { content: c },
		attachTo: document.getElementById('list-host'),
		global: { mocks: { $router: { resolve: () => ({ href: '/x' }), push: jest.fn() } }, stubs: { RouterLink: { template: '<a><slot /></a>' } } },
	})
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	document.body.innerHTML = `
		<div id="list-host"></div>
		<div class="grid-stack-item" data-cn-widget-id="eod-ready"><div class="cn-widget-wrapper"><div class="cn-widget-wrapper__content"><p>Ready for today?</p></div></div></div>`
})

describe('record-all placement', () => {
	it('puts the button pair in the named card, without its title and sentence', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		const w = mountList(content({ widget: 'eod-ready' }))
		await flush()
		const card = document.querySelector('[data-cn-widget-id="eod-ready"] .cn-widget-wrapper__content')
		const placed = card.querySelector('[data-testid="cn-record-list-record-all"]')
		expect(placed).not.toBeNull()
		expect(placed.classList.contains('cn-record-notes__all--placed')).toBe(true)
		expect(placed.querySelector('[data-testid="cn-record-list-record-all-button"]')).not.toBeNull()
		expect(placed.querySelector('.cn-record-notes__all-title')).toBeNull()
		expect(w.element.querySelector('[data-testid="cn-record-list-record-all"]')).toBeNull()
		w.unmount()
	})

	it('keeps the block under the rows when the named card is not on the page', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		const w = mountList(content({ widget: 'not-here' }))
		await flush()
		const inline = w.element.querySelector('[data-testid="cn-record-list-record-all"]')
		expect(inline).not.toBeNull()
		expect(inline.querySelector('.cn-record-notes__all-title').textContent.trim()).toBe('Ready for today?')
		w.unmount()
	})

	it('moves the pair into the named card when that card comes on the page later', async () => {
		document.querySelector('[data-cn-widget-id="eod-ready"]').remove()
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		const w = mountList(content({ widget: 'eod-ready' }))
		await flush()
		expect(w.element.querySelector('[data-testid="cn-record-list-record-all"]')).not.toBeNull()
		document.body.insertAdjacentHTML('beforeend', '<div class="grid-stack-item" data-cn-widget-id="eod-ready"><div class="cn-widget-wrapper"><div class="cn-widget-wrapper__content"></div></div></div>')
		await flush()
		const card = document.querySelector('[data-cn-widget-id="eod-ready"] .cn-widget-wrapper__content')
		expect(card.querySelector('[data-testid="cn-record-list-record-all"]')).not.toBeNull()
		expect(w.element.querySelector('[data-testid="cn-record-list-record-all"]')).toBeNull()
		w.unmount()
	})

	it('follows the named card when the grid draws it again', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		const w = mountList(content({ widget: 'eod-ready' }))
		await flush()
		document.querySelector('[data-cn-widget-id="eod-ready"]').remove()
		document.body.insertAdjacentHTML('beforeend', '<div class="grid-stack-item" data-cn-widget-id="eod-ready"><div class="cn-widget-wrapper"><div class="cn-widget-wrapper__content"></div></div></div>')
		await flush()
		const card = document.querySelector('[data-cn-widget-id="eod-ready"] .cn-widget-wrapper__content')
		expect(card.querySelector('[data-testid="cn-record-list-record-all"]')).not.toBeNull()
		w.unmount()
	})

	it('names each dashboard grid item by its widget, and draws a placed pair under a rule', () => {
		const grid = fs.readFileSync(path.join(__dirname, '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'), 'utf8')
		expect(grid).toMatch(/:data-cn-widget-id="item\.widgetId/)
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8')
		expect(css).toMatch(/\.cn-record-notes__all--placed[^{]*\{[^}]*border-top: 1px solid/)
	})
})
