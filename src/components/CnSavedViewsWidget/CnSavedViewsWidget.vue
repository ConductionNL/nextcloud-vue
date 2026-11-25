<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-saved-views-widget" data-testid="cn-saved-views-widget">
		<p v-if="error" class="cn-saved-views-widget__note" data-testid="cn-saved-views-error">
			{{ tr(content.errorText) || t('nextcloud-vue', 'Your saved views could not be loaded.') }}
		</p>
		<div v-else-if="loading" class="cn-saved-views-widget__loading">
			<NcLoadingIcon :size="20" :name="t('nextcloud-vue', 'Loading …')" />
		</div>
		<p v-else-if="items.length === 0" class="cn-saved-views-widget__note" data-testid="cn-saved-views-empty">
			{{ tr(content.emptyText) || t('nextcloud-vue', 'You have no saved views yet.') }}
		</p>
		<ul v-else class="cn-saved-views-widget__list">
			<li v-for="item in items" :key="item.key" class="cn-saved-views-widget__item">
				<button
					v-if="isWorkspaceMode"
					type="button"
					class="cn-saved-views-widget__link cn-saved-views-widget__apply"
					:class="{ 'cn-saved-views-widget__apply--selected': item.key === appliedKey }"
					:aria-pressed="item.key === appliedKey ? 'true' : 'false'"
					data-testid="cn-saved-views-link"
					@click="applyView(item.view)">
					{{ item.label }}
				</button>
				<component
					:is="item.to ? 'router-link' : 'span'"
					v-else
					class="cn-saved-views-widget__link"
					:to="item.to || undefined"
					data-testid="cn-saved-views-link">
					{{ item.label }}
				</component>
				<NcButton
					v-if="isWorkspaceMode && item.own"
					variant="tertiary"
					class="cn-saved-views-widget__delete"
					:aria-label="t('nextcloud-vue', 'Delete view {name}', { name: item.view.name })"
					data-testid="cn-saved-views-delete"
					@click="viewPendingDelete = item.view">
					<template #icon>
						<DeleteOutline :size="20" />
					</template>
				</NcButton>
			</li>
		</ul>
		<CnSavedViewsControl
			v-if="isWorkspaceMode && !error && !loading"
			:chips="false"
			class="cn-saved-views-widget__save"
			@saveRequest="showSaveDialog = true" />
		<CnSaveViewDialog
			v-if="showSaveDialog"
			ref="saveViewDialog"
			@confirm="onSaveConfirm"
			@close="showSaveDialog = false" />
		<CnConfirmDialog
			v-if="viewPendingDelete"
			ref="deleteViewConfirmDialog"
			variant="error"
			:dialogTitle="t('nextcloud-vue', 'Delete view?')"
			:message="deleteMessage"
			:confirmLabel="t('nextcloud-vue', 'Delete view')"
			confirmIcon="DeleteOutline"
			@confirm="onDeleteConfirm"
			@close="viewPendingDelete = null" />
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import DeleteOutline from 'vue-material-design-icons/DeleteOutline.vue'
import CnConfirmDialog from '../../dialogs/CnConfirmDialog.vue'
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'
import { fetchListTotal } from '../../utils/fetchFilterCounts.js'
import { buildRouteQueryFromViewState, buildViewCreatePayload, extractViewState, isOwnView, viewMatchesScope } from '../../utils/savedViewHelpers.js'
import { CnSavedViewsControl } from '../CnSavedViewsControl/index.js'
import { CnSaveViewDialog } from '../CnSaveViewDialog/index.js'

const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'

/**
 * CnSavedViewsWidget — the reader's own saved views as a list of links
 * (`saved-views`), the "Opgeslagen weergaven" card of a board dashboard.
 *
 * `saved-view` draws the rows of ONE view that the manifest names by id. This
 * one lists the views themselves and has no id to configure: it asks the Views
 * API for the signed-in user's views (their own, or with `own: false` also the
 * ones shared with them), keeps those that belong to the configured source,
 * and links each to the index page `route` with the view's filters, search and
 * sort in the query, which the index page applies on load. A view saved or
 * deleted later shows up on the next load or page refresh.
 *
 * ```js
 * { type: 'saved-views', content: { register: 'pipelinq', schema: 'ticket', route: 'Tickets', showCounts: true } }
 * ```
 *
 * Workspace mode (`content.workspace`): on a dashboard page whose filters are
 * workspace keys (a `workspace-filter` bar) the widget saves, applies and
 * deletes the page's own views. A view stores the workspace keys named in
 * `workspace.keys` as its filters, under `scope`; clicking it writes them back
 * into the page workspace (a key the view does not hold is cleared), so every
 * control and list follows. "Save view" (CnSavedViewsControl) saves the
 * current values; an own view has a delete button with a confirmation. With
 * `showCounts`, `workspace.countSource` (an `endpointSource`, its `@workspace`
 * tokens filled with the view's values) counts each view: an array answer
 * counts its entries, a number or an object's `total` is used as is.
 *
 * ```js
 * { type: 'saved-views', content: { scope: 'pipelinq/my-work', showCounts: true,
 *   workspace: { keys: ['lens', 'showDone', 'priority'], countSource: { url: '/apps/pipelinq/api/worklist/items?lens=@workspace.lens', responsePath: 'items' } } } }
 * ```
 */
