/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Add control's label is derived from `schema.title`, so it was the one
 * string on a fully translated index page that stayed English ("Add Time
 * entry" over a Dutch table). It is translated as two parts — the schema
 * title and the sentence around it — because `'Add ' + title` cannot be
 * translated at all and the word order differs per language.
 *
 * The identity fallback is asserted too: the injected default is `(key) => key`
 * and a host `t()` returns the source key when its catalogue has no entry, so
 * the `{type}` placeholder must never reach the button.
 */

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const baseProps = {
	title: 'Hours',
	schema: { title: 'Time entry', properties: { title: { type: 'string' } } },
	objects: [],
	loading: false,
}

const stubs = {
	CnDataTable: true, CnCardGrid: true, CnPagination: true,
	CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true,
	CnMassDeleteDialog: true, CnMassCopyDialog: true, CnMassExportDialog: true,
	CnMassImportDialog: true, CnDeleteDialog: true, CnCopyDialog: true,
	CnFormDialog: true, CnAdvancedFormDialog: true, NcLoadingIcon: true,
	NcEmptyContent: true,
}

const dict = {
	'Time entry': 'urenregistratie',
	'Add {type}': 'Nieuwe {type}',
}
const cnTranslate = (key, vars) => {
	const out = dict[key] ?? key
	return vars ? Object.entries(vars).reduce((acc, [k, v]) => acc.replace('{' + k + '}', v), out) : out
}

/**
 * @param {object} extraProps Props merged over the base set.
 * @param {object|undefined} provide Injections (pass `{ cnTranslate }` for a Dutch session).
 * @return {object} Mounted CnIndexPage.
 */
function mountIndex(extraProps = {}, provide = undefined) {
	return mount(CnIndexPage, {
		props: { ...baseProps, ...extraProps },
		global: {
			stubs,
			provide,
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
		},
	})
}

const addButton = (wrapper) => wrapper.find('[data-testid="cn-cta-primary"]')

describe('CnIndexPage — Add label translation', () => {
	it('translates the schema title AND the surrounding sentence', () => {
		const wrapper = mountIndex({}, { cnTranslate })

		// Not "Toevoegen urenregistratie" — the whole label comes from the
		// catalogue, so Dutch word order is the catalogue author's choice.
		expect(addButton(wrapper).text()).toContain('Nieuwe urenregistratie')
	})

	it('translates an explicitly passed addLabel', () => {
		const wrapper = mountIndex({ addLabel: 'Time entry' }, { cnTranslate })

		expect(addButton(wrapper).text()).toContain('urenregistratie')
	})

	it('falls back to the English source and never leaks the {type} placeholder', () => {
		const wrapper = mountIndex()

		expect(addButton(wrapper).text()).toContain('Add Time entry')
		expect(addButton(wrapper).text()).not.toContain('{type}')
	})

	it('substitutes {type} even when the catalogue translates only the title', () => {
		// A half-populated catalogue is the realistic state during a rollout:
		// schema titles land before the library sentence does.
		// This translator ignores `vars` entirely — like the injected default —
		// so the placeholder can only disappear if the component substitutes it.
		const partial = (key) => (key === 'Time entry' ? 'urenregistratie' : key)
		const wrapper = mountIndex({}, { cnTranslate: partial })

		expect(addButton(wrapper).text()).toContain('Add urenregistratie')
		expect(addButton(wrapper).text()).not.toContain('{type}')
	})
})
