<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		data-testid="cn-replace-values-dialog"
		@closing="$emit('decline')">
		<ul class="cn-replace-values__list">
			<li v-for="row in rows" :key="row.key" class="cn-replace-values__row">
				<strong>{{ row.label }}</strong>
				<span class="cn-replace-values__old">{{ row.oldText }}</span>
				<span class="cn-replace-values__new">{{ row.newText }}</span>
			</li>
		</ul>
		<template #actions>
			<NcButton data-testid="cn-replace-values-decline" @click="$emit('decline')">
				{{ keepLabel }}
			</NcButton>
			<NcButton variant="primary" data-testid="cn-replace-values-accept" @click="$emit('accept')">
				{{ replaceLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog } from '@nextcloud/vue'

/**
 * CnReplaceValuesDialog — asks, in one list, whether to replace values the user
 * already entered with the ones a lookup returned. Used by `CnFormDialog` after
 * a registry pick (`x-openregister-property-source`) when a fill would overwrite.
 */
export default {
	name: 'CnReplaceValuesDialog',

	components: { NcButton, NcDialog },

	props: {
		/** Dialog heading. */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Replace these values?'),
		},

		/**
		 * Values that would change.
		 *
		 * @type {Array<{key: string, label: string, oldValue: *, newValue: *}>}
		 */
		changes: {
			type: Array,
			default: () => [],
		},

		/** Label of the button that keeps the typed values. */
		keepLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Keep mine'),
		},

		/** Label of the button that replaces them. */
		replaceLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Replace'),
		},
	},

	emits: ['accept', 'decline'],

	computed: {
		rows() {
			const text = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v))
			return this.changes.map((c) => ({ key: c.key, label: c.label || c.key, oldText: text(c.oldValue), newText: text(c.newValue) }))
		},
	},
}
</script>

<style scoped>
.cn-replace-values__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-replace-values__row {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-replace-values__old {
	color: var(--color-text-maxcontrast);
	text-decoration: line-through;
}
</style>
