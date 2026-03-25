<!--
    This code was taken from nextcloud-vue due to certain changes being required but unable to be done as a patch.

    https://github.com/nextcloud-libraries/nextcloud-vue/blob/main/src/components/NcNoteCard/NcNoteCard.vue
-->
<template>
	<div
		class="notecard"
		:class="{
			[`notecard--${type}`]: type,
		}"
		:role="shouldShowAlert ? 'alert' : 'note'">
		<slot name="icon">
			<NcIconSvgWrapper
				:path="iconPath"
				class="notecard__icon"
				:class="{ 'notecard__icon--heading': heading }"
				inline />
		</slot>
		<div>
			<p v-if="heading" class="notecard__heading">
				{{ heading }}
			</p>
			<slot>
				<p class="notecard__text">
					{{ text }}
				</p>
			</slot>
		</div>
	</div>
</template>

<script>
import { NcIconSvgWrapper } from '@nextcloud/vue'

// hardcoded @mdi/js icons to avoid unnececary package and bundlesize
// we are only doing this to patch NcNoteCard anyway
const mdiAlert = 'M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z'
const mdiAlertDecagram = 'M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M13,17H11V15H13V17M13,13H11V7H13V13Z'
const mdiCheckboxMarkedCircle = 'M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z'
const mdiInformation = 'M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 12,2Z'

export default {
	name: 'CnNoteCard',
	components: {
		NcIconSvgWrapper,
	},
	props: {
		/** Optional text to show as a heading of the note card */
		heading: {
			type: String,
			default: undefined,
		},
		/**
		 * Enforce the `alert` role on the note card.
		 *
		 * The alert role should only be used for information that requires the user's immediate attention.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/alert_role
		 */
		showAlert: {
			type: Boolean,
			default: undefined,
		},
		/** The message text of the note card */
		text: {
			type: String,
			default: undefined,
		},
		/** Type or severity of the message */
		type: {
			type: String,
			default: 'warning',
			validator: (value) =>
				['success', 'info', 'warning', 'error'].includes(value),
		},
	},
	computed: {
		shouldShowAlert() {
			return this.showAlert || this.type === 'error'
		},
		iconPath() {
			switch (this.type) {
			case 'error':
				return mdiAlertDecagram
			case 'success':
				return mdiCheckboxMarkedCircle
			case 'info':
				return mdiInformation
			case 'warning':
			default:
				return mdiAlert
			}
		},
	},
}
</script>

<!-- we do not have support for scss so this has been translated to css -->
<!-- @TODO add scss support -->
<style scoped>
.notecard {
  --note-card-icon-size: 20px;
  --note-card-padding: calc(2 * var(--default-grid-baseline));
  color: var(--color-main-text) !important;
  background-color: var(--note-background) !important;
  border-inline-start: var(--default-grid-baseline) solid var(--note-theme);
  border-radius: var(--border-radius-small);
  margin: 1rem 0;
  padding: var(--note-card-padding);
  display: flex;
  flex-direction: row;
  gap: var(--note-card-padding);
}

.notecard__heading {
  font-size: var(--note-card-icon-size); /* Same as icon */
  font-weight: 600;
}

.notecard__icon {
  color: var(--note-theme);
}
.notecard__icon--heading {
  font-size: var(--note-card-icon-size);
  /* Ensure icon is on the same height as the heading */
  margin-block: calc((1lh - 1em) / 2) auto;
}

.notecard--success {
    --note-background: var(--color-success);
    --note-theme: var(--color-success-text);
  }

.notecard--info {
    --note-background: var(--color-info);
    --note-theme: var(--color-info-text);
  }

.notecard--error {
    --note-background: var(--color-error);
    --note-theme: var(--color-error-text);
  }

.notecard--warning {
    --note-background: var(--color-warning);
    --note-theme: var(--color-warning-text);
  }
</style>
