/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Page views: a few views of one page, each its own widget grid, behind one
 * segmented control ("My work | My team").
 *
 * A page that mixes this in accepts `views` (each `{ id, label, icon?,
 * widgets, layout, emptyText? }`), `defaultView` and `viewsLabel`. It keeps
 * the chosen view, writes it to the address (`?view=<id>`) and to the
 * user's preferences (the server, mirrored in the browser), and provides `cnPageViews` so a greeting header widget on
 * the page can draw the switch instead of the page.
 *
 * Which view opens: the address, then the stored view, then `defaultView`,
 * then the first view. An id that names no view is ignored at every step.
 *
 * Used by CnDashboardPage and CnDetailPage. Each renders the chosen view's
 * `layout` with its own grid, so a view looks exactly like the page's own
 * grid.
 *
 * @mixin pageViews
 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-a-page-declares-views-that-each-hold-a-widget-grid
 */
import { translate as t } from '@nextcloud/l10n'
import { readUserPreference, USER_PREFERENCE_STORAGE_PREFIX, writeUserPreference } from '../composables/useUserPreferences.js'

/** The query parameter that carries the chosen view. */
export const PAGE_VIEW_QUERY_KEY = 'view'

/** Prefix of the user-preference key; the page id follows it. */
export const PAGE_VIEW_PREFERENCE_PREFIX = 'cn_page_view:'

let regionSeq = 0

/**
 * Read the browser mirror of a user preference synchronously, so the stored
 * view is on screen from the first frame. Errors read as nothing stored.
 *
 * @param {string} appId The app id.
 * @param {string} key The preference key.
 * @return {string|null} The stored id, or null.
 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-the-chosen-view-is-linkable-and-remembered
 */
function readStoredViewMirror(appId, key) {
	try {
		if (typeof localStorage === 'undefined') {
			return null
		}
		const raw = localStorage.getItem(`${USER_PREFERENCE_STORAGE_PREFIX}${appId}:${key}`)
		if (raw === null || raw === undefined) {
			return null
		}
		const value = JSON.parse(raw)
		return typeof value === 'string' && value !== '' ? value : null
	} catch {
		return null
	}
}

