/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Detail page labels in the user's language (screens-detail-labels-parity).
 *
 * dossiq's case tabs read "Overview, Documents, History" under a Dutch user
 * although the app catalogue holds "Overzicht, Documenten": CnTabsWidget printed
 * `tab.label` as written. portaliq's side History card read "Auditlogboek"
 * although the manifest titles it "Historie": the host never handed the
 * manifest title to a self-titled card.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const DUTCH = { Overview: 'Overzicht', Documents: 'Documenten', 'Sub-cases': 'Deelzaken', Agenda: 'Agenda', Audit: 'Logboek' }
const cnTranslate = (text) => DUTCH[text] || text

const WIDGETS = [
	{ id: 'w-overview', type: 'object-list', title: 'Overview', content: { register: 'r', schema: 's' } },
	{ id: 'w-subs', type: 'object-list', title: 'Sub-cases', content: { register: 'r', schema: 's' } },
	{ id: 'w-history', type: 'audit-trail', title: '' },
]

function mountTabs(content, provide = {}) {
	return mount(CnTabsWidget, {
		props: { content, availableWidgets: WIDGETS, objectId: 'obj-1', register: 'dossiq', schema: 'case' },
		global: {
			provide: { cnTranslate, ...provide },
			stubs: {
				CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host" />' },
			},
		},
	})
}

describe('CnTabsWidget tab labels', () => {
	it('runs an authored label through the host translate', async () => {
		const w = mountTabs({ tabs: [{ widgetId: 'w-overview', label: 'Overview' }, { widgetId: 'w-subs', label: 'Documents' }] })
		await nextTick()
		const tabs = w.findAll('[role="tab"]')
		expect(tabs[0].text()).toContain('Overzicht')
		expect(tabs[1].text()).toContain('Documenten')
	})

	it('runs the child widget title through the host translate when the tab has no label', async () => {
		const w = mountTabs({ tabs: [{ widgetId: 'w-subs' }] })
		await nextTick()
		expect(w.find('[role="tab"]').text()).toContain('Deelzaken')
	})

	it('names the activity tab History under the board look', async () => {
		const w = mountTabs({ tabs: [{ widgetId: 'w-history' }, { widgetId: 'w-overview' }] }, { cnLook: 'board' })
		await nextTick()
		const tabs = w.findAll('[role="tab"]')
		expect(tabs[tabs.length - 1].text()).toContain('History')
	})

	it('keeps an untranslated label as written', async () => {
		const w = mountTabs({ tabs: [{ widgetId: 'w-subs', label: 'Knowledge' }] })
		await nextTick()
		expect(w.find('[role="tab"]').text()).toContain('Knowledge')
	})
})

/** A self-titled card renderer, as the audit trail and calendar cards are. */
const TitledCard = {
	name: 'TitledCard',
	props: { title: { type: String, default: '' }, content: { type: Object, default: () => ({}) } },
	template: '<section class="titled-card">{{ title || "Card default" }}</section>',
}

/** A renderer without a title prop. */
const PlainCard = {
	name: 'PlainCard',
	props: { content: { type: Object, default: () => ({}) } },
	template: '<section class="plain-card">plain</section>',
}

function mountHost(widget, { look = 'nextcloud', chrome = 'card', registry = { 'audit-trail': TitledCard, plain: PlainCard } } = {}) {
	return mount(CnDetailWidgetHost, {
		props: { widget, chrome, objectId: 'obj-1', register: 'r', schema: 's', cnRegistry: registry },
		global: { provide: { cnLook: look, cnTranslate } },
	})
}

describe('CnDetailWidgetHost side card title', () => {
	it('gives a self-titled card its manifest title under the board look', () => {
		const w = mountHost({ id: 'h', type: 'audit-trail', title: 'Historie' }, { look: 'board' })
		expect(w.find('.titled-card').text()).toBe('Historie')
	})

	it('translates the manifest title through the host translate', () => {
		const w = mountHost({ id: 'h', type: 'audit-trail', title: 'Audit' }, { look: 'board' })
		expect(w.find('.titled-card').text()).toBe('Logboek')
	})

	it('names an untitled activity card History under the board look', () => {
		const w = mountHost({ id: 'h', type: 'audit-trail' }, { look: 'board' })
		expect(w.find('.titled-card').text()).toBe('History')
	})

	it('lets content.title win, as before', () => {
		const w = mountHost({ id: 'h', type: 'audit-trail', title: 'Historie', content: { title: 'From content' } }, { look: 'board' })
		expect(w.find('.titled-card').text()).toBe('From content')
	})

	it('leaves the card default alone without the board look', () => {
		const w = mountHost({ id: 'h', type: 'audit-trail', title: 'Historie' })
		expect(w.find('.titled-card').text()).toBe('Card default')
	})

	it('passes no title in a tab panel', () => {
		const w = mountHost({ id: 'h', type: 'audit-trail', title: 'Historie' }, { look: 'board', chrome: 'bare' })
		expect(w.find('.titled-card').text()).toBe('Card default')
	})

	it('puts no title attribute on a renderer that takes none', () => {
		const w = mountHost({ id: 'p', type: 'plain', title: 'Plain title' }, { look: 'board' })
		expect(w.find('.plain-card').attributes('title')).toBeUndefined()
	})
})
