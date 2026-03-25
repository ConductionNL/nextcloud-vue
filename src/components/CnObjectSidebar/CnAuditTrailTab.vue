<template>
	<div class="cn-sidebar-tab">
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="entries.length === 0" class="cn-sidebar-tab__empty">
			{{ noAuditTrailLabel }}
		</div>
		<div v-else class="cn-sidebar-tab__list">
			<NcListItem
				v-for="entry in entries"
				:key="entry.id"
				:name="formatDate(entry.created)"
				:bold="false"
				:details="entry.action"
				:counter-number="entry.changed ? Object.keys(entry.changed).length : 0">
				<template #icon>
					<History :size="32" />
				</template>
				<template #subname>
					{{ entry.userName || entry.user || 'System' }}
				</template>
			</NcListItem>
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
		}
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
</style>
