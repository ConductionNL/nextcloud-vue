/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Add control's label is derived from `schema.title`, so it was the one
 * string on a fully translated index page that stayed English ("Add Time
 * entry" over a Dutch table).
 *
 * It is built from TWO catalogues, and which string comes from which is the
 * contract this file pins:
 *
 *   - the NOUN is the consumer's schema title, so it resolves against the
 *     CONSUMER's catalogue through the injected `cnTranslate`;
 *   - the SENTENCE around it is library chrome, so it resolves against the
 *     LIBRARY's own catalogue — the same split CnFormDialog already makes for
 *     "Create {title}".
 *
 * Getting that wrong is not subtle. Routing the sentence through the host
 * catalogue too rendered "Add Urenboeking" on a Dutch instance — measured on
 * the dev instance, not reasoned about — because no app catalogue carries a
 * key that belongs to the library.
 *
 * `'Add {type}'` is one key rather than a concatenation because `'Add ' +
 * title` cannot be translated at all, and because Dutch puts the words the
 * other way round ("Nieuwe urenregistratie").
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

// A consumer catalogue: it knows the app's own schema titles, and — like every
// real app catalogue — knows nothing about the library's chrome strings.
const dict = { 'Time entry': 'urenregistratie' }
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
	it('translates the schema title through the CONSUMER catalogue', () => {
		const wrapper = mountIndex({}, { cnTranslate })

		expect(addButton(wrapper).text()).toContain('urenregistratie')
		expect(addButton(wrapper).text()).not.toContain('Time entry')
	})

	it('takes the surrounding sentence from the LIBRARY catalogue, not the host one', () => {
		// This translator would answer the library's key if it were ever asked —
		// it must not be, or an app would have to carry library strings.
		const wouldAnswer = jest.fn((key, vars) => {
			const out = key === 'Add {type}' ? 'HOST-SENTENCE {type}' : (dict[key] ?? key)
			return vars ? Object.entries(vars).reduce((acc, [k, v]) => acc.replace('{' + k + '}', v), out) : out
		})
		const wrapper = mountIndex({}, { cnTranslate: wouldAnswer })

		expect(addButton(wrapper).text()).not.toContain('HOST-SENTENCE')
		expect(wouldAnswer).toHaveBeenCalledWith('Time entry')
		expect(wouldAnswer).not.toHaveBeenCalledWith('Add {type}', expect.anything())
	})

	it('translates an explicitly passed addLabel through the consumer catalogue', () => {
		const wrapper = mountIndex({ addLabel: 'Time entry' }, { cnTranslate })

		expect(addButton(wrapper).text()).toContain('urenregistratie')
	})

	it('falls back to the English source and never leaks the {type} placeholder', () => {
		const wrapper = mountIndex()

		expect(addButton(wrapper).text()).toContain('Add Time entry')
		expect(addButton(wrapper).text()).not.toContain('{type}')
	})

	it('substitutes the noun even when only the consumer catalogue answers', () => {
		// The realistic mid-rollout state: the app's schema titles have landed,
		// the library's Dutch catalogue is whatever the installed version ships.
		const wrapper = mountIndex({}, { cnTranslate })

		expect(addButton(wrapper).text()).toContain('urenregistratie')
		expect(addButton(wrapper).text()).not.toContain('{type}')
	})
})
