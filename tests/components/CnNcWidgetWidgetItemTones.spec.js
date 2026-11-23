/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.itemTones` on a Nextcloud dashboard widget: an item takes the tone
 * of its app or type (DqMijnWerk "Recente activiteit": dots blue, green, grey).
 *
 * @spec openspec/changes/nc-widget-item-tones/specs/nc-widget-item-tones/spec.md#requirement-a-nextcloud-widget-item-can-take-a-tone-from-its-app-or-type
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnNcWidgetWidget from '@/components/CnNcWidgetWidget/CnNcWidgetWidget.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const ITEMS = [
	{ title: 'Sanne reacted on Planning', iconUrl: '/apps/comments/img/comments.svg', link: '/apps/dossiq/cases/1', sinceId: 1 },
	{ title: 'Besluit published', type: 'file_created', link: '/f/2', sinceId: 2 },
	{ title: 'Anouk handed over 2026-0074', app: 'dossiq', link: '/x', sinceId: 3 },
	{ title: 'Something else', link: '/y', sinceId: 4 },
]

async function mountWidget(content) {
	axios.get.mockResolvedValue({ data: { ocs: { data: { activity: ITEMS } } } })
	const w = mount(CnNcWidgetWidget, { props: { content: { widgetId: 'activity', displayMode: 'list', ...content } } })
	await flushPromises()
	return w
}

const tones = (w) => w.findAll('.cn-nc-widget-widget__item').map((el) => (el.classes().find((c) => c.startsWith('cn-nc-widget-widget__item--tone-')) || '').replace('cn-nc-widget-widget__item--tone-', ''))

describe('CnNcWidgetWidget itemTones', () => {
	beforeEach(() => {
		axios.get.mockReset()
		delete window.OCA
	})

	it('gives each item the tone of its app or type, none without a match', async () => {
		const w = await mountWidget({ itemTones: { comments: 'info', file_created: 'success', dossiq: 'neutral' } })
		expect(tones(w)).toEqual(['info', 'success', 'neutral', ''])
	})

	it('ignores an unknown tone and draws no tone without itemTones', async () => {
		expect(tones(await mountWidget({ itemTones: { comments: 'purple' } }))).toEqual(['', '', '', ''])
		expect(tones(await mountWidget({}))).toEqual(['', '', '', ''])
	})
})