export default {
	name: 'CnSavedViewsWidget',

	components: { CnConfirmDialog, CnSavedViewsControl, CnSaveViewDialog, DeleteOutline, NcButton, NcLoadingIcon },

	inject: {
		/** The host app's translate function. */
		cnTranslate: { default: () => (key) => key },
		/**
		 * The dashboard page's workspace bag (CnDashboardPage), read and written
		 * in workspace mode; null elsewhere.
		 */
		cnWorkspaceContext: { default: null },
	},

	props: {
		/**
		 * The configuration: `{ register, schema, scope?, route, own?, showCounts?,
		 * limit?, emptyText?, errorText? }`. `register` and `schema` (or `scope`,
		 * the index page's `savedViewsScope`) pick the views of one list page;
		 * `route` is the name of that index page's route; `own` (default true)
		 * keeps the signed-in user's views only; `showCounts` adds how many records
		 * each view matches; `limit` caps the list (default 10).
		 *
		 * @type {{register?: string, schema?: string, scope?: string, route?: (string|object), own?: boolean, showCounts?: boolean, limit?: number, emptyText?: string, errorText?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Injected views API, for tests and hosts that stub the transport.
		 *
		 * @type {{fetchViews: Function}|null}
		 */
		api: {
			type: Object,
			default: null,
		},
	},

	emits: ['apply'],

	data() {
		return {
			views: [],
			counts: {},
			loading: true,
			error: false,
			/** Whether the save dialog is open (workspace mode). */
			showSaveDialog: false,
			/** The view waiting for the delete confirmation, or null. */
			viewPendingDelete: null,
			/** The key of the view applied last, or ''. */
			appliedKey: '',
		}
	},

	computed: {
		/**
		 * The delete confirmation's message, naming the view.
		 *
		 * @return {string}
		 */
		deleteMessage() {
			const name = this.viewPendingDelete ? String(this.viewPendingDelete.name ?? '') : ''
			return t('nextcloud-vue', 'The view "{name}" leaves your list. The items themselves stay. This cannot be undone.', { name })
		},

		/**
		 * Whether the widget saves and applies the page's workspace filters.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/workspace-saved-views/specs/workspace-saved-views/spec.md#requirement-a-dashboard-saves-and-applies-its-workspace-filters-as-views
		 */
		isWorkspaceMode() {
			const ws = this.content?.workspace
			return !!ws && typeof ws === 'object' && Array.isArray(ws.keys) && ws.keys.length > 0
		},

		/**
		 * The workspace keys a view stores, as bare keys (`@workspace.lens` → `lens`).
		 *
		 * @return {string[]}
		 */
		workspaceKeys() {
			if (!this.isWorkspaceMode) {
				return []
			}
			return this.content.workspace.keys
				.map((key) => String(key || '').replace(/^@workspace\./, ''))
				.filter((key) => key !== '')
		},

		/**
		 * The views to show: the reader's own (unless `own: false`) that belong to
		 * the configured source, newest first, capped at `limit`.
		 *
		 * @return {Array<object>} The View API objects.
		 */
		shown() {
			const c = this.content || {}
			const uid = this.userId()
			const page = { scope: c.scope, register: c.register, schema: c.schema }
			const limit = Number(c.limit)
			return this.views
				.filter((view) => (c.own === false ? true : isOwnView(view, uid)))
				.filter((view) => viewMatchesScope(view, page))
				.slice(0, limit > 0 ? Math.floor(limit) : 10)
		},

		/**
		 * The rows: a label (the view's name and its count) and the location that
		 * applies the view on the index page.
		 *
		 * @return {Array<{key: string, label: string, to: (object|null)}>} The rows.
		 */
		items() {
			const route = this.content?.route
			return this.shown.map((view) => {
				const count = this.counts[this.keyOf(view)]
				const query = buildRouteQueryFromViewState(extractViewState(view))
				const location = typeof route === 'string' && route !== '' ? { name: route, query } : (route && typeof route === 'object' && route.name ? { ...route, query } : null)
				return {
					key: this.keyOf(view),
					label: Number.isFinite(count) ? `${view.name} (${count})` : String(view.name ?? ''),
					to: location && this.$router ? location : null,
					view,
					own: isOwnView(view, this.userId()),
				}
			})
		},
	},

	watch: {
		'content.register': 'load',
		'content.schema': 'load',
		'content.scope': 'load',
		'content.own': 'load',
	},

	created() {
		this.load()
	},

	mounted() {
		this.onRefresh = () => this.load()
		subscribe(PAGE_REFRESH_CHANNEL, this.onRefresh)
	},

	beforeUnmount() {
		unsubscribe(PAGE_REFRESH_CHANNEL, this.onRefresh)
	},

	methods: {
		t,

		/**
		 * Translate a manifest string through the host app.
		 *
		 * @param {string} text The text.
		 * @return {string} The translation, or '' for no text.
		 */
		tr(text) {
			return typeof text === 'string' && text !== '' && typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : ''
		},

		/**
		 * The signed-in user's id, or '' when it cannot be read.
		 *
		 * @return {string} The id.
		 */
		userId() {
			try {
				return getCurrentUser()?.uid || ''
			} catch {
				return ''
			}
		},

		/**
		 * A view's key: its id, else its uuid.
		 *
		 * @param {object} view The View API object.
		 * @return {string} The key.
		 */
		keyOf(view) {
			return String(view?.id ?? view?.uuid ?? view?.name ?? '')
		},

		/**
		 * Read the views, and when asked how many records each matches. A failed
		 * read says so; a failed count only leaves that view without one.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/screens-own-saved-views/specs/own-saved-views/spec.md#requirement-a-dashboard-lists-the-readers-own-saved-views
		 */
		async load() {
			this.loading = true
			this.error = false
			try {
				const api = this.api || useSavedViewsApi()
				this.views = await api.fetchViews()
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnSavedViewsWidget] failed to load saved views:', e)
				this.views = []
				this.error = true
				this.loading = false
				return
			}
			this.loading = false
			await this.loadCounts()
		},

		/**
		 * One list request per shown view (`_limit=1`, the `total`), with the
		 * view's filters.
		 *
		 * @return {Promise<void>}
		 */
		async loadCounts() {
			const c = this.content || {}
			if (this.isWorkspaceMode) {
				await this.loadWorkspaceCounts()
				return
			}
			if (c.showCounts !== true || !c.register || !c.schema) {
				this.counts = {}
				return
			}
			const next = {}
			await Promise.all(this.shown.map(async (view) => {
				try {
					const total = await fetchListTotal(c.register, c.schema, extractViewState(view).filters, {})
					if (total !== null) {
						next[this.keyOf(view)] = total
					}
				} catch {
					// No count for this view.
				}
			}))
			this.counts = next
		},

		/**
		 * Count each shown view through `workspace.countSource`, its
		 * `@workspace` tokens filled with the view's stored values.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/workspace-saved-views/specs/workspace-saved-views/spec.md#requirement-a-workspace-view-shows-how-many-items-it-holds
		 */
		async loadWorkspaceCounts() {
			const c = this.content || {}
			const source = c.workspace?.countSource
			if (c.showCounts !== true || !source || typeof source !== 'object' || !source.url) {
				this.counts = {}
				return
			}
			const next = {}
			await Promise.all(this.shown.map(async (view) => {
				try {
					const answer = await fetchEndpointSource(source, { workspace: this.viewValues(view) }, { force: true })
					const total = countOfAnswer(answer)
					if (total !== null) {
						next[this.keyOf(view)] = total
					}
				} catch {
					// No count for this view.
				}
			}))
			this.counts = next
		},

		/**
		 * The workspace values a view stores: every configured key, '' for one
		 * the view does not hold.
		 *
		 * @param {object} view The View API object.
		 * @return {object} The values by key.
		 */
		viewValues(view) {
			const filters = extractViewState(view).filters
			const values = {}
			for (const key of this.workspaceKeys) {
				values[key] = Object.hasOwn(filters, key) ? filters[key] : ''
			}
			return values
		},

		/**
		 * The unwrapped workspace bag, or null on a page without one.
		 *
		 * @return {object|null}
		 */
		workspaceBag() {
			const holder = this.cnWorkspaceContext
			if (!holder || typeof holder !== 'object') {
				return null
			}
			return ('value' in holder) ? (holder.value || {}) : holder
		},

		/**
		 * Apply a view: write its stored values into the page workspace, so the
		 * page's controls and lists follow.
		 *
		 * @param {object} view The View API object.
		 * @return {void}
		 * @spec openspec/changes/workspace-saved-views/specs/workspace-saved-views/spec.md#requirement-a-dashboard-saves-and-applies-its-workspace-filters-as-views
		 */
		applyView(view) {
			const holder = this.cnWorkspaceContext
			const values = this.viewValues(view)
			if (holder && typeof holder === 'object') {
				if ('value' in holder) {
					holder.value = { ...(holder.value || {}), ...values }
				} else {
					for (const [key, value] of Object.entries(values)) {
						holder[key] = value
					}
				}
			}
			this.appliedKey = this.keyOf(view)
			this.$emit('apply', { view, values })
		},

		/**
		 * Save the page's current workspace values as a view (CnSaveViewDialog
		 * `@confirm`). A refusal keeps the dialog open with the reason.
		 *
		 * @param {{name: string, isPublic?: boolean, sharedWith?: Array, description?: string}} input The dialog's answer.
		 * @return {Promise<void>}
		 * @spec openspec/changes/workspace-saved-views/specs/workspace-saved-views/spec.md#requirement-a-dashboard-saves-and-applies-its-workspace-filters-as-views
		 */
		async onSaveConfirm({ name, isPublic = false, sharedWith = [], description = '' }) {
			const bag = this.workspaceBag() || {}
			const filters = {}
			for (const key of this.workspaceKeys) {
				const value = bag[key]
				if (value !== undefined && value !== null && value !== '') {
					filters[key] = value
				}
			}
			const payload = buildViewCreatePayload({
				name,
				description,
				isPublic,
				isDefault: false,
				state: { filters },
				scope: String(this.content?.scope || ''),
				sharedWith,
			})
			try {
				const api = this.api || useSavedViewsApi()
				const view = await api.createView(payload)
				if (!view) {
					throw new Error(t('nextcloud-vue', 'The server did not return the saved view'))
				}
				this.views = [...this.views, view]
				this.showSaveDialog = false
				this.appliedKey = this.keyOf(view)
				await this.loadCounts()
			} catch (error) {
				this.$refs.saveViewDialog?.setError?.(error?.response?.data?.error || error?.message)
			}
		},

		/**
		 * Delete the view waiting for confirmation (CnConfirmDialog `@confirm`).
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/workspace-saved-views/specs/workspace-saved-views/spec.md#requirement-a-dashboard-saves-and-applies-its-workspace-filters-as-views
		 */
		async onDeleteConfirm() {
			const view = this.viewPendingDelete
			if (!view) {
				return
			}
			try {
				const api = this.api || useSavedViewsApi()
				await api.deleteView(view.id ?? view.uuid)
				this.views = this.views.filter((candidate) => this.keyOf(candidate) !== this.keyOf(view))
				if (this.appliedKey === this.keyOf(view)) {
					this.appliedKey = ''
				}
				this.$refs.deleteViewConfirmDialog?.setResult?.({ success: true })
			} catch (error) {
				this.$refs.deleteViewConfirmDialog?.setResult?.({ error: error?.response?.data?.error || error?.message || t('nextcloud-vue', 'Could not delete the view') })
			}
		},
	},
}

