/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Two defects in the index table's row-action menu, both observed on dossiq.
 *
 * 1. A row action that cannot render. `CnRowActions` draws an entry from its
 *    `label` and `icon`, so an entry carrying neither becomes a full-height,
 *    clickable, INERT row in the overflow menu — invisible unless you notice
 *    the blank space above the real actions. Two authored shapes produce it,
 *    both meaning "show the built-in": a bare string (`"edit"`) and a key-only
 *    object (`{ key: "edit" }`). 15 of them shipped across 6 dossiq pages.
 *
 * 2. A record with a detail page had TWO edit surfaces, and the index table
 *    offered the worse one: a modal over the schema's flat scalars. On a case
 *    type — whose statuses, results, roles and properties are separate related
 *    records — that modal cannot express the thing it claims to edit.
 */

const { shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const objects = [{ id: 'ct-1', title: 'Omgevingsvergunning' }]
const schema = { title: 'Case type', properties: { title: { type: 'string' } } }

/**
 * Mount an index page.
 *
 * @param {object} propsData Extra props.
 * @return {object} The mounted wrapper.
 */
function mountPage(propsData = {}) {
	return shallowMount(CnIndexPage, { propsData: { objects, schema, ...propsData } })
}

/**
 * The row action with this label, from the merged set. Built-in actions carry
 * a label and no id (see defaultActions.js), so label is the only key that
 * addresses both built-ins and manifest-declared actions.
 *
 * @param {object} wrapper The mounted wrapper.
 * @param {string} label   The action label.
 * @return {object|undefined} The action.
 */
function actionByLabel(wrapper, label) {
	return wrapper.vm.mergedActions.find((a) => a && a.label === label)
}

/**
 * Only the warnings this component emitted — Vue's own prop warnings share
 * console.warn and would otherwise be counted as ours.
 *
 * @param {object} spy The console.warn spy.
 * @return {Array<string>} The CnIndexPage messages.
 */
function ownWarnings(spy) {
	return spy.mock.calls.map((c) => String(c[0])).filter((m) => m.startsWith('[CnIndexPage]'))
}

describe('CnIndexPage — an action that cannot render is not an action', () => {
	let warn

	beforeEach(() => {
		warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warn.mockRestore()
	})

	it('drops bare-string actions instead of rendering blank menu rows', () => {
		// dossiq CaseTypes, verbatim: three strings plus one real action.
		const wrapper = mountPage({
			actions: ['create', 'edit', 'delete', { id: 'view', label: 'Open', icon: 'EyeOutline' }],
		})
		expect(wrapper.vm.mergedActions.filter((a) => a && a.id === 'view')).toHaveLength(1)
		// Nothing label-less survives into the menu — that is the whole fix.
		expect(wrapper.vm.mergedActions.every((a) => a && a.label)).toBe(true)
	})

	it('names each dropped action rather than swallowing it', () => {
		const wrapper = mountPage({ actions: ['create', 'edit'] })
		const msgs = ownWarnings(warn)
		expect(msgs).toHaveLength(2)
		expect(msgs[0]).toContain('"create"')
		// The message has to say what to do instead, or the author just
		// re-authors the same broken shape.
		expect(msgs[0]).toContain('showEditAction')
		expect(wrapper.vm.mergedActions.every((a) => a && a.label)).toBe(true)
	})

	it('keeps every legitimate action, including keys the library does not know', () => {
		// decidesk carries `primary`, dossiq `permission`, shillinq
		// `transition` + `description`. None of those is the library's
		// business; all of them render, because they have a label.
		const wrapper = mountPage({
			actions: [
				{ id: 'provision', label: 'Provision', permission: 'admin' },
				{ id: 'promote', label: 'Promote', primary: true },
				{ id: 'activate', label: 'Try it', type: 'lifecycle-transition', transition: 'activate' },
			],
		})
		expect(wrapper.vm.mergedActions.filter((a) => ['provision', 'promote', 'activate'].includes(a.id))).toHaveLength(3)
		expect(ownWarnings(warn)).toEqual([])
	})
})

describe('CnIndexPage — editOpensDetail', () => {
	it('opens the edit modal by default, so an index with no detail page stays editable', async () => {
		const wrapper = mountPage()
		await actionByLabel(wrapper, 'Edit').handler(objects[0])

		expect(wrapper.vm.showFormDialogVisible).toBe(true)
		expect(wrapper.vm.editItem).toEqual(objects[0])
		expect(wrapper.emitted('edit-open')).toBeUndefined()
	})

	it('emits edit-open and does NOT open the modal when the record has a detail page', async () => {
		const wrapper = mountPage({ editOpensDetail: true })
		await actionByLabel(wrapper, 'Edit').handler(objects[0])

		expect(wrapper.emitted('edit-open')).toHaveLength(1)
		expect(wrapper.emitted('edit-open')[0][0]).toEqual(objects[0])
		// The decisive half: the modal must not ALSO open, or the rule has
		// changed nothing and the record still has two edit surfaces.
		expect(wrapper.vm.showFormDialogVisible).toBe(false)
		expect(wrapper.vm.editItem).toBeNull()
	})

	it('still shows an Edit action — it is the destination that changed, not the affordance', () => {
		const wrapper = mountPage({ editOpensDetail: true })
		expect(actionByLabel(wrapper, 'Edit')).toBeTruthy()
	})

	it('leaves the Add button alone: creating still uses the form dialog', async () => {
		// `editOpensDetail` is about an EXISTING record. A record that does not
		// exist yet has no detail page to send anyone to.
		const wrapper = mountPage({ editOpensDetail: true })
		await wrapper.vm.onAddClick()

		expect(wrapper.vm.showFormDialogVisible).toBe(true)
		expect(wrapper.vm.editItem).toBeNull()
	})
})
