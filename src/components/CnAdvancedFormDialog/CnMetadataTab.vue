<template>
	<div class="cn-advanced-form-dialog__table-container">
		<table class="cn-advanced-form-dialog__table">
			<thead>
				<tr class="cn-advanced-form-dialog__table-row">
					<th class="cn-advanced-form-dialog__table-col-constrained">
						{{ t('nextcloud-vue', 'Metadata') }}
					</th>
					<th class="cn-advanced-form-dialog__table-col-expanded">
						{{ t('nextcloud-vue', 'Value') }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr class="cn-advanced-form-dialog__table-row">
					<td class="cn-advanced-form-dialog__table-col-constrained">
						{{ t('nextcloud-vue', 'ID') }}
					</td>
					<td class="cn-advanced-form-dialog__table-col-expanded">
						{{ metadataId }}
					</td>
				</tr>
				<tr class="cn-advanced-form-dialog__table-row">
					<td class="cn-advanced-form-dialog__table-col-constrained">
						{{ t('nextcloud-vue', 'Created') }}
					</td>
					<td class="cn-advanced-form-dialog__table-col-expanded">
						{{ metadataCreated }}
					</td>
				</tr>
				<tr class="cn-advanced-form-dialog__table-row">
					<td class="cn-advanced-form-dialog__table-col-constrained">
						{{ t('nextcloud-vue', 'Updated') }}
					</td>
					<td class="cn-advanced-form-dialog__table-col-expanded">
						{{ metadataUpdated }}
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
export default {
	name: 'CnMetadataTab',

	props: {
		item: { type: Object, default: null },
		formData: { type: Object, default: () => ({}) },
	},

	computed: {
		metadataId() {
			const o = this.item?.['@self']
			return o?.id ?? this.item?.id ?? '—'
		},

		metadataCreated() {
			const o = this.item?.['@self']
			const v = o?.created
			return v ? new Date(v).toLocaleString() : '—'
		},

		metadataUpdated() {
			const o = this.item?.['@self']
			const v = o?.updated
			return v ? new Date(v).toLocaleString() : '—'
		},
	},
}
</script>

<style scoped>
.cn-advanced-form-dialog__table-container {
	background: var(--color-main-background);
	border-radius: var(--border-radius);
	overflow: hidden;
	box-shadow: 0 2px 4px var(--color-box-shadow);
	border: 1px solid var(--color-border);
	margin-bottom: calc(5 * var(--default-grid-baseline));
}

.cn-advanced-form-dialog__table {
	width: 100%;
	border-collapse: collapse;
	background-color: var(--color-main-background);
}

.cn-advanced-form-dialog__table th,
.cn-advanced-form-dialog__table td {
	padding: calc(3 * var(--default-grid-baseline));
	text-align: left;
	border-bottom: 1px solid var(--color-border);
	vertical-align: middle;
}

.cn-advanced-form-dialog__table th {
	background: var(--color-background-dark);
	font-weight: 500;
	color: var(--color-text-maxcontrast);
}

.cn-advanced-form-dialog__table-row {
	cursor: default;
	background-color: var(--color-main-background);
}

.cn-advanced-form-dialog__table-col-constrained {
	width: 150px;
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-advanced-form-dialog__table-col-expanded {
	width: auto;
	min-width: 200px;
}
</style>
