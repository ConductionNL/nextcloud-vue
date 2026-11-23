<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnWidgetEmptyState
		v-if="isBoard"
		size="card"
		:name="name"
		:description="description"
		:variant="error ? 'error' : 'neutral'"
		v-bind="$attrs">
		<template v-if="$slots.icon" #icon>
			<!-- @slot icon The icon shown in the circle. -->
			<slot name="icon" />
		</template>
		<template v-if="$slots.action" #action>
			<!-- @slot action A single call to action under the description. -->
			<slot name="action" />
		</template>
	</CnWidgetEmptyState>
	<NcEmptyContent v-else
		:name="name"
		:description="description"
		v-bind="$attrs">
		<template v-if="$slots.icon" #icon>
			<slot name="icon" />
		</template>
		<template v-if="$slots.action" #action>
			<slot name="action" />
		</template>
	</NcEmptyContent>
</template>

<script>
import { NcEmptyContent } from '@nextcloud/vue'
import CnWidgetEmptyState from '../CnWidgetEmptyState/CnWidgetEmptyState.vue'
import { normalizeLook } from '../../composables/useLook.js'

/**
 * CnEmptyContent — the library's one switch between the two empty states.
 *
 * In the board look (`cnLook` = `board`, provided by CnAppRoot) it draws the
 * card-size `CnWidgetEmptyState`; in the Nextcloud look it keeps
 * `NcEmptyContent`. It takes `NcEmptyContent`'s `name`, `description`, `icon`
 * and `action` API so a component swaps one tag for the other. Internal to the
 * library: consumers use `CnWidgetEmptyState` or `NcEmptyContent` directly.
 */
export default {
	name: 'CnEmptyContent',

	components: { CnWidgetEmptyState, NcEmptyContent },

	inject: {
		/** The app's look, provided by CnAppRoot (`nextcloud` or `board`). */
		cnLook: { default: 'nextcloud' },
	},

	inheritAttrs: false,

	props: {
		/** What is empty, in the user's words. */
		name: {
			type: String,
			default: '',
		},

		/** An optional second line. */
		description: {
			type: String,
			default: '',
		},

		/** Draw the error variant (error-coloured icon) in the board look. */
		error: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		/**
		 * Whether the board look is active.
		 *
		 * @return {boolean} True in the board look.
		 */
		isBoard() {
			return normalizeLook(this.cnLook) === 'board'
		},
	},
}
</script>