/**
 * How many items an endpoint answer holds: an array's length, a number, or an
 * object's `total`; null otherwise.
 *
 * @param {unknown} answer The plucked endpoint answer.
 * @return {number|null}
 */
function countOfAnswer(answer) {
	if (Array.isArray(answer)) {
		return answer.length
	}
	if (typeof answer === 'number' && Number.isFinite(answer)) {
		return answer
	}
	if (answer && typeof answer === 'object' && typeof answer.total === 'number') {
		return answer.total
	}
	return null
}
</script>

<style scoped>
.cn-saved-views-widget__list {
	display: flex;
	flex-direction: column;
	gap: 10px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-saved-views-widget__link {
	color: var(--color-primary-element);
	display: inline-block;
	font-size: 14px;
	font-weight: 600;
	min-height: 24px;
	text-decoration: none;
}

.cn-saved-views-widget__link:hover,
.cn-saved-views-widget__link:focus-visible {
	text-decoration: underline;
}

.cn-saved-views-widget__item {
	align-items: center;
	display: flex;
	gap: 4px;
	justify-content: space-between;
}

.cn-saved-views-widget__apply {
	background: none;
	border: none;
	cursor: pointer;
	margin: 0;
	padding: 0;
	text-align: start;
}

.cn-saved-views-widget__apply--selected {
	text-decoration: underline;
}

.cn-saved-views-widget__save {
	margin-top: 8px;
}

.cn-saved-views-widget__note {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-saved-views-widget__loading {
	display: flex;
	justify-content: center;
	padding: 8px 0;
}

/* A phone: each link is a 44px touch target. */
@media (max-width: 640px) {
	.cn-saved-views-widget__link {
		align-items: center;
		display: inline-flex;
		min-height: 44px;
	}
}
</style>
