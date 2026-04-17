import { ref, computed, onMounted } from 'vue'
import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'
import { filterWidgetsByVisibility } from '../utils/widgetVisibility.js'

/**
 * Composable for managing dashboard view state.
 *
 * Handles widget definition loading (including NC Dashboard API widgets),
 * layout management, edit mode, and role-based widget visibility filtering.
 *
 * Widgets can specify a `visibility` property to control which users see them:
 * ```js
 * {
 *   id: 'kcc-search',
 *   type: 'custom',
 *   title: 'Quick Search',
 *   visibility: {
 *     users: ['admin'],           // specific user IDs (optional)
 *     groups: ['KCC', 'Admins'],  // Nextcloud group names (optional)
 *   }
 * }
 * ```
 * If `visibility` is not set or both arrays are empty, the widget is visible to everyone.
 *
 * @param {object} [options] Configuration options
 * @param {Array} [options.widgets] Static widget definitions from the app
 * @param {Array} [options.defaultLayout] Default layout if no saved layout exists
 * @param {Function} [options.loadLayout] Async function that returns saved layout array, or null
 * @param {Function} [options.saveLayout] Async function that persists layout: (layout) => Promise
 * @param {boolean} [options.includeNcWidgets] Whether to also load NC Dashboard API widgets
 * @param {number} [options.columns] Grid columns
 * @return {object} Reactive state and methods for CnDashboardPage
 *
 * @example Basic usage with static widgets
 * const { widgets, layout, loading, onLayoutChange } = useDashboardView({
 *   widgets: [
 *     { id: 'kpis', title: 'KPIs', type: 'custom' },
 *     { id: 'chart', title: 'Status Chart', type: 'custom' },
 *   ],
 *   defaultLayout: [
 *     { id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
 *     { id: 2, widgetId: 'chart', gridX: 0, gridY: 2, gridWidth: 6, gridHeight: 4 },
 *   ],
 * })
 *
 * @example With persistence and NC widgets
 * const dashboard = useDashboardView({
 *   widgets: myWidgets,
 *   defaultLayout: defaultLayout,
 *   loadLayout: () => fetch('/api/dashboard-layout').then(r => r.json()),
 *   saveLayout: (layout) => fetch('/api/dashboard-layout', { method: 'PUT', body: JSON.stringify(layout) }),
 *   includeNcWidgets: true,
 * })
 *
 * @example With role-based visibility
 * const dashboard = useDashboardView({
 *   widgets: [
 *     { id: 'admin-panel', title: 'Admin Panel', type: 'custom', visibility: { groups: ['admin'] } },
 *     { id: 'kcc-search', title: 'KCC Search', type: 'custom', visibility: { groups: ['KCC'] } },
 *     { id: 'public-info', title: 'Info', type: 'custom' }, // visible to everyone
 *   ],
 *   defaultLayout: [...],
 * })
 */
