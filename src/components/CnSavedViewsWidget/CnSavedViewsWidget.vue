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
		<!-- A dashboard page's own views (`workspace`): each applies its stored
		     controls in place and can be deleted after a confirmation. -->
		<ul v-else-if="workspaceMode" class="cn-saved-views-widget__list">
			<li v-for="item in items" :key="item.key" class="cn-saved-views-widget__item cn-saved-views-widget__item--page">
				<template v-if="confirmKey === item.key">
					<span class="cn-saved-views-widget__confirm" data-testid="cn-saved-views-confirm">
						{{ t('nextcloud-vue', 'Delete "{name}"?', { name: item.name }) }}
					</span>
					<NcButton
						variant="error"
						data-testid="cn-saved-views-confirm-delete"
						@click="onDelete(item.view)">
						{{ t('nextcloud-vue', 'Delete') }}
					</NcButton>
					<NcButton variant="tertiary" data-testid="cn-saved-views-cancel-delete" @click="confirmKey = ''">
						{{ t('nextcloud-vue', 'Cancel') }}
					</NcButton>
				</template>
				<template v-else>
					<button
						type="button"
						class="cn-saved-views-widget__link cn-saved-views-widget__apply"
						:aria-pressed="appliedKey === item.key"
						data-testid="cn-saved-views-apply"
						@click="onApply(item.view)">
						{{ item.label }}
					</button>
					<NcButton
						v-if="item.own"
						variant="tertiary"
						:aria-label="t('nextcloud-vue', 'Delete {name}', { name: item.name })"
						data-testid="cn-saved-views-delete"
						@click="confirmKey = item.key">
						<template #icon>
							<DeleteOutline :size="20" />
						</template>
					</NcButton>
				</template>
			</li>
		</ul>
		<ul v-else class="cn-saved-views-widget__list">
			<li v-for="item in items" :key="item.key" class="cn-saved-views-widget__item">
				<component
					:is="item.to ? 'router-link' : 'span'"
					class="cn-saved-views-widget__link"
					:to="item.to || undefined"
					data-testid="cn-saved-views-link">
					{{ item.label }}
				</component>
			</li>
		</ul>
		<!-- Save the page's current controls as a new view. -->
		<form
			v-if="workspaceMode && !error && !loading && saving"
			class="cn-saved-views-widget__save-form"
			data-testid="cn-saved-views-save-form"
			@submit.prevent="onSave">
			<NcTextField
				v-model="draftName"
				:label="t('nextcloud-vue', 'Name of the view')"
				data-testid="cn-saved-views-name" />
			<NcButton type="submit"
				variant="primary"
				:disabled="draftName.trim() === ''"
				data-testid="cn-saved-views-save-submit">
				{{ t('nextcloud-vue', 'Save') }}
			</NcButton>
			<NcButton variant="tertiary" @click="saving = false">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
		</form>
		<NcButton
			v-else-if="workspaceMode && !error && !loading"
			variant="secondary"
			data-testid="cn-saved-views-save"
			@click="startSave">
			<template #icon>
				<ContentSaveOutline :size="20" />
			</template>
			{{ t('nextcloud-vue', 'Save view') }}
		</NcButton>
		<p v-if="writeError"
			class="cn-saved-views-widget__note"
			role="alert"
			data-testid="cn-saved-views-write-error">
			{{ writeError }}
		</p>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcTextField } from '@nextcloud/vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import DeleteOutline from 'vue-material-design-icons/DeleteOutline.vue'
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'
import { fetchListTotal } from '../../utils/fetchFilterCounts.js'
import { buildRouteQueryFromViewState, buildWorkspaceViewPayload, extractViewState, extractViewWorkspace, isOwnView, viewMatchesScope, workspaceViewKeys } from '../../utils/savedViewHelpers.js'

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
 * With `workspace` the widget holds the saved views of the dashboard page it
 * sits on instead (PqMijnWerk): a view stores the page workspace's values at
 * `workspace.keys` (the bar's filters), clicking one writes them back into
 * the page workspace (and the address, for keys the address carries), "Save
 * view" stores the current values under a name, and the reader deletes their
 * own views after a confirmation. `scope` names the page the views belong to;
 * `workspace.count` is an endpoint whose `@workspace.<key>` tokens are filled
 * from each view, its answer at `responsePath` counted (a list's length or a
 * number).
 *
 * ```js
 * { type: 'saved-views', content: { scope: 'pipelinq/my-work', workspace: { keys: ['lens', 'priority'], count: { url: '/apps/pipelinq/api/worklist/items?lens=@workspace.lens', responsePath: 'items' } } } }
 * ```
 */
export default {
	name: 'CnSavedViewsWidget',

	components: { NcButton, NcLoadingIcon, NcTextField, ContentSaveOutline, DeleteOutline },

	inject: {
		/** The host app's translate function. */
		cnTranslate: { default: () => (key) => key },
		/** The page workspace a dashboard page provides (`workspace` mode reads and writes it). */
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
		 * `workspace` (`{ keys, count? }`) makes them the saved views of the
		 * dashboard page itself; see the component description.
		 *
		 * @type {{register?: string, schema?: string, scope?: string, route?: (string|object), own?: boolean, showCounts?: boolean, limit?: number, emptyText?: string, errorText?: string, workspace?: {keys: Array<string>, count?: {url: string, responsePath?: string}}}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Injected views API, for tests and hosts that stub the transport.
		 *
		 * @type {{fetchViews: () => Promise<Array<object>>, createView?: (body: object) => Promise<object>, deleteView?: (id: (string|number)) => Promise<void>}|null}
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
			saving: false,
			draftName: '',
			confirmKey: '',
			appliedKey: '',
			writeError: '',
		}
	},

	computed: {
		/**
		 * The page workspace keys the views store, when the widget holds the
		 * page's own views (`workspace.keys`); empty otherwise.
		 *
		 * @return {Array<string>} The keys.
		 */
		workspaceKeys() {
			const ws = this.content?.workspace
			return ws && typeof ws === 'object' ? workspaceViewKeys(ws.keys) : []
		},

		/**
		 * Whether the widget holds the dashboard page's own views.
		 *
		 * @return {boolean}
		 */
		workspaceMode() {
			return this.workspaceKeys.length > 0
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
				.filter((view) => !this.workspaceMode || extractViewWorkspace(view, this.workspaceKeys) !== null)
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
			const uid = this.userId()
			return this.shown.map((view) => {
				const count = this.counts[this.keyOf(view)]
				if (this.workspaceMode) {
					return {
						key: this.keyOf(view),
						name: String(view.name ?? ''),
						label: Number.isFinite(count) ? `${view.name} (${count})` : String(view.name ?? ''),
						own: isOwnView(view, uid),
						view,
					}
				}
				const query = buildRouteQueryFromViewState(extractViewState(view))
				const location = typeof route === 'string' && route !== '' ? { name: route, query } : (route && typeof route === 'object' && route.name ? { ...route, query } : null)
				return {
					key: this.keyOf(view),
					label: Number.isFinite(count) ? `${view.name} (${count})` : String(view.name ?? ''),
					to: location && this.$router ? location : null,
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
			if (this.workspaceMode) {
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
		 * One request per shown view to `workspace.count`, its tokens filled from
		 * the view's stored values; the answer at `responsePath` counted. A failed
		 * count only leaves that view without one.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/dashboard-page-saved-views/specs/dashboard-page-saved-views/spec.md#requirement-a-dashboard-page-lists-its-saved-views-with-their-counts
		 */
		async loadWorkspaceCounts() {
			const count = this.content?.workspace?.count
			if (!count || typeof count !== 'object' || typeof count.url !== 'string' || count.url === '') {
				this.counts = {}
				return
			}
			const next = {}
			await Promise.all(this.shown.map(async (view) => {
				try {
					const workspace = extractViewWorkspace(view, this.workspaceKeys) || {}
					const answer = await fetchEndpointSource({ url: count.url, responsePath: count.responsePath || '' }, { workspace }, { force: true })
					const total = Array.isArray(answer) ? answer.length : Number(answer)
					if (answer !== null && Number.isFinite(total)) {
						next[this.keyOf(view)] = total
					}
				} catch {
					// No count for this view.
				}
			}))
			this.counts = next
		},

		/**
		 * The unwrapped page workspace bag, or `{}` off a dashboard page.
		 *
		 * @return {object} The bag.
		 */
		workspaceBag() {
			const holder = this.cnWorkspaceContext
			if (!holder || typeof holder !== 'object') {
				return {}
			}
			return ('value' in holder) ? (holder.value || {}) : holder
		},

		/**
		 * Apply a view: write every stored key into the page workspace, so the
		 * page's controls and lists follow, and into the address for the keys
		 * it already carries, so a reload keeps the view.
		 *
		 * @param {object} view The View API object.
		 * @return {void}
		 * @spec openspec/changes/dashboard-page-saved-views/specs/dashboard-page-saved-views/spec.md#requirement-a-dashboard-page-applies-a-saved-view
		 */
		onApply(view) {
			const stored = extractViewWorkspace(view, this.workspaceKeys)
			const holder = this.cnWorkspaceContext
			if (!stored || !holder || typeof holder !== 'object') {
				return
			}
			if ('value' in holder) {
				holder.value = { ...(holder.value || {}), ...stored }
			} else {
				for (const [key, value] of Object.entries(stored)) {
					holder[key] = value
				}
			}
			this.appliedKey = this.keyOf(view)
			this.writeAddress(stored)
			/**
			 * @event apply A saved view was applied. Payload: the View API object.
			 */
			this.$emit('apply', view)
		},

		/**
		 * Mirror applied values into the address for the keys it carries.
		 *
		 * @param {object} stored The applied values by key.
		 * @return {void}
		 */
		writeAddress(stored) {
			if (!this.$router || !this.$route || !this.$route.query) {
				return
			}
			const query = { ...this.$route.query }
			let changed = false
			for (const [key, value] of Object.entries(stored)) {
				if (!Object.hasOwn(query, key)) {
					continue
				}
				if (value === '') {
					delete query[key]
				} else {
					query[key] = String(value)
				}
				changed = true
			}
			if (changed) {
				const result = this.$router.replace({ query })
				if (result && typeof result.catch === 'function') {
					result.catch(() => {})
				}
			}
		},

		/** Open the name field for a new view. */
		startSave() {
			this.draftName = ''
			this.writeError = ''
			this.saving = true
		},

		/**
		 * Save the page's current controls as a view under the typed name, then
		 * read the list again so it shows with its count.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/dashboard-page-saved-views/specs/dashboard-page-saved-views/spec.md#requirement-a-dashboard-page-saves-its-controls-as-a-view
		 */
		async onSave() {
			const name = this.draftName.trim()
			if (name === '') {
				return
			}
			const api = this.api || useSavedViewsApi()
			const body = buildWorkspaceViewPayload({ name, scope: this.content?.scope, workspace: this.workspaceBag(), keys: this.workspaceKeys })
			try {
				await api.createView(body)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnSavedViewsWidget] failed to save the view:', e)
				this.writeError = t('nextcloud-vue', 'The view could not be saved.')
				return
			}
			this.saving = false
			this.writeError = ''
			await this.load()
		},

		/**
		 * Delete a confirmed view and read the list again.
		 *
		 * @param {object} view The View API object.
		 * @return {Promise<void>}
		 * @spec openspec/changes/dashboard-page-saved-views/specs/dashboard-page-saved-views/spec.md#requirement-a-dashboard-page-deletes-a-saved-view-after-confirmation
		 */
		async onDelete(view) {
			const api = this.api || useSavedViewsApi()
			this.confirmKey = ''
			try {
				await api.deleteView(view.id ?? view.uuid)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnSavedViewsWidget] failed to delete the view:', e)
				this.writeError = t('nextcloud-vue', 'The view could not be deleted.')
				return
			}
			this.writeError = ''
			await this.load()
		},
	},
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

.cn-saved-views-widget__note {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-saved-views-widget__loading {
	display: flex;
	justify-content: center;
	padding: 8px 0;
}

.cn-saved-views-widget__apply {
	background: none;
	border: 0;
	cursor: pointer;
	padding: 0;
	text-align: start;
}

.cn-saved-views-widget__apply[aria-pressed='true'] {
	text-decoration: underline;
}

.cn-saved-views-widget__item--page {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 4px 8px;
	justify-content: space-between;
}

.cn-saved-views-widget__confirm {
	font-size: 14px;
}

.cn-saved-views-widget__save-form {
	align-items: flex-end;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 12px;
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
