<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<span
		class="cn-visibility-chip"
		:class="`cn-visibility-chip--${effective}`"
		:data-visibility="effective"
		data-testid="cn-visibility-chip">
		<EyeOutline v-if="effective === 'public'" :size="14" aria-hidden="true" />
		<LockOutline v-else :size="14" aria-hidden="true" />
		<span class="cn-visibility-chip__label">{{ label }}</span>
	</span>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import EyeOutline from 'vue-material-design-icons/EyeOutline.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'

/**
 * CnVisibilityChip — whether a timeline entry is internal or public, read from
 * its label first (the icon and the border reinforce it, never carry it, WCAG
 * 2.2 AA 1.4.1). An entry with no value reads as internal, which is
 * OpenRegister's own read-time fallback. Used by `CnNotesCard` and the activity
 * tab and card.
 */
export default {
	name: 'CnVisibilityChip',

	components: { EyeOutline, LockOutline },

	props: {
		/** `'public'` or `'internal'`; anything else, or nothing, reads as internal. */
		visibility: {
			type: String,
			default: '',
		},
	},

	computed: {
		effective() {
			return this.visibility === 'public' ? 'public' : 'internal'
		},

		label() {
			return this.effective === 'public' ? t('nextcloud-vue', 'Public') : t('nextcloud-vue', 'Internal')
		},
	},
}
</script>

<style scoped>
.cn-visibility-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 0 8px;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: var(--border-radius-pill);
	font-size: var(--font-size-small, 13px);
	line-height: 20px;
	color: var(--color-main-text);
	white-space: nowrap;
}

.cn-visibility-chip--public {
	border-style: solid;
	border-width: 2px;
}

.cn-visibility-chip--internal {
	border-style: dashed;
}
</style>
