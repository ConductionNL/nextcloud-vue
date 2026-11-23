/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Related cases grouped by relation type under headings (DqZaakGerelateerd:
 * "Onderwerp van deze zaak", "Wacht op", then the host's "Gepland vervolg"
 * with its "Vervolg plannen" action). `groupByRelation` splits Objects by the
 * label OpenRegister answers per direction (`relation.displayLabel` on each
 * uses/used row), and `layout: "sections"` draws every group under a heading.
 *
 * @spec openspec/changes/related-groups-by-relation/specs/related-objects/spec.md#requirement-related-objects-can-be-grouped-by-relation-type-under-headings
 */
import { mount } from '@vue/test-utils'
import CnRelatedObjectsWidget from '../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import { integrations } from '../../src/integrations/registry.js'

jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (tpl, params = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => params[k]) }))

const stubs = {
	CnWidgetWrapper: { template: '<div class="cn-widget-wrapper-stub"><slot /><slot name="footer" /></div>' },
	CnIcon: true,
	FileTreeOutline: true,
	Paperclip: true,
	ChevronRight: true,
}

const SELF = { '@self': { register: 'dossiq', schema: 'case', id: 'Z82' } }

const BODIES = {
	relations: {},
	uses: { results: [{ id: 'c311', title: 'Aanleg fietspad Lindelaan', relation: { displayLabel: 'Subject of this case' } }], total: 1 },
	used: {
		results: [
			{ id: 'c88', title: 'Advies verlichting fietspad', relation: { displayLabel: 'Waits on' } },
			{ id: 'c90', title: 'Unlabelled link' },
		],
		total: 2,
	},
	files: { results: [], total: 0 },
}

/** Drain the fetches. */
async function flush() {
	await new Promise((resolve) => setTimeout(resolve, 0))
	await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Mount the widget.
 *
 * @param {object} props Extra props.
 * @param {object} [provide] Values to provide.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The widget.
 */
async function mountWidget(props, provide = {}) {
	global.fetch = jest.fn((url) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(BODIES[String(url).split('/').pop()] ?? {}) }))
	const w = mount(CnRelatedObjectsWidget, { props: { objectData: SELF, ...props }, global: { stubs, provide } })
	await flush()
	return w
}

describe('CnRelatedObjectsWidget relation groups', () => {
	beforeEach(() => {
		integrations.__resetForTests()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('splits Objects by relation type, translated, keeping unlabelled rows in Objects', async () => {
		const nl = { 'Subject of this case': 'Onderwerp van deze zaak', 'Waits on': 'Wacht op' }
		const w = await mountWidget({ groupByRelation: true }, { cnTranslate: (key) => nl[key] ?? key })
		expect(w.vm.visibleGroups.map((group) => [group.label, group.items.map((item) => item.label)])).toEqual([
			['Onderwerp van deze zaak', ['Aanleg fietspad Lindelaan']],
			['Wacht op', ['Advies verlichting fietspad']],
			['Objects', ['Unlabelled link']],
		])
	})

	it('draws every group under a heading in the sections layout, with a heading action', async () => {
		const dispatch = jest.fn()
		const w = await mountWidget({
			groupByRelation: true,
			layout: 'sections',
			extraSections: [{ key: 'planned', label: 'Planned follow-up', items: [{ id: 'p1', label: 'Message after publication' }], action: { label: 'Plan follow-up', icon: 'CalendarPlus', type: 'open-modal', target: 'PlanFollowUp' } }],
			groupActions: { 'relation:Waits on': { label: 'Link case', type: 'open-modal', target: 'LinkCase' } },
		}, { cnDispatchAction: dispatch })
		expect(w.find('[role="tablist"]').exists()).toBe(false)
		const sections = w.findAll('[data-testid="cn-related-section"]')
		expect(sections.map((section) => section.find('h4').text())).toEqual(['Subject of this case', 'Waits on', 'Objects', 'Planned follow-up'])
		expect(sections[3].text()).toContain('Message after publication')
		const actions = w.findAll('[data-testid="cn-related-section-action"]')
		expect(actions.map((button) => button.text())).toEqual(['Link case', 'Plan follow-up'])
		await actions[1].trigger('click')
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ target: 'PlanFollowUp' }))
		expect(w.emitted('group-action')[0][0]).toEqual(expect.objectContaining({ group: 'planned' }))
	})

	it('keeps one Objects tab without the keys', async () => {
		const w = await mountWidget({})
		expect(w.vm.visibleGroups.map((group) => group.key)).toEqual(['objects'])
		expect(w.findAll('[data-testid="cn-related-section"]')).toHaveLength(0)
	})
})
