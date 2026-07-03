<!--
  CnCalendarEventCreate — modal that creates a new VEVENT and links it
  to an OpenRegister object.

  Emits `created` with the new event payload after a successful POST to
  `/api/objects/{register}/{schema}/{id}/events` (Tier-2: this writes
  both the X-OPENREGISTER-* properties on the VEVENT AND a link-table
  row). Emits `close` when cancelled.

  ADR-004 modal isolation: lives in its own .vue file under
  `src/components/CnCalendarEventCreate/`. Hosted by CnCalendarTab
  via `<NcModal>`.
-->
<template>
	<NcDialog
		size="normal"
		:name="title"
		@closing="onClose">
		<div class="cn-calendar-event-create">
			<form class="cn-calendar-event-create__form" @submit.prevent="submit">
				<NcTextField
					v-model="form.summary"
					:label="summaryLabel"
					required />

				<div class="cn-calendar-event-create__grid">
					<NcDateTimePickerNative
						id="cn-cec-start"
						v-model="form.dtstart"
						:label="startLabel"
						type="datetime" />
					<NcDateTimePickerNative
						id="cn-cec-end"
						v-model="form.dtend"
						:label="endLabel"
						type="datetime" />
				</div>

				<NcTextField
					v-model="form.location"
					:label="locationLabel" />

				<NcTextArea
					v-model="form.description"
					:label="descriptionLabel"
					rows="3" />

				<div v-if="error" class="cn-calendar-event-create__banner cn-calendar-event-create__banner--error" role="alert">
					{{ error }}
				</div>
			</form>
		</div>

		<template #actions>
			<NcButton variant="tertiary" @click="onClose">
				{{ cancelLabel }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canSubmit || saving"
				@click="submit">
				<template v-if="saving" #icon>
					<NcLoadingIcon :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcDialog,
	NcButton,
	NcTextField,
	NcTextArea,
	NcLoadingIcon,
	NcDateTimePickerNative,
} from '@nextcloud/vue'
import { buildHeaders } from '../../utils/index.js'

/**
 * Build a default start time at the next round hour.
 *
 * @return {Date} The next round hour.
 */
function nextRoundHour() {
	const d = new Date()
	d.setMinutes(0, 0, 0)
	d.setHours(d.getHours() + 1)
	return d
}

export default {
	name: 'CnCalendarEventCreate',

	components: {
		NcDialog,
		NcButton,
		NcTextField,
		NcTextArea,
		NcLoadingIcon,
		NcDateTimePickerNative,
	},

	props: {
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Base API URL for OpenRegister. */
		apiBase: { type: String, default: '/apps/openregister/api' },

		// --- Pre-translated labels (ADR-007) ---
		/** Pre-translated dialog title. */
		title: { type: String, default: () => t('nextcloud-vue', 'New meeting') },
		/** Pre-translated label for the summary field. */
		summaryLabel: { type: String, default: () => t('nextcloud-vue', 'Summary') },
		/** Pre-translated label for the start date-time field. */
		startLabel: { type: String, default: () => t('nextcloud-vue', 'Start') },
		/** Pre-translated label for the end date-time field. */
		endLabel: { type: String, default: () => t('nextcloud-vue', 'End') },
		/** Pre-translated label for the location field. */
		locationLabel: { type: String, default: () => t('nextcloud-vue', 'Location') },
		/** Pre-translated label for the description field. */
		descriptionLabel: { type: String, default: () => t('nextcloud-vue', 'Description') },
		/** Pre-translated label for the Cancel button. */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Pre-translated label for the confirm (Create) button. */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Create meeting') },
	},

	emits: ['created', 'close'],

	data() {
		const start = nextRoundHour()
		const end = new Date(start.getTime() + (60 * 60 * 1000))
		return {
			form: {
				summary: '',
				dtstart: start,
				dtend: end,
				location: '',
				description: '',
			},
			error: '',
			saving: false,
		}
	},

	computed: {
		canSubmit() {
			return this.form.summary.trim().length > 0
		},
	},

	methods: {
		async submit() {
			if (!this.canSubmit || this.saving) return
			this.saving = true
			this.error = ''
			try {
				const payload = {
					summary: this.form.summary.trim(),
				}
				if (this.form.dtstart) {
					const start = new Date(this.form.dtstart)
					if (!Number.isNaN(start.getTime())) {
						payload.dtstart = start.toISOString()
					}
				}
				if (this.form.dtend) {
					const end = new Date(this.form.dtend)
					if (!Number.isNaN(end.getTime())) {
						payload.dtend = end.toISOString()
					}
				}
				if (this.form.location.trim()) payload.location = this.form.location.trim()
				if (this.form.description.trim()) payload.description = this.form.description.trim()

				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/events`,
					{
						method: 'POST',
						headers: buildHeaders(),
						body: JSON.stringify(payload),
					},
				)
				if (response.ok) {
					const created = await response.json().catch(() => ({}))
					/**
					 * @event created
					 *   Emitted after a successful POST. Payload: the new event row.
					 */
					this.$emit('created', created)
				} else {
					let message = t('nextcloud-vue', 'Could not create the meeting.')
					try {
						const body = await response.json()
						if (body && typeof body.error === 'string') message = body.error
					} catch (_) { /* ignore */ }
					this.error = message
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarEventCreate] failed to create event', err)
				this.error = t('nextcloud-vue', 'Could not create the meeting.')
			} finally {
				this.saving = false
			}
		},

		onClose() {
			/** @event close Emitted when the dialog should be closed (cancel or close button). */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-calendar-event-create {
	padding: 20px;
	min-width: 480px;
}

.cn-calendar-event-create__form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-calendar-event-create__grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}

.cn-calendar-event-create__banner {
	padding: 8px 12px;
	border-radius: var(--border-radius);
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-calendar-event-create__banner--error {
	background: var(--color-error, #e9322d);
}
</style>