export function useDashboardView(options = {}) {
	const opts = {
		widgets: [],
		defaultLayout: [],
		loadLayout: null,
		saveLayout: null,
		includeNcWidgets: false,
		columns: 12,
		...options,
	}

	// ── State ────────────────────────────────────────────────────────────
	const appWidgets = ref(opts.widgets)
	const ncWidgets = ref([])
	const visibleAppWidgets = ref([])
	const visibleNcWidgets = ref([])
	const layout = ref([])
	const loading = ref(false)
	const saving = ref(false)
	const isEditing = ref(false)

	// ── Computed ─────────────────────────────────────────────────────────

	/** All available widgets (app + NC Dashboard API), filtered by visibility */
	const widgets = computed(() => {
		return [...visibleAppWidgets.value, ...visibleNcWidgets.value]
	})

	/** Widget IDs currently on the dashboard */
	const activeWidgetIds = computed(() => {
		return layout.value.map(item => item.widgetId)
	})

	/** Widgets not yet placed on the dashboard */
	const availableWidgets = computed(() => {
		return widgets.value.filter(w => !activeWidgetIds.value.includes(w.id))
	})

	// ── Methods ──────────────────────────────────────────────────────────

	/**
	 * Apply visibility filtering to the current widget sets and update
	 * the layout to remove items whose widgets are no longer visible.
	 */
	async function applyVisibilityFilter() {
		visibleAppWidgets.value = await filterWidgetsByVisibility(appWidgets.value)
		visibleNcWidgets.value = await filterWidgetsByVisibility(ncWidgets.value)

		// Remove layout items that reference widgets the user cannot see
		const visibleIds = new Set(widgets.value.map(w => w.id))
		const filteredLayout = layout.value.filter(item => visibleIds.has(item.widgetId))
		if (filteredLayout.length !== layout.value.length) {
			layout.value = filteredLayout
		}
	}

	/**
	 * Load NC Dashboard API widgets from the OCS endpoint.
	 */
	async function loadNcWidgets() {
		try {
			const url = generateOcsUrl('/apps/dashboard/api/v1/widgets')
			const response = await axios.get(url)
			const data = response.data?.ocs?.data || {}

			ncWidgets.value = Object.values(data).map(w => ({
				id: w.id,
				title: w.title,
				iconClass: w.icon_class,
				iconUrl: w.icon_url,
				widgetUrl: w.widget_url,
				itemApiVersions: w.item_api_versions || [],
				itemIconsRound: w.item_icons_round || false,
				reloadInterval: w.reload_interval || 0,
				buttons: w.buttons || [],
				type: 'nc-widget',
			}))
		} catch (error) {
			console.error('[useDashboardView] Failed to load NC widgets:', error)
			ncWidgets.value = []
		}
	}

	/**
	 * Initialize the dashboard: load layout and optionally NC widgets.
	 */
	async function init() {
		loading.value = true
		try {
			const tasks = []

			if (opts.includeNcWidgets) {
				tasks.push(loadNcWidgets())
			}

			if (opts.loadLayout) {
				tasks.push(
					opts.loadLayout().then(saved => {
						if (saved && saved.length > 0) {
							layout.value = saved
						} else {
							layout.value = [...opts.defaultLayout]
						}
					}),
				)
			} else {
				layout.value = [...opts.defaultLayout]
			}

			await Promise.all(tasks)

			// Apply visibility filtering after all data is loaded
			await applyVisibilityFilter()
		} catch (error) {
			console.error('[useDashboardView] Init failed:', error)
			layout.value = [...opts.defaultLayout]
		} finally {
			loading.value = false
		}
	}

	/**
	 * Handle layout change from the grid. Persists if saveLayout is provided.
	 *
	 * @param {Array} newLayout Updated layout array
	 */
	async function onLayoutChange(newLayout) {
		layout.value = newLayout

		if (opts.saveLayout) {
			saving.value = true
			try {
				await opts.saveLayout(newLayout)
			} catch (error) {
				console.error('[useDashboardView] Failed to save layout:', error)
			} finally {
				saving.value = false
			}
		}
	}

	/**
	 * Add a widget to the dashboard at the next available position.
	 *
	 * @param {string} widgetId Widget ID to add
	 * @param {object} [position] Override position { gridX, gridY, gridWidth, gridHeight }
	 */
	function addWidget(widgetId, position = {}) {
		const maxId = layout.value.reduce((max, item) => {
			const num = typeof item.id === 'number' ? item.id : 0
			return num > max ? num : max
		}, 0)

		const maxY = layout.value.reduce((max, item) => {
			const bottom = (item.gridY || 0) + (item.gridHeight || 3)
			return bottom > max ? bottom : max
		}, 0)

		const newItem = {
			id: maxId + 1,
			widgetId,
			gridX: position.gridX ?? 0,
			gridY: position.gridY ?? maxY,
			gridWidth: position.gridWidth ?? 6,
			gridHeight: position.gridHeight ?? 3,
		}

		const newLayout = [...layout.value, newItem]
		onLayoutChange(newLayout)
	}

	/**
	 * Remove a widget from the dashboard by layout item ID.
	 *
	 * @param {string|number} itemId Layout item ID to remove
	 */
	function removeWidget(itemId) {
		const newLayout = layout.value.filter(item => item.id !== itemId)
		onLayoutChange(newLayout)
	}

	/**
	 * Update app widget definitions (e.g., when data changes).
	 * Re-applies visibility filtering after update.
	 *
	 * @param {Array} newWidgets Updated widget definitions
	 */
	async function setWidgets(newWidgets) {
		appWidgets.value = newWidgets
		await applyVisibilityFilter()
	}

	// ── Lifecycle ────────────────────────────────────────────────────────

	onMounted(async () => {
		await init()
	})

	// ── Return ───────────────────────────────────────────────────────────

	return {
		// State
		widgets,
		layout,
		loading,
		saving,
		isEditing,

		// Derived
		activeWidgetIds,
		availableWidgets,
		ncWidgets,

		// Methods
		onLayoutChange,
		addWidget,
		removeWidget,
		setWidgets,
		init,
	}
}
