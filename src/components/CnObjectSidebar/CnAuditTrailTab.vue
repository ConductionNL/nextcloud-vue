<template>
	<div class="cn-sidebar-tab">
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="entries.length === 0" class="cn-sidebar-tab__empty">
			{{ noAuditTrailLabel }}
		</div>
		<div v-else class="cn-sidebar-tab__list">
			<div v-for="entry in sortedEntries" :key="entry.id" class="cn-audit-entry">
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
		</div>
	</div>
</template>

<script>
import { NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import History from 'vue-material-design-icons/History.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnAuditTrailTab',

	components: { NcListItem, NcLoadingIcon, History },

	props: {
		objectId: { type: String, required: true },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },
		noAuditTrailLabel: { type: String, default: 'No audit trail entries' },
	},

	data() {
		return {
			entries: [],
			loading: false,
			expandedId: null,
		}
	},

	computed: {
		sortedEntries() {
			return [...this.entries].sort((a, b) => new Date(b.created) - new Date(a.created))
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) { if (id) this.fetchAuditTrails() },
		},
	},

	methods: {
		async fetchAuditTrails() {
			if (!this.register || !this.schema) return
			this.loading = true
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/audit-trails`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					this.entries = data.results || data || []
				}
			} catch (err) {
				console.error('CnAuditTrailTab: Failed to fetch audit trails', err)
			} finally {
				this.loading = false
			}
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
					year: 'numeric', month: 'short', day: 'numeric',
					hour: '2-digit', minute: '2-digit',
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