export const pageViews = {
	inject: {
		/** The host app id, provided by CnAppRoot; keys the stored view. */
		cnPageViewsAppId: { from: 'cnAppId', default: '' },
	},

	props: {
		/**
		 * Views of this page, each its own widget grid behind one segmented
		 * control. Each is `{ id, label, icon?, widgets, layout, emptyText? }`:
		 * `widgets` and `layout` have the same shape as the page's own. The
		 * chosen view renders in a region below the page's own grid. Empty
		 * (the default) draws no switch and no region.
		 *
		 * @type {Array<{id: string, label: string, icon?: string, widgets?: Array<object>, layout?: Array<object>, emptyText?: string}>}
		 */
		views: {
			type: Array,
			default: () => [],
		},

		/**
		 * The id of the view chosen when neither the address nor the browser
		 * store names one. Empty chooses the first view.
		 *
		 * @type {string}
		 */
		defaultView: {
			type: String,
			default: '',
		},

		/**
		 * Accessible name of the view switch (through the host translate
		 * function). Empty reads "View".
		 *
		 * @type {string}
		 */
		viewsLabel: {
			type: String,
			default: '',
		},
	},

	data() {
		regionSeq += 1
		return {
			/** The view the user chose in this session, or the stored one. */
			selectedViewId: null,
			/** Whether the user chose a view in this session (a late server read then leaves it alone). */
			viewChosen: false,
			/** Id of the view region, the target of the options' `aria-controls`. */
			viewRegionId: `cn-page-view-region-${regionSeq}`,
		}
	},

	/**
	 * Provide the views to descendants, so a greeting header widget in the
	 * page's grid can draw the switch. Getters keep it reactive.
	 *
	 * @return {object} The provided `cnPageViews`.
	 */
	provide() {
		const vm = this
		return {
			cnPageViews: {
				get views() { return vm.normalizedViews },
				get activeId() { return vm.activeViewId },
				get regionId() { return vm.viewRegionId },
				select: (id) => vm.selectView(id),
			},
		}
	},

	computed: {
		/**
		 * The declared views in one shape, labels translated. Entries without
		 * an id or a label are dropped, as are repeated ids.
		 *
		 * @return {Array<{id: string, label: string, icon: string, widgets: Array<object>, layout: Array<object>, emptyText: string}>}
		 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-a-page-declares-views-that-each-hold-a-widget-grid
		 */
		normalizedViews() {
			const translate = typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
			const seen = new Set()
			return (Array.isArray(this.views) ? this.views : [])
				.filter((view) => {
					if (!view || typeof view !== 'object' || view.id === undefined || view.id === null || view.id === '') {
						return false
					}
					if (typeof view.label !== 'string' || view.label === '' || seen.has(String(view.id))) {
						return false
					}
					seen.add(String(view.id))
					return true
				})
				.map((view) => ({
					id: String(view.id),
					label: translate(view.label),
					icon: typeof view.icon === 'string' ? view.icon : '',
					widgets: Array.isArray(view.widgets) ? view.widgets : [],
					layout: Array.isArray(view.layout) ? view.layout : [],
					emptyText: typeof view.emptyText === 'string' && view.emptyText !== '' ? translate(view.emptyText) : '',
				}))
		},

		/**
		 * Whether this page has views.
		 *
		 * @return {boolean}
		 */
		hasViews() {
			return this.normalizedViews.length > 0
		},

		/**
		 * The chosen view's id: the address, then this session's or the
		 * stored choice, then `defaultView`, then the first view.
		 *
		 * @return {string|null} The id, or null without views.
		 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-the-chosen-view-is-linkable-and-remembered
		 */
		activeViewId() {
			const views = this.normalizedViews
			if (views.length === 0) {
				return null
			}
			const known = (id) => id !== null && id !== undefined && views.some((view) => view.id === String(id))
			const fromAddress = this.$route && this.$route.query ? this.$route.query[PAGE_VIEW_QUERY_KEY] : undefined
			if (known(fromAddress)) {
				return String(fromAddress)
			}
			if (known(this.selectedViewId)) {
				return String(this.selectedViewId)
			}
			if (known(this.defaultView)) {
				return this.defaultView
			}
			return views[0].id
		},

		/**
		 * The chosen view, or null without views.
		 *
		 * @return {object|null}
		 */
		activeView() {
			return this.normalizedViews.find((view) => view.id === this.activeViewId) || null
		},

		/**
		 * The switch's options, for CnSegmentedControl.
		 *
		 * @return {Array<{value: string, label: string}>}
		 */
		viewSwitchOptions() {
			return this.normalizedViews.map((view) => ({ value: view.id, label: view.label }))
		},

		/**
		 * The switch's accessible name: `viewsLabel` translated, else "View".
		 *
		 * @return {string}
		 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-the-view-switch-is-accessible
		 */
		viewSwitchLabel() {
			const translate = typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
			return this.viewsLabel ? translate(this.viewsLabel) : t('nextcloud-vue', 'Views')
		},

		/**
		 * Whether a greeting header in the page's own widgets draws the
		 * switch (an option with a `view`), so the page draws none.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-a-greeting-header-can-switch-the-pages-views
		 */
		viewSwitchInHeaderWidget() {
			const widgets = Array.isArray(this.widgets) ? this.widgets : []
			return widgets.some((def) => {
				const options = def && def.content && def.content.views && def.content.views.options
				return Array.isArray(options) && options.some((option) => option && typeof option.view === 'string' && option.view !== '')
			})
		},

		/**
		 * Whether the page draws the switch itself.
		 *
		 * @return {boolean}
		 */
		showsPageViewSwitch() {
			return this.hasViews && !this.viewSwitchInHeaderWidget
		},

		/**
		 * The user-preference key for this page's chosen view.
		 *
		 * @return {string}
		 */
		viewPreferenceKey() {
			// The page id, else the route name: a detail page's fallback id is
			// its record's title, which would remember a view per record.
			const id = this.pageId || (this.$route && this.$route.name) || this.resolvedPageId || 'page'
			return `${PAGE_VIEW_PREFERENCE_PREFIX}${id}`
		},

		/**
		 * The app id the stored view is kept under: the page's `appId` prop
		 * when it has one, else the app root's.
		 *
		 * @return {string}
		 */
		viewPreferenceAppId() {
			const own = typeof this.appId === 'string' ? this.appId : ''
			return own || (typeof this.cnPageViewsAppId === 'string' ? this.cnPageViewsAppId : '')
		},

		/**
		 * The message of the chosen view's empty state.
		 *
		 * @return {string}
		 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-a-view-with-nothing-to-draw-says-so
		 */
		viewEmptyText() {
			if (this.activeView && this.activeView.emptyText) {
				return this.activeView.emptyText
			}
			return t('nextcloud-vue', 'This view has no widgets yet.')
		},
	},

	created() {
		this.loadStoredView()
	},

	methods: {
		/**
		 * Read the stored view: the browser mirror at once, then the user
		 * preference on the server, which wins unless the user already chose.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-the-chosen-view-is-linkable-and-remembered
		 */
		async loadStoredView() {
			if (!this.hasViews) {
				return
			}
			const appId = this.viewPreferenceAppId
			const key = this.viewPreferenceKey
			this.selectedViewId = readStoredViewMirror(appId, key)
			if (!appId) {
				return
			}
			const stored = await readUserPreference(appId, key, null)
			if (!this.viewChosen && typeof stored === 'string' && stored !== '') {
				this.selectedViewId = stored
			}
		},

		/**
		 * Choose a view: keep it, store it, and write it to the address
		 * (replacing the history entry, keeping the other query keys).
		 *
		 * @param {string} id The view id.
		 * @return {void}
		 * @spec openspec/changes/view-switch-containers/specs/view-switch-containers/spec.md#requirement-the-chosen-view-is-linkable-and-remembered
		 */
		selectView(id) {
			const view = this.normalizedViews.find((candidate) => candidate.id === String(id))
			if (!view) {
				return
			}
			this.selectedViewId = view.id
			this.viewChosen = true
			writeUserPreference(this.viewPreferenceAppId, this.viewPreferenceKey, view.id)
			if (!this.$router || !this.$route) {
				return
			}
			const query = this.$route.query || {}
			if (query[PAGE_VIEW_QUERY_KEY] === view.id) {
				return
			}
			const result = this.$router.replace({ query: { ...query, [PAGE_VIEW_QUERY_KEY]: view.id } })
			if (result && typeof result.catch === 'function') {
				result.catch(() => {})
			}
		},

		/**
		 * Look a widget definition up in the views, for a layout item of the
		 * chosen view.
		 *
		 * @param {string} widgetId The widget id.
		 * @return {object|null} The definition, or null.
		 */
		findViewWidget(widgetId) {
			const view = this.activeView
			if (!view) {
				return null
			}
			return view.widgets.find((def) => def && def.id === widgetId) || null
		},

		/**
		 * Write a drag or resize in the chosen view's grid back onto its
		 * layout items in place, as the page does for its own layout, so the
		 * in-app manifest editor sees it.
		 *
		 * @param {Array<object>} updated The layout from the grid.
		 * @return {void}
		 */
		onViewLayoutChange(updated) {
			const view = this.activeView
			if (!view || !Array.isArray(updated)) {
				return
			}
			for (const u of updated) {
				const item = view.layout.find((l) => String(l.id) === String(u.id))
				if (!item) {
					continue
				}
				for (const key of ['gridX', 'gridY', 'gridWidth', 'gridHeight']) {
					if (u[key] !== undefined) {
						item[key] = u[key]
					}
				}
			}
			/**
			 * Emitted when a widget in a view's grid is dragged or resized.
			 *
			 * @event view-layout-change
			 * @type {{view: string, layout: Array<object>}}
			 */
			this.$emit('view-layout-change', { view: view.id, layout: view.layout })
		},
	},
}
