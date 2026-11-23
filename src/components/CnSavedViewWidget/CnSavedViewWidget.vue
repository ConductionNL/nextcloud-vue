<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-saved-view-widget">
		<CnWidgetEmptyState
			v-if="refusal"
			class="cn-saved-view-widget__refusal"
			variant="warning"
			:name="refusal.name"
			:description="refusal.description" />
		<p v-else-if="loading" class="cn-saved-view-widget__loading">
			{{ t('nextcloud-vue', 'Loading the saved view') }}
		</p>
		<CnObjectListWidget
			v-else-if="listContent"
			:content="listContent" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnObjectListWidget from '../CnObjectListWidget/CnObjectListWidget.vue'
import CnWidgetEmptyState from '../CnWidgetEmptyState/CnWidgetEmptyState.vue'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'
import { extractViewState } from '../../utils/savedViewHelpers.js'

/**
 * CnSavedViewWidget — a dashboard widget driven by one of the reader's saved
 * views (registered under the `saved-view` type).
 *
 * Its configuration is a view id and a row limit and nothing else. The
 * register, schema, filter and order are read from the view on every load, so
 * the card follows the view when the reader edits it on the index page. A view
 * that was deleted or made private renders a named refusal, never an empty
 * list. The rows are drawn by `CnObjectListWidget`.
 *
 * ```js
 * { type: 'saved-view', content: { viewId: '42', limit: 10 } }
 * ```
 */
export default {
	name: 'CnSavedViewWidget',

	components: { CnObjectListWidget, CnWidgetEmptyState },

	props: {
		/**
		 * The widget configuration: `viewId` (the saved view's id or uuid) and
		 * `limit` (row cap, default 10).
		 *
		 * @type {{viewId?: string|number, limit?: number}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Injected API for tests and hosts that stub the transport. Defaults to
		 * the shared `useSavedViewsApi`.
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
			loading: true,
			view: null,
			refusal: null,
		}
	},

	computed: {
		/**
		 * The content blob handed to the list: everything but the limit comes
		 * from the view.
		 *
		 * @return {object|null} The list content, or null while there is no view.
		 */
		listContent() {
			if (!this.view) {
				return null
			}
			const query = this.view.query && typeof this.view.query === 'object' ? this.view.query : {}
			const state = extractViewState(this.view)
			const sort = state.sortKeys[0]
			const limit = Number(this.content?.limit)
			return {
				register: Array.isArray(query.registers) ? String(query.registers[0] ?? '') : '',
				schema: Array.isArray(query.schemas) ? String(query.schemas[0] ?? '') : '',
				filter: state.filters,
				sort: sort ? { field: sort.key, dir: sort.order } : { field: '', dir: 'asc' },
				limit: limit > 0 ? limit : 10,
				columns: Array.isArray(query.columns) ? query.columns : [],
			}
		},
	},

	watch: {
		'content.viewId': 'load',
	},

	created() {
		this.load()
	},

	methods: {
		t,

		/** Read the view afresh; nothing of it is kept in the layout. */
		async load() {
			this.loading = true
			this.refusal = null
			this.view = null
			const id = this.content?.viewId
			if (id === undefined || id === null || id === '') {
				this.refusal = {
					name: t('nextcloud-vue', 'No saved view chosen'),
					description: t('nextcloud-vue', 'Edit this widget and pick a saved view.'),
				}
				this.loading = false
				return
			}
			try {
				const api = this.api || useSavedViewsApi()
				const views = await api.fetchViews()
				const found = views.find((v) => String(v?.id) === String(id) || (v?.uuid && String(v.uuid) === String(id)))
				if (!found) {
					this.refuse()
				} else if (!this.hasSource(found)) {
					this.refusal = {
						name: t('nextcloud-vue', 'This saved view cannot be shown'),
						description: t('nextcloud-vue', 'The view does not name a register and schema.'),
					}
				} else {
					this.view = found
				}
			} catch (error) {
				const status = error?.response?.status
				if (status === 404 || status === 403) {
					this.refuse()
				} else {
					this.refusal = {
						name: t('nextcloud-vue', 'Could not load the saved view'),
						description: '',
					}
				}
			}
			this.loading = false
		},

		/** The named refusal for a view that is gone or no longer readable. */
		refuse() {
			this.refusal = {
				name: t('nextcloud-vue', 'This saved view is no longer available'),
				description: t('nextcloud-vue', 'It was deleted or is no longer shared with you.'),
			}
		},

		/**
		 * Whether a view names the register and schema the list needs.
		 *
		 * @param {object} view The View API object.
		 * @return {boolean} True when both are present.
		 */
		hasSource(view) {
			const q = view?.query
			return !!q && Array.isArray(q.registers) && q.registers.length > 0 && Array.isArray(q.schemas) && q.schemas.length > 0
		},
	},
}
</script>

<style scoped>
.cn-saved-view-widget {
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.cn-saved-view-widget__loading {
	margin: 0;
	padding: 12px;
	color: var(--color-text-maxcontrast);
}
</style>
