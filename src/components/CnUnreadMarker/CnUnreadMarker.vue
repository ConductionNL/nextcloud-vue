<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<span class="cn-unread-marker" data-testid="cn-unread-marker">
		<span class="cn-unread-marker__dot" aria-hidden="true" />
		<span class="hidden-visually">{{ label }}</span>
	</span>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * CnUnreadMarker — a dot for a record that changed since the user last looked
 * (`@self.unread`). The dot is `aria-hidden`; a visually hidden "Unread"
 * precedes the title so a screen reader announces it once per row.
 * `CnDataTable` renders it in the first cell of an unread row and draws the
 * row in bold.
 *
 * Example:
 * ```vue
 * <CnUnreadMarker v-if="row['@self'].unread" />
 * ```
 */
export default {
	name: 'CnUnreadMarker',

	props: {
		/** Text for assistive technology. */
		label: {
			type: String,
			default: () => t('nextcloud-vue', 'Unread'),
		},
	},
}
</script>

<style scoped>
.cn-unread-marker {
	display: inline-flex;
	align-items: center;
	margin-inline-end: 6px;
	vertical-align: middle;
}

.cn-unread-marker__dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color-primary-element);
}
</style>
