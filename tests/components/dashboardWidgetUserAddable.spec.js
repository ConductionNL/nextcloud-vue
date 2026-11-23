/**
 * What a USER may add to their own dashboard, and what they may not.
 *
 * 🔴 THE TWO LISTS ARE NOT THE SAME LIST, AND THE DIFFERENCE IS NOT COSMETIC.
 * An administrator configures a widget once with the register and schema in
 * front of them. A user has neither and cannot be told about them, so a picker
 * that offered them the admin's list would offer types they cannot finish
 * configuring, and the failure would arrive as an empty widget on their own
 * dashboard rather than as a refusal.
 *
 * So `userAddable` is an opt-in on the registry entry, and a type that has not
 * opted in stays out of the user's picker however many other boxes it ticks.
 */

import {
	dashboardWidgetRegistry,
	listUserAddableWidgetTypes,
	listWidgetTypes,
	registerDashboardWidget,
	userWidgetPresets,
} from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'

describe('listUserAddableWidgetTypes', () => {
	const registered = []

	/**
	 * Register a throwaway type for one test.
	 *
	 * @param {string} type The type key.
	 * @param {object} entry The entry.
	 */
	function register(type, entry) {
		registerDashboardWidget(type, { form: {}, ...entry })
		registered.push(type)
	}

	afterEach(() => {
		for (const type of registered.splice(0)) {
			delete dashboardWidgetRegistry[type]
		}
	})

	it('offers only the types that opted in', () => {
		register('spec-user-ok', { userAddable: true })
		register('spec-admin-only', {})

		const offered = listUserAddableWidgetTypes()

		expect(offered).toContain('spec-user-ok')
		expect(offered).not.toContain('spec-admin-only')
	})

	it('is a subset of what an administrator may add', () => {
		register('spec-user-ok', { userAddable: true })

		// The narrower list must never contain something the wider one does
		// not: a user able to add a type an admin cannot is a hole, not a
		// feature.
		for (const type of listUserAddableWidgetTypes()) {
			expect(listWidgetTypes()).toContain(type)
		}
	})

	it('still respects the surface, so a detail-only type stays off a dashboard', () => {
		register('spec-detail-only', { userAddable: true, surfaces: ['detail-page'] })

		expect(listUserAddableWidgetTypes('app-dashboard')).not.toContain('spec-detail-only')
		expect(listUserAddableWidgetTypes('detail-page')).toContain('spec-detail-only')
	})

	it('does not offer a renderer-only type, which a user could not configure', () => {
		registerDashboardWidget('spec-no-form', { userAddable: true, form: null })
		registered.push('spec-no-form')

		expect(listUserAddableWidgetTypes()).not.toContain('spec-no-form')
	})

	it('treats anything but true as not opted in', () => {
		register('spec-truthy', { userAddable: 'yes' })
		register('spec-one', { userAddable: 1 })

		// A string and a number are both truthy and neither is a declaration.
		// Reading them as one would opt a type in by accident.
		expect(listUserAddableWidgetTypes()).not.toContain('spec-truthy')
		expect(listUserAddableWidgetTypes()).not.toContain('spec-one')
	})
})

describe('userWidgetPresets', () => {
	it('answers nothing when the page declares none', () => {
		expect(userWidgetPresets(null)).toEqual([])
		expect(userWidgetPresets({})).toEqual([])
		expect(userWidgetPresets({ userWidgets: 'not a list' })).toEqual([])
	})

	it('offers a declared preset under the name the app gave it', () => {
		const presets = userWidgetPresets({
			userWidgets: [
				{ id: 'my-views', kind: 'saved-view', label: 'One of my saved views', widget: { type: 'object-list' } },
				{ id: 'my-tasks', kind: 'tasks', widget: { type: 'object-list', filter: { assignee: '@me' } } },
			],
		})

		expect(presets.map((p) => p.id)).toEqual(['my-views', 'my-tasks'])
		expect(presets[0].label).toBe('One of my saved views')
		// A preset with no label is still offerable; it falls back to its id
		// rather than rendering as a blank row nobody can click with intent.
		expect(presets[1].label).toBe('my-tasks')
	})

	it('drops a preset nobody could identify or render', () => {
		const presets = userWidgetPresets({
			userWidgets: [
				{ kind: 'saved-view' },
				{ id: 'no-kind' },
				{ id: '  ', kind: 'tasks' },
				{ id: 'good', kind: 'tasks' },
			],
		})

		expect(presets.map((p) => p.id)).toEqual(['good'])
	})

	it('copies the widget definition, so adding one twice is two widgets', () => {
		const declared = { id: 'my-tasks', kind: 'tasks', widget: { type: 'object-list' } }
		const [first] = userWidgetPresets({ userWidgets: [declared] })
		const [second] = userWidgetPresets({ userWidgets: [declared] })

		first.widget.title = 'Mine'

		expect(second.widget.title).toBeUndefined()
		expect(declared.widget.title).toBeUndefined()
	})
})
