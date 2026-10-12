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
				<component
					:is="item.to ? 'router-link' : 'span'"
					class="cn-saved-views-widget__link"
					:to="item.to || undefined"
					data-testid="cn-saved-views-link">
					{{ item.label }}
				</component>
			</li>
		</ul>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'
import { fetchListTotal } from '../../utils/fetchFilterCounts.js'
import { buildRouteQueryFromViewState, extractViewState, isOwnView, viewMatchesScope } from '../../utils/savedViewHelpers.js'

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
 */
export default {
	name: 'CnSavedViewsWidget',

	components: { NcLoadingIcon },

	inject: {
		/** The host app's translate function. */
		cnTranslate: { default: () => (key) => key },
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

	data() {
		return {
			views: [],
			counts: {},
			loading: true,
			error: false,
		}
	},

	computed: {
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

/* A phone: each link is a 44px touch target. */
@media (max-width: 640px) {
	.cn-saved-views-widget__link {
		align-items: center;
		display: inline-flex;
		min-height: 44px;
	}
}
</style>
