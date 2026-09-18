/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The saved-views control as a tree with labels (saved-view-tree-and-labels).
 *
 * `buildViewTree` decides the order and is tested on its own. What is tested
 * here is the half a unit test of the helper cannot see: that the control
 * actually renders every row the helper returns, that the indentation reaches
 * somebody who cannot see it, and that choosing a label does not take the
 * other labels off the menu.
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

const { mount } = require('@vue/test-utils')
const CnSavedViewsControl = require('../../src/components/CnSavedViewsControl/CnSavedViewsControl.vue').default

/** Shorthand for a view as the store hands it over. */
const view = (id, extra = {}) => ({ id, slug: id, name: id, owner: 'alice', ...extra })

/**
 * Mount the control with a view list.
 *
 * @param {Array<object>} views The views.
 * @return {object} The wrapper.
 */
function mountControl(views) {
	return mount(CnSavedViewsControl, {
		props: { views, currentUserId: 'alice' },
	})
}

/**
 * The rendered view rows.
 *
 * @param {object} wrapper The wrapper.
 * @return {Array<object>} The row elements.
 */
function rows(wrapper) {
	return wrapper.findAll('[data-testid="cn-saved-views-item"]')
}

describe('the control renders the tree the helper built', () => {
	it('renders every view, seeded first, with its depth on the row', () => {
		const wrapper = mountControl([
			view('kind', { parent: 'ouder' }),
			view('ouder'),
			view('geleverd', { seeded: true }),
		])

		const rendered = rows(wrapper)
		expect(rendered.map((row) => row.attributes('data-view-id'))).toEqual([
			'geleverd',
			'ouder',
			'kind',
		])
		expect(rendered[2].attributes('data-depth')).toBe('1')
		expect(rendered[0].attributes('data-group')).toBe('seeded')
	})

	it('says the level in words, for a reader who cannot see the indent', () => {
		// The indentation is figure spaces in the label, so a screen reader
		// gets the same shape a sighted reader does; the level is said as
		// well, because leading whitespace is not read out as structure.
		const wrapper = mountControl([view('ouder'), view('kind', { parent: 'ouder' })])

		expect(rows(wrapper)[1].attributes('aria-label')).toContain('level 2')
	})

	it('says when a view inherits from one the reader cannot see', () => {
		// The child sits at the root and looks exactly like a view that never
		// had a parent. Without this it is indistinguishable.
		const wrapper = mountControl([view('kind', { parent: 'onzichtbaar' })])

		expect(rows(wrapper)[0].attributes('aria-label')).toContain('cannot see')
	})

	it('offers no delete on a seeded view, which a user may copy and not remove', () => {
		// A view the product promises is not a view one person can take off
		// everybody's install.
		const wrapper = mountControl([view('geleverd', { seeded: true }), view('eigen')])

		const deletes = wrapper.findAll('[data-testid="cn-saved-views-delete"]')
		expect(deletes.map((entry) => entry.attributes('data-view-id'))).toEqual(['eigen'])
	})
})

describe('the label filter', () => {
	it('offers the labels in use and narrows the list to one', async () => {
		const wrapper = mountControl([
			view('bezwaar-1', { labels: ['bezwaar'] }),
			view('wob-1', { labels: ['wob'] }),
		])

		const labels = wrapper.findAll('[data-testid="cn-saved-views-label"]')
		expect(labels.map((entry) => entry.attributes('data-label'))).toEqual(['bezwaar', 'wob'])

		await labels[0].trigger('click')

		expect(rows(wrapper).map((row) => row.attributes('data-view-id'))).toEqual(['bezwaar-1'])
	})

	it('keeps the other labels on the menu once one is chosen', async () => {
		// Read from the unfiltered list on purpose. A filter you cannot change
		// without clearing it first is a filter people stop using.
		const wrapper = mountControl([
			view('bezwaar-1', { labels: ['bezwaar'] }),
			view('wob-1', { labels: ['wob'] }),
		])

		await wrapper.findAll('[data-testid="cn-saved-views-label"]')[0].trigger('click')

		expect(wrapper.findAll('[data-testid="cn-saved-views-label"]').map((entry) => entry.attributes('data-label'))).toEqual(['bezwaar', 'wob'])
	})

	it('clears the filter when the active label is clicked again', async () => {
		const wrapper = mountControl([
			view('bezwaar-1', { labels: ['bezwaar'] }),
			view('wob-1', { labels: ['wob'] }),
		])

		const label = () => wrapper.findAll('[data-testid="cn-saved-views-label"]')[0]
		await label().trigger('click')
		await label().trigger('click')

		expect(rows(wrapper)).toHaveLength(2)
	})

	it('says so when a label matches nothing, rather than showing an empty menu', async () => {
		// Reached by filtering on a label and then having the matching view
		// go away, which is what a delete in another tab looks like from
		// here. An empty menu and a menu with nothing matching read the same.
		const wrapper = mountControl([
			view('bezwaar-1', { labels: ['bezwaar'] }),
			view('wob-1', { labels: ['wob'] }),
		])
		await wrapper.findAll('[data-testid="cn-saved-views-label"]')[0].trigger('click')
		await wrapper.setProps({ views: [view('wob-1', { labels: ['wob'] })] })

		expect(rows(wrapper)).toHaveLength(0)
		expect(wrapper.find('[data-testid="cn-saved-views-none-for-label"]').exists()).toBe(true)
	})

	it('does not say it on a page with no views at all, which has its own empty state', () => {
		// The control for the caption above: one chained to the wrong
		// condition would print "no views with this label" to somebody who
		// has never saved a view and never chosen a label.
		const wrapper = mountControl([])

		expect(wrapper.find('[data-testid="cn-saved-views-none-for-label"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-saved-views-empty"]').exists()).toBe(true)
	})
})
