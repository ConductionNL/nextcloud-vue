import { ref, computed, onMounted } from 'vue'
import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'

/**
 * Composable for managing dashboard view state.
 *
 * Handles widget definition loading (including NC Dashboard API widgets),
 * layout management, and edit mode. Apps provide their own widget
 * definitions and persist layouts however they choose (app config,
 * OpenRegister objects, etc.).
 *
 * @param {object} [options] Configuration options
 * @param {Array} [options.widgets=[]] Static widget definitions from the app
 * @param {Array} [options.defaultLayout=[]] Default layout if no saved layout exists
 * @param {Function} [options.loadLayout] Async function that returns saved layout array, or null
 * @param {Function} [options.saveLayout] Async function that persists layout: (layout) => Promise
 * @param {boolean} [options.includeNcWidgets=false] Whether to also load NC Dashboard API widgets
 * @param {number} [options.columns=12] Grid columns
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
	const layout = ref([])
	const loading = ref(false)
	const saving = ref(false)
	const isEditing = ref(false)

	// ── Computed ─────────────────────────────────────────────────────────

	/** All available widgets (app + NC Dashboard API) */
	const widgets = computed(() => {
		return [...appWidgets.value, ...ncWidgets.value]
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
	 *
	 * @param {Array} newWidgets Updated widget definitions
	 */
	function setWidgets(newWidgets) {
		appWidgets.value = newWidgets
	}

	// ── Lifecycle ────────────────────────────────────────────────────────

	onMounted(() => {
		init()
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
