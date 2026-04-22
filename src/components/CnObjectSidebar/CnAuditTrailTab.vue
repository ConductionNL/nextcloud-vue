<template>
	<div class="cn-sidebar-tab">
		<NcLoadingIcon v-if="loading" />
		<template v-else-if="entries.length > 0">
			<!-- Filters -->
			<div class="cn-audit-filters">
				<NcSelect
					v-model="filterAction"
					:options="actionOptions"
					:placeholder="actionFilterLabel"
					:multiple="true"
					:close-on-select="false"
					class="cn-audit-filters__select" />
				<NcSelect
					v-model="filterUser"
					:options="userOptions"
					:placeholder="userFilterLabel"
					:multiple="true"
					:close-on-select="false"
					class="cn-audit-filters__select" />
				<NcDateTimePickerNative
					id="audit-date-from"
					v-model="filterDateFrom"
					:label="fromLabel"
					type="date"
					class="cn-audit-filters__date" />
				<NcDateTimePickerNative
					id="audit-date-to"
					v-model="filterDateTo"
					:label="toLabel"
					type="date"
					class="cn-audit-filters__date" />
			</div>

			<div v-if="entries.length === 0 && !loading" class="cn-sidebar-tab__empty">
				{{ noMatchLabel }}
			</div>
			<div v-else class="cn-sidebar-tab__list">
				<div v-for="entry in entries" :key="entry.id" class="cn-audit-entry">
					<NcListItem
						:name="formatDate(entry.created)"
						:bold="false"
						:details="entry.action"
						:counter-number="changedCount(entry)"
						@click="toggleExpand(entry.id)">
						<template #icon>
							<History :size="32" />
						</template>
						<template #subname>
							{{ entry.userName || entry.user || 'System' }}
						</template>
					</NcListItem>
					<!-- Expandable details -->
					<div v-if="expandedId === entry.id" class="cn-audit-details">
						<div class="cn-audit-details__row">
							<span class="cn-audit-details__label">Action</span>
							<span>{{ entry.action }}</span>
						</div>
						<div class="cn-audit-details__row">
							<span class="cn-audit-details__label">User</span>
							<span>{{ entry.userName || entry.user || 'System' }}</span>
						</div>
						<div class="cn-audit-details__row">
							<span class="cn-audit-details__label">Date</span>
							<span>{{ formatDate(entry.created) }}</span>
						</div>
						<div v-if="entry.ipAddress" class="cn-audit-details__row">
							<span class="cn-audit-details__label">IP</span>
							<span>{{ entry.ipAddress }}</span>
						</div>
						<div v-if="entry.session" class="cn-audit-details__row">
							<span class="cn-audit-details__label">Session</span>
							<span class="cn-audit-details__mono">{{ entry.session }}</span>
						</div>
						<!-- Changed fields -->
						<div v-if="entry.changed && Object.keys(entry.changed).length > 0" class="cn-audit-details__changes">
							<span class="cn-audit-details__label">Changes</span>
							<div
								v-for="(change, field) in entry.changed"
								:key="field"
								class="cn-audit-details__change">
								<span class="cn-audit-details__field">{{ field }}</span>
								<div v-if="isSimpleValue(change)" class="cn-audit-details__values">
									<span v-if="change.old !== null && change.old !== undefined" class="cn-audit-details__old">{{ formatValue(change.old) }}</span>
									<span v-if="change.old !== null && change.new !== null" class="cn-audit-details__arrow">→</span>
									<span v-if="change.new !== null && change.new !== undefined" class="cn-audit-details__new">{{ formatValue(change.new) }}</span>
									<span v-if="change.old === null && change.new === null" class="cn-audit-details__null">null</span>
								</div>
								<div v-else class="cn-audit-details__values">
									<span class="cn-audit-details__mono">{{ formatValue(change) }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
				<!-- Load more -->
				<NcButton
					v-if="hasMore"
					type="tertiary"
					:wide="true"
					:disabled="loadingMore"
					class="cn-sidebar-tab__load-more"
					@click="loadMore">
					<template v-if="loadingMore" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ loadingMore ? '' : loadMoreLabel }}
				</NcButton>
			</div>
		</template>
		<div v-else class="cn-sidebar-tab__empty">
			{{ noAuditTrailLabel }}
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcListItem, NcLoadingIcon, NcSelect, NcDateTimePickerNative } from '@nextcloud/vue'
import History from 'vue-material-design-icons/History.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnAuditTrailTab',

	components: { NcButton, NcListItem, NcLoadingIcon, NcSelect, NcDateTimePickerNative, History },

	props: {
		objectId: { type: String, required: true },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },
		noAuditTrailLabel: { type: String, default: () => t('nextcloud-vue', 'No audit trail entries') },
		noMatchLabel: { type: String, default: () => t('nextcloud-vue', 'No matching entries') },
		actionFilterLabel: { type: String, default: () => t('nextcloud-vue', 'Action') },
		userFilterLabel: { type: String, default: () => t('nextcloud-vue', 'User') },
		fromLabel: { type: String, default: () => t('nextcloud-vue', 'From') },
		toLabel: { type: String, default: () => t('nextcloud-vue', 'To') },
		loadMoreLabel: { type: String, default: () => t('nextcloud-vue', 'Load more') },
	},

	data() {
		return {
			entries: [],
			loading: false,
			loadingMore: false,
			expandedId: null,
			filterAction: [],
			filterUser: [],
			filterDateFrom: null,
			filterDateTo: null,
			page: 1,
			total: 0,
			limit: 20,
			actionOptions: ['create', 'read', 'update', 'delete'],
			userOptions: [],
		}
	},

	computed: {
		hasMore() {
			return this.entries.length < this.total
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) { if (id) this.fetchAuditTrails() },
		},
		filterAction() { this.resetAndFetch() },
		filterUser() { this.resetAndFetch() },
		filterDateFrom() { this.resetAndFetch() },
		filterDateTo() { this.resetAndFetch() },
	},

	methods: {
		resetAndFetch() {
			this.page = 1
			this.entries = []
			this.fetchAuditTrails()
		},

		buildQueryParams() {
			const params = new URLSearchParams()
			params.set('limit', this.limit)
			params.set('_page', this.page)
			params.set('_sort[created]', 'DESC')
			if (this.filterAction?.length) params.set('action', this.filterAction.join(','))
			if (this.filterUser?.length) params.set('user_name', this.filterUser.join(','))
			if (this.filterDateFrom) {
				params.set('_dateFrom', new Date(this.filterDateFrom).toISOString().split('T')[0])
			}
			if (this.filterDateTo) {
				params.set('_dateTo', new Date(this.filterDateTo).toISOString().split('T')[0])
			}
			return params.toString()
		},

		async fetchAuditTrails() {
			if (!this.register || !this.schema) return
			this.loading = this.page === 1
			this.loadingMore = this.page > 1
			try {
				const query = this.buildQueryParams()
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/audit-trails?${query}`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					const results = data.results || data || []
					if (this.page === 1) {
						this.entries = results
					} else {
						this.entries = [...this.entries, ...results]
					}
					this.total = data.total || this.entries.length
					// Build user options from all seen entries
					const users = new Set(this.entries.map(e => e.userName || e.user).filter(Boolean))
					this.userOptions = [...users].sort()
				}
			} catch (err) {
				console.error('CnAuditTrailTab: Failed to fetch audit trails', err)
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},

		loadMore() {
			this.page++
			this.fetchAuditTrails()
		},

		toggleExpand(id) {
			this.expandedId = this.expandedId === id ? null : id
		},

		changedCount(entry) {
			if (!entry.changed || typeof entry.changed !== 'object') return 0
			return Object.keys(entry.changed).length
		},

		isSimpleValue(change) {
			return change && typeof change === 'object' && ('old' in change || 'new' in change)
		},

		formatValue(val) {
			if (val === null || val === undefined) return 'null'
			if (typeof val === 'object') return JSON.stringify(val)
			return String(val)
		},

		formatDate(dateStr) {
			if (!dateStr) return ''
			try {
				return new Date(dateStr).toLocaleString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
				})
			} catch { return dateStr }
		},
	},
}
</script>

<style scoped>
.cn-sidebar-tab { padding: 12px; }

.cn-sidebar-tab__empty {
	text-align: center;
	padding: 24px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-sidebar-tab__list { display: flex; flex-direction: column; gap: 2px; }

.cn-audit-filters {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
	margin-bottom: 12px;
}

.cn-audit-filters__select { min-width: 0; }
.cn-audit-filters__date { min-width: 0; }

.cn-sidebar-tab__load-more { margin-top: 8px; }

.cn-audit-entry { cursor: pointer; }

.cn-audit-details {
	padding: 8px 12px 12px 52px;
	font-size: 12px;
	border-bottom: 1px solid var(--color-border);
	animation: cn-slide-down 0.15s ease;
}

@keyframes cn-slide-down {
	from { opacity: 0; max-height: 0; }
	to { opacity: 1; max-height: 600px; }
}

.cn-audit-details__row {
	display: flex;
	gap: 8px;
	padding: 2px 0;
}

.cn-audit-details__label {
	color: var(--color-text-maxcontrast);
	min-width: 56px;
	font-weight: 500;
}

.cn-audit-details__mono {
	font-family: monospace;
	font-size: 11px;
	word-break: break-all;
}

.cn-audit-details__changes {
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid var(--color-border);
}

.cn-audit-details__change {
	padding: 4px 0 4px 8px;
	border-left: 2px solid var(--color-border);
	margin: 4px 0;
}

.cn-audit-details__field {
	font-weight: 500;
	display: block;
	margin-bottom: 2px;
}

.cn-audit-details__values {
	display: flex;
	gap: 6px;
	align-items: baseline;
	flex-wrap: wrap;
}

.cn-audit-details__old {
	color: var(--color-error, #e53935);
	text-decoration: line-through;
}

.cn-audit-details__arrow {
	color: var(--color-text-maxcontrast);
}

.cn-audit-details__new {
	color: var(--color-success, #43a047);
}

.cn-audit-details__null {
	color: var(--color-text-maxcontrast);
	font-style: italic;
}
</style>
