/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dashboard list can keep its row chevron (`chevron: true`), and a
 * badge can read as words in its tone (`look: "text"`), as PqMijnWerk draws
 * "Normaal priority" and "Hoog priority" beside the kind pill.
 *
 * @spec openspec/changes/record-list-board-chevron-and-text-badges/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const ITEMS = [
	{ id: 'a', title: 'Afvalpas werkt niet', kind: 'request', priority: 'high', url: '/index.php/apps/pipelinq/tickets/a' },
	{ id: 'b', title: 'Vraag over vergunning', kind: 'request', priority: 'normal', url: '/index.php/apps/pipelinq/tickets/b' },
]

const PRIORITY = {
	field: 'priority',
	labels: { high: 'High priority', normal: 'Normal priority' },
	colorMap: { high: 'error', normal: 'default' },
}

function mountList(content) {
	return mount(CnRecordListWidget, {
		props: {
			content: {
				endpointSource: { url: '/apps/pipelinq/api/worklist/items', responsePath: 'items' },
				presentation: 'rows',
				title: '{title}',
				rowHrefField: 'url',
				pill: { field: 'kind', labels: { request: 'Request' }, colorMap: { request: 'info' } },
				...content,
			},
		},
	})
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: { items: ITEMS } })
})

describe('CnRecordListWidget chevron on a board dashboard', () => {
	it('marks a list that asks for its chevron', async () => {
		const w = mountList({ chevron: true })
		await flush()
		expect(w.classes()).toContain('cn-record-list--chevron')
	})

	it('leaves the mark off by default', async () => {
		const w = mountList({})
		await flush()
		expect(w.classes()).not.toContain('cn-record-list--chevron')
	})

	it('hides the chevron on a board dashboard only where the list did not ask for it', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
		const at = css.indexOf('.cn-record-list__chevron {')
		const selector = css.slice(css.lastIndexOf('}', at) + 1, at)
		expect(selector).toContain('.cn-dashboard-page')
		expect(selector).toContain(':not(.cn-record-list--chevron)')
	})
})

describe('CnRecordListWidget text badges', () => {
	it('draws a badge with `look: "text"` as words in its tone, beside a normal pill', async () => {
		const w = mountList({ badges: [{ ...PRIORITY, look: 'text' }] })
		await flush()
		const badges = w.findAll('[data-testid="cn-record-list-badge-field"]')
		expect(badges.map((b) => b.text())).toEqual(['High priority', 'Normal priority'])
		expect(badges[0].classes()).toContain('cn-record-list__badge-text')
		expect(badges[0].classes()).toContain('cn-record-list__badge-text--error')
		expect(badges[1].classes()).toContain('cn-record-list__badge-text--default')
		expect(badges[0].classes()).not.toContain('cn-status-badge')
		expect(w.find('.cn-status-badge--info').text()).toBe('Request')
	})

	it('keeps a badge a pill without the key', async () => {
		const w = mountList({ badges: [PRIORITY] })
		await flush()
		const badges = w.findAll('[data-testid="cn-record-list-badge-field"]')
		expect(badges[0].classes()).toContain('cn-status-badge')
		expect(badges[0].classes()).not.toContain('cn-record-list__badge-text')
	})
})
