<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcButton
		class="cn-favourite-toggle"
		:class="{ 'cn-favourite-toggle--on': state }"
		variant="tertiary"
		:aria-pressed="state ? 'true' : 'false'"
		:aria-label="label"
		:title="label"
		:disabled="busy"
		data-testid="cn-favourite-toggle"
		@click.stop="toggle">
		<template #icon>
			<Star v-if="state" :size="20" class="cn-favourite-toggle__star" />
			<StarOutline v-else :size="20" />
		</template>
	</NcButton>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Star from 'vue-material-design-icons/Star.vue'
import StarOutline from 'vue-material-design-icons/StarOutline.vue'
import { patchStoredSelf } from '../../utils/patchStoredSelf.js'
import { setFavourite } from '../../utils/recordInteractions.js'

/**
 * CnFavouriteToggle — a star bound to a record's `@self.favourite` marker.
 *
 * @deprecated Following and favourites are one feature since OpenRegister's
 * `merge-follow-and-favourites`: a favourite is a follow with notifications
 * off. Use `CnFollowToggle`. Neither `CnDetailPage` nor `CnIndexPage` renders
 * this star any more; it stays exported for one minor line so an app that
 * placed it itself keeps working (the server answers it as a quiet follow).
 *
 * A click flips the star at once and sends `PUT` (star) or `DELETE` (unstar)
 * `/apps/openregister/api/objects/{register}/{schema}/{id}/favourite`; on
 * failure it flips back and shows the server's message. The server's answer is
 * written into the stored object's `@self`, so a list showing the same record
 * agrees.
 *
 * Example:
 * ```vue
 * <CnFavouriteToggle register="pipelinq" schema="ticket" :object-id="id"
 *   :favourite="object['@self'].favourite" />
 * ```
 */
export default {
	name: 'CnFavouriteToggle',

	components: { NcButton, Star, StarOutline },

	props: {
		/** Register slug of the record. */
		register: {
			type: String,
			required: true,
		},

		/** Schema slug of the record. */
		schema: {
			type: String,
			required: true,
		},

		/** Id of the record. */
		objectId: {
			type: String,
			required: true,
		},

		/** Whether the record is currently starred (`@self.favourite`). */
		favourite: {
			type: Boolean,
			default: false,
		},

		/** Accessible label when the record is not starred. */
		addLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Add to favourites'),
		},

		/** Accessible label when the record is starred. */
		removeLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Remove from favourites'),
		},
	},

	emits: ['change', 'error', 'not-found', 'update:favourite'],

	data() {
		return { state: this.favourite, busy: false }
	},

	computed: {
		label() {
			return this.state ? this.removeLabel : this.addLabel
		},
	},

	watch: {
		favourite(value) {
			this.state = value
		},
	},

	methods: {
		async toggle() {
			if (this.busy) {
				return
			}
			const previous = this.state
			this.state = !previous
			this.busy = true
			const result = await setFavourite(this.register, this.schema, this.objectId, this.state)
			this.busy = false
			if (!result.ok) {
				this.state = previous
				const message = result.status === 404
					? t('nextcloud-vue', 'You can no longer see this record.')
					: (result.message || t('nextcloud-vue', 'Could not change the favourite.'))
				import('@nextcloud/dialogs').then(({ showError }) => showError(message)).catch(() => {})
				/** @event error Emitted when the call failed; payload is the message shown. */
				this.$emit('error', message)
				if (result.status === 404) {
					/** @event not-found Emitted on a 404: the record went away or access was withdrawn. */
					this.$emit('not-found')
				}
				return
			}
			patchStoredSelf(this.register, this.schema, this.objectId, { favourite: this.state })
			/** @event change Emitted after a successful call. Payload: `{ favourite }`. */
			this.$emit('change', { favourite: this.state })
			/** @event update:favourite Emitted with the new state, for `v-model:favourite`. */
			this.$emit('update:favourite', this.state)
		},
	},
}
</script>

<style scoped>
.cn-favourite-toggle__star {
	color: var(--color-warning);
}
</style>
