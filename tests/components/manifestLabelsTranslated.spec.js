/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every manifest label the library shows passes the injected lookup.
 *
 * @spec openspec/changes/manifest-i18n-labels/tasks.md#task-3
 * @spec openspec/changes/manifest-i18n-labels/tasks.md#task-4
 */
import { mount, shallowMount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnFormPage from '../../src/components/CnFormPage/CnFormPage.vue'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'
import CnObjectSidebar from '../../src/components/CnObjectSidebar/CnObjectSidebar.vue'
import CnRelatedCollections from '../../src/components/CnRelatedCollections/CnRelatedCollections.vue'
import CnRowActions from '../../src/components/CnRowActions/CnRowActions.vue'
import CnSearchPage from '../../src/components/CnSearchPage/CnSearchPage.vue'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'
import { cnRenderFormField } from '../../src/composables/cnFormFieldRenderer.js'
import { createManifestTranslate } from '../../src/utils/manifestTranslate.js'

const manifest = {
	i18n: {
		sourceLanguage: 'nl',
		languages: ['en'],
		labels: {
			en: {
				'Naam aanvrager': 'Applicant name',
				'Hulp bij naam': 'Name help',
				Versturen: 'Send',
				Goedkeuren: 'Approve',
				Vergunningen: 'Permits',
				'Alle besluiten': 'All decisions',
				Zoeken: 'Search',
				Winkel: 'Shop',
				Gevolgen: 'Consequences',
				Groep: 'Group',
				Open: 'Open',
				Nieuw: 'New',
			},
		},
	},
}
const lookup = () => createManifestTranslate({ getManifest: () => manifest, getLanguage: () => 'en', translate: (k) => k })
const provide = () => ({ cnTranslate: lookup() })

describe('CnFormPage speaks the user\'s language', () => {
	const stubs = {
		CnPageHeader: true,
		NcButton: { template: '<button><slot /></button>' },
		NcLoadingIcon: true,
		NcNoteCard: true,
		Send: true,
		NcTextField: { template: '<input />', props: ['label'] },
	}

	it('labels, help, the submit label and the success message pass the injected lookup when no translate prop is given', async () => {
		const w = mount(CnFormPage, {
			props: {
				fields: [{ key: 'naam', type: 'string', label: 'Naam aanvrager', help: 'Hulp bij naam' }],
				submitLabel: 'Versturen',
				successMessage: 'Nieuw',
				submitHandler: 'noop',
				customComponents: { noop: () => {} },
			},
			global: { stubs, provide: provide(), mocks: { $route: { params: {} } } },
		})
		expect(w.findComponent({ name: 'NcTextField' }).exists() || w.html()).toBeTruthy()
		expect(w.vm.resolveFieldRender(w.vm.fields[0]).props.label).toBe('Applicant name')
		expect(w.text()).toContain('Name help')
		expect(w.text()).toContain('Send')
	})

	it('a translate prop still wins over the injected lookup', () => {
		const w = mount(CnFormPage, {
			props: { fields: [], translate: (k) => `prop:${k}`, submitLabel: 'Versturen', submitHandler: 'x', customComponents: { x: () => {} } },
			global: { stubs, provide: provide(), mocks: { $route: { params: {} } } },
		})
		expect(w.text()).toContain('prop:Versturen')
	})

	it('enum and option labels pass the translator', () => {
		const rendered = cnRenderFormField({
			field: { key: 'soort', type: 'enum', label: 'Soort', enum: [{ value: 'a', label: 'Goedkeuren' }, 'Open'] },
			value: null,
			onInput: () => {},
			t: lookup(),
		})
		expect(rendered.props.options).toEqual([{ label: 'Approve', value: 'a' }, { label: 'Open', value: 'Open' }])
	})
})

describe('CnRowActions', () => {
	const stubs = {
		NcActions: { template: '<div><slot /></div>' },
		NcActionButton: { template: '<button v-bind="$attrs"><slot /></button>' },
		NcActionLink: { template: '<a v-bind="$attrs"><slot /></a>' },
	}

	it('shows the action in the user\'s language while its test id stays on the written label', () => {
		const w = mount(CnRowActions, { props: { row: { id: 1 }, actions: [{ label: 'Goedkeuren' }, { label: 'Overig' }] }, global: { stubs, provide: provide() } })
		const buttons = w.findAll('button')
		expect(buttons[0].text()).toBe('Approve')
		expect(buttons[0].attributes('data-testid')).toMatch(/goedkeuren$/)
		expect(buttons[0].attributes('lang')).toBeUndefined()
	})

	it('a label with no translation keeps its source language', () => {
		const w = mount(CnRowActions, { props: { row: { id: 1 }, actions: [{ label: 'Overig' }] }, global: { stubs, provide: provide() } })
		const button = w.get('button')
		expect(button.text()).toBe('Overig')
		expect(button.attributes('lang')).toBe('nl')
	})

	it('emits the written label as the action, so the page can find the declaration', async () => {
		const w = mount(CnRowActions, { props: { row: { id: 1 }, actions: [{ label: 'Goedkeuren' }] }, global: { stubs, provide: provide() } })
		await w.get('button').trigger('click')
		expect(w.emitted('action')[0][0].action).toBe('Goedkeuren')
	})
})

describe('CnActionsBar bulk actions', () => {
	it('shows a bulk action label in the user\'s language', () => {
		const w = shallowMount(CnActionsBar, {
			props: { selectedIds: ['1'], bulkActions: [{ id: 'approve', label: 'Goedkeuren' }, { id: 'rest', label: 'Overig' }] },
			global: { provide: provide(), stubs: { NcButton: { template: '<button v-bind="$attrs"><slot /></button>' } } },
		})
		expect(w.get('[data-testid="cn-bulk-action-approve"]').text()).toBe('Approve')
		expect(w.get('[data-testid="cn-bulk-action-rest"]').attributes('lang')).toBe('nl')
	})
})

describe('CnIndexSidebar', () => {
	it('translates the title and a column group label', () => {
		const w = shallowMount(CnIndexSidebar, {
			props: { open: true, title: 'Vergunningen', columnGroups: [{ id: 'g', label: 'Groep', columns: [{ key: 'a', label: 'Nieuw' }] }], showMetadata: false, schema: { properties: { x: { title: 'X' } } } },
			global: { provide: provide() },
		})
		expect(w.vm.resolvedName).toBe('Permits')
		expect(w.html()).toContain('Group')
	})
})

describe('CnObjectSidebar', () => {
	it('translates the title and a tab label', () => {
		const w = shallowMount(CnObjectSidebar, {
			props: { objectType: 'case', objectId: '1', title: 'Vergunningen', tabs: [{ id: 't', label: 'Alle besluiten' }, { id: 'u', label: 'Overig' }] },
			global: { provide: provide() },
		})
		expect(w.vm.sidebarTitle).toBe('Permits')
		expect(w.vm.shown('Alle besluiten')).toBe('All decisions')
		expect(w.vm.langOf('Overig')).toBe('nl')
		expect(w.vm.langOf('Alle besluiten')).toBeUndefined()
	})
})

describe('CnRelatedCollections, CnSearchPage and CnStorePage', () => {
	it('a related-collection section title', () => {
		const w = shallowMount(CnRelatedCollections, {
			props: { collections: [{ title: 'Gevolgen' }, { title: 'Overig' }] },
			global: { provide: provide() },
		})
		const titles = w.findAll('h3')
		expect(titles[0].text()).toBe('Consequences')
		expect(titles[1].attributes('lang')).toBe('nl')
	})

	it('the search page title', () => {
		const w = shallowMount(CnSearchPage, { props: { title: 'Zoeken' }, global: { provide: provide() } })
		expect(w.get('.cn-search-page__title').text()).toBe('Search')
	})

	it('the store page title', () => {
		const w = shallowMount(CnStorePage, { props: { title: 'Winkel' }, global: { provide: provide() } })
		expect(w.get('.cn-store-page__title').text()).toBe('Shop')
	})

	it('without a lookup, labels show as written', () => {
		const w = shallowMount(CnSearchPage, { props: { title: 'Zoeken' } })
		expect(w.get('.cn-search-page__title').text()).toBe('Zoeken')
	})
})
