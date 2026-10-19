/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.excludeApps` / `content.excludeTypes` on a Nextcloud dashboard
 * widget (DqMijnWerk "Recente activiteit": the activity feed without the
 * system-tags entries). An item belongs to an app by its own `app`, else by
 * an `/apps/<app>/` part of its link or icon URL.
 *
 * @spec openspec/changes/nc-widget-exclude-apps/specs/nc-widget/spec.md#requirement-a-nextcloud-widget-can-leave-out-items-of-an-app-or-type
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnNcWidgetWidget from '@/components/CnNcWidgetWidget/CnNcWidgetWidget.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const ITEMS = [
	{ title: 'Pieter tagged a file', iconUrl: '/apps/systemtags/img/app.svg', link: '/f/1', sinceId: 1 },
	{ title: 'You commented on case 2026-0076', iconUrl: '/apps/comments/img/comments.svg', link: '/apps/dossiq/cases/1', sinceId: 2 },
	{ title: 'Anouk shared a folder', app: 'files_sharing', link: '/f/2', sinceId: 3 },
	{ title: 'Tag "woo" assigned', type: 'systemtag_assign', link: '/f/3', sinceId: 4 },
	{ title: 'You uploaded besluit.pdf', iconUrl: '/apps/files/img/app.svg', link: '/f/4', sinceId: 5 },
]

/**
 * Mount the activity widget with content.
 *
 * @param {object} content Extra content.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The widget.
 */
async function mountWidget(content) {
	axios.get.mockResolvedValue({ data: { ocs: { data: { activity: ITEMS } } } })
	const w = mount(CnNcWidgetWidget, { props: { content: { widgetId: 'activity', ...content } } })
	await flushPromises()
	return w
}

const titles = (w) => w.findAll('.cn-nc-widget-widget__item-title').map((el) => el.text())

describe('CnNcWidgetWidget excludeApps / excludeTypes', () => {
	beforeEach(() => {
		axios.get.mockReset()
		delete window.OCA
	})

	it('leaves out the items of an excluded app, by item app or by URL', async () => {
		const w = await mountWidget({ excludeApps: ['systemtags', 'files_sharing'] })
		expect(titles(w)).toEqual(['You commented on case 2026-0076', 'Tag "woo" assigned', 'You uploaded besluit.pdf'])
	})

	it('leaves out the items of an excluded type', async () => {
		const w = await mountWidget({ excludeApps: 'systemtags', excludeTypes: ['systemtag_assign'] })
		expect(titles(w)).not.toContain('Tag "woo" assigned')
		expect(titles(w)).not.toContain('Pieter tagged a file')
	})

	it('fills its limit after leaving items out, asking the API for more', async () => {
		const w = await mountWidget({ excludeApps: ['systemtags'], limit: 2 })
		expect(titles(w)).toEqual(['You commented on case 2026-0076', 'Anouk shared a folder'])
		expect(axios.get.mock.calls[0][1].params.limit).toBeGreaterThan(2)
	})

	it('takes the API list over a native callback while it leaves items out', async () => {
		const callback = jest.fn()
		window.OCA = { Dashboard: { getWidget: () => ({ title: 'Activity', callback }) } }
		const w = await mountWidget({ excludeApps: ['systemtags'] })
		expect(callback).not.toHaveBeenCalled()
		expect(w.vm.mode).toBe('api')
	})

	it('shows everything without the keys', async () => {
		const w = await mountWidget({})
		expect(titles(w)).toHaveLength(5)
	})
})
