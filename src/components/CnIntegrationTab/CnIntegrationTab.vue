<!--
  CnIntegrationTab — generic sidebar tab for any pluggable integration.

  Used as the `tab` component for the 18 leaf integrations (activity,
  analytics, bookmarks, calendar, collectives, contacts, cospend, deck,
  email, flow, forms, maps, openproject, photos, polls, shares, talk,
  time-tracker) that don't yet need a bespoke UI. Each registration
  points its `tab` at this component and passes the integration's id
  via the registration descriptor; CnObjectSidebar forwards it as a
  prop alongside the object context.

  Talks to OpenRegister's pluggable-integration sub-resource
  `/api/objects/{register}/{schema}/{objectId}/integrations/{integrationId}`
  (ObjectIntegrationsController → IntegrationProvider). A 503 from the
  endpoint renders a quiet "currently unavailable" banner rather than
  a broken tab (AD-23). The list rows are rendered generically — title,
  optional subtitle/breadcrumb, optional `url` opens in a new tab.

  Bespoke per-leaf tabs (e.g. a future CnCalendarTab) replace this one
  by re-pointing their registration's `tab` to a dedicated Vue component.
-->
<template>
	<div class="cn-sidebar-tab cn-integration-tab" :class="`cn-integration-tab--${integrationId}`">
		<div v-if="degraded" class="cn-integration-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-integration-tab__error">
			{{ error }}
		</div>
		<div v-else-if="rows.length === 0" class="cn-sidebar-tab__empty">
			{{ emptyLabel }}
		</div>
		<ul v-else class="cn-integration-tab__list">
			<li v-for="row in rows" :key="rowKey(row)" class="cn-integration-tab__row">
				<LinkVariant :size="20" class="cn-integration-tab__icon" />
				<div class="cn-integration-tab__row-main">
					<a
						v-if="row.url"
						:href="row.url"
						target="_blank"
						rel="noopener"
						class="cn-integration-tab__title">
						{{ rowTitle(row) }}
					</a>
					<span v-else class="cn-integration-tab__title">{{ rowTitle(row) }}</span>
					<span v-if="rowSubtitle(row)" class="cn-integration-tab__subtitle">{{ rowSubtitle(row) }}</span>
				</div>
				<NcButton
					v-if="allowUnlink"
					type="tertiary-no-background"
					:aria-label="unlinkLabel"
					:disabled="unlinkingKey === rowKey(row)"
					@click="unlink(row)">
					<template #icon>
						<LinkVariantOff :size="18" />
					</template>
				</NcButton>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import LinkVariantOff from 'vue-material-design-icons/LinkVariantOff.vue'
import { buildHeaders } from '../../utils/index.js'

/**
 * CnIntegrationTab — generic sidebar tab.
 *
 * Renders the linked-things list returned by the named integration's
 * IntegrationProvider; for leaves whose backend ships an empty list
 * (the 12 greenfield stubs), the empty state is shown. Bespoke tabs
 * supersede this when a leaf gets dedicated UX.
 */
export default {
	name: 'CnIntegrationTab',

	components: { NcButton, NcLoadingIcon, AlertCircleOutline, LinkVariant, LinkVariantOff },

	props: {
		/** Stable integration id (matches PHP-side provider id). */
		integrationId: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the unlink button is shown per row. */
		allowUnlink: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'Nothing linked yet') },
		/** Pre-translated aria-label for the unlink button. */
		unlinkLabel: { type: String, default: () => t('nextcloud-vue', 'Unlink') },
		/** Pre-translated banner when the underlying app/source is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'This integration is currently unavailable.') },
	},

	data() {
		return {
			rows: [],
			loading: false,
			error: '',
			degraded: '',
			unlinkingKey: null,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchRows() } } },
		integrationId() { this.fetchRows() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		rowKey(row) {
			return row.id ?? row.reference ?? row.uuid ?? row.uri ?? ''
		},

		rowTitle(row) {
			return row.title ?? row.label ?? row.name ?? row.subject ?? row.summary ?? this.rowKey(row)
		},

		rowSubtitle(row) {
			if (Array.isArray(row.breadcrumb) && row.breadcrumb.length > 1) {
				return row.breadcrumb.slice(0, -1).join(' / ')
			}
			return row.subtitle ?? row.description ?? row.status ?? ''
		},

		async fetchRows() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.error = ''
			this.degraded = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.rows = []
					this.degraded = this.unavailableLabel
				} else {
					this.rows = []
					this.error = t('nextcloud-vue', 'Could not load this integration.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(`[CnIntegrationTab:${this.integrationId}] failed to fetch`, err)
				this.rows = []
				this.error = t('nextcloud-vue', 'Could not load this integration.')
			} finally {
				this.loading = false
			}
		},

		async unlink(row) {
			const key = this.rowKey(row)
			if (this.unlinkingKey || !key) {
				return
			}
			this.unlinkingKey = key
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(key)}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					this.rows = this.rows.filter((r) => this.rowKey(r) !== key)
					/** @event unlinked Emitted after a row is unlinked. Payload: the row's id. */
					this.$emit('unlinked', key)
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'Unlink is not supported by this integration.')
				} else if (response.status === 503) {
					this.degraded = this.unavailableLabel
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(`[CnIntegrationTab:${this.integrationId}] failed to unlink`, err)
			} finally {
				this.unlinkingKey = null
			}
		},
	},
}
</script>

<style scoped>
.cn-integration-tab__banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	margin-bottom: 10px;
	border-radius: var(--border-radius);
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
	font-size: 0.9em;
}

.cn-integration-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-integration-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-integration-tab__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-integration-tab__row:last-child {
	border-bottom: none;
}

.cn-integration-tab__icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-integration-tab__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-integration-tab__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-integration-tab__title:hover {
	text-decoration: underline;
}

.cn-integration-tab__subtitle {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
