<template>
	<div class="cn-card">
		<div class="cn-card-header">
			<h3>
				<slot name="icon" />
				{{ title }}
			</h3>
			<div class="cn-card-header__actions">
				<slot name="actions" />
			</div>
		</div>

		<!-- Status badges -->
		<div v-if="$slots.status" class="cn-config-card__status">
			<slot name="status" />
		</div>

		<!-- Main content -->
		<div class="cn-config-card__content">
			<slot />
		</div>

		<!-- Footer -->
		<div v-if="$slots.footer" class="cn-config-card__footer">
			<slot name="footer" />
		</div>
	</div>
</template>

<script>
/**
 * CnConfigurationCard — Configuration card with title, actions, status, and content.
 *
 * Decoupled from OpenRegister's ConfigurationCard. All data is provided via
 * props and slots — no store dependencies. Consumer wraps this and handles
 * navigation/store logic.
 *
 * @example
 * <CnConfigurationCard title="Database Configuration">
 *   <template #actions>
 *     <NcActions><NcActionButton @click="edit">Edit</NcActionButton></NcActions>
 *   </template>
 *   <template #status>
 *     <CnStatusBadge label="Connected" variant="success" />
 *   </template>
 *   <p>PostgreSQL 15.2 on localhost:5432</p>
 * </CnConfigurationCard>
 */
export default {
	name: 'CnConfigurationCard',

	props: {
		/** Card title */
		title: {
			type: String,
			default: '',
		},
	},
}
</script>

<style scoped>
.cn-config-card__status {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
}

.cn-config-card__content {
	margin-bottom: 8px;
}

.cn-config-card__footer {
	padding-top: 12px;
	border-top: 1px solid var(--color-border);
}
</style>
