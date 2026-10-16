/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the Features and roadmap view draws CnFeaturesBoard with
 * the page's board options and publishes no right-hand sidebar; in the default
 * look nothing changes.
 *
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md
 */
const { mount } = require('@vue/test-utils')
const CnFeaturesAndRoadmapView = require('../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue').default
const CnFeaturesAndRoadmapPage = require('../../src/components/CnFeaturesAndRoadmapPage/CnFeaturesAndRoadmapPage.vue').default

const boardStub = {
	name: 'CnFeaturesBoard',
	props: ['features', 'categories', 'repo', 'title', 'appVersion', 'documentationUrl', 'suggestUrl', 'layout', 'tabs', 'filter', 'next', 'notice'],
	template: '<div class="board" />',
}

const stubs = {
	CnFeaturesBoard: boardStub,
	CnFeaturesTab: { name: 'CnFeaturesTab', props: ['features'], template: '<div class="features-tab" />' },
	CnRoadmapTab: true,
	CnCapabilityTable: true,
	CnSupportDialog: true,
	NcButton: true,
	NcNoteCard: true,
	NcEmptyContent: true,
}

function mountView(look, props = {}) {
	const holder = { value: null }
	const wrapper = mount(CnFeaturesAndRoadmapView, {
		stubs,
		propsData: { repo: 'ConductionNL/dossiq', features: [{ slug: 'a', title: 'A' }], ...props },
		provide: { cnLook: look, cnHostsIndexSidebar: true, cnIndexSidebarConfig: holder },
	})
	return { wrapper, holder }
}

describe('CnFeaturesAndRoadmapView in the board look', () => {
	it('draws the board with its options and no hoisted sidebar', () => {
		const { wrapper, holder } = mountView('board', {
			categories: { work: 'Zaakbehandeling' },
			board: { layout: 'rows', tabs: false, filter: 'segmented', next: 0, notice: 'Note', unknown: 'dropped' },
			title: 'Functionaliteiten en roadmap',
			appVersion: '0.4.48',
		})
		const board = wrapper.findComponent(boardStub)
		expect(board.exists()).toBe(true)
		expect(board.props()).toMatchObject({
			repo: 'ConductionNL/dossiq',
			categories: { work: 'Zaakbehandeling' },
			layout: 'rows',
			tabs: false,
			filter: 'segmented',
			next: 0,
			notice: 'Note',
			title: 'Functionaliteiten en roadmap',
			appVersion: '0.4.48',
		})
		expect(board.attributes('unknown')).toBeUndefined()
		expect(wrapper.find('.features-tab').exists()).toBe(false)
		expect(holder.value).toBeNull()
	})

	it('keeps the default look as it was', () => {
		const { wrapper, holder } = mountView('nextcloud', { board: { layout: 'rows' } })
		expect(wrapper.findComponent(boardStub).exists()).toBe(false)
		expect(wrapper.find('.features-tab').exists()).toBe(true)
		expect(holder.value).not.toBeNull()
	})

	it('passes categories, board and title through from the page', () => {
		const wrapper = mount(CnFeaturesAndRoadmapPage, {
			stubs: { CnFeaturesAndRoadmapView: { name: 'CnFeaturesAndRoadmapView', props: ['categories', 'board', 'title', 'appVersion'], template: '<div />' } },
			propsData: { appId: 'dossiq', features: [], categories: { a: 'A' }, board: { layout: 'rows' }, title: 'T', appVersion: '1.2.3' },
		})
		expect(wrapper.findComponent({ name: 'CnFeaturesAndRoadmapView' }).props()).toEqual({
			categories: { a: 'A' },
			board: { layout: 'rows' },
			title: 'T',
			appVersion: '1.2.3',
		})
	})
})
