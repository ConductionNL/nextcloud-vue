<template>
	<!-- Keeps the legacy `cn-form-dialog__helper` class alongside its own so
	     consumer stylesheets that target the old helper span still apply. -->
	<span
		v-if="error || text"
		class="cn-field-helper cn-form-dialog__helper"
		:class="{ 'cn-field-helper--error': !!error, 'cn-form-dialog__helper--error': !!error }">
		{{ error || text }}
		<NcPopover
			v-if="!error && more"
			v-model:shown="open"
			:triggers="[]"
			popup-role="dialog"
			popover-base-class="cn-field-helper__popper">
			<template #trigger>
				<button
					type="button"
					class="cn-field-helper__trigger"
					:aria-label="t('nextcloud-vue', 'Show the full description')"
					:aria-expanded="open"
					@click="open = !open">
					<InformationOutline :size="16" />
				</button>
			</template>
			<div class="cn-field-helper__full">
				{{ more }}
			</div>
		</NcPopover>
	</span>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcPopover } from '@nextcloud/vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'

/**
 * CnFieldHelper — the helper line rendered under a form field.
 *
 * Shows the validation error when there is one, otherwise the field's
 * description. When the description was too long to sit inline,
 * `fieldsFromSchema` splits it and puts the full text on the field's
 * `descriptionLong`; pass that as `more` and this renders an ⓘ button that
 * reveals it in a popover, so a paragraph-length schema description cannot
 * push the rest of the form off screen.
 *
 * `CnFormDialog` uses this for every auto-generated field. Use it directly when
 * rendering your own fields through the `#form-fields` or `#field-<key>` slots,
 * so a custom form surface keeps the same behaviour:
 *
 * ```vue
 * <CnFieldHelper
 *   :text="field.description"
 *   :more="field.descriptionLong"
 *   :error="errors[field.key]" />
 * ```
 */
export default {
	name: 'CnFieldHelper',

	components: {
		NcPopover,
		InformationOutline,
	},

	props: {
		/** Inline helper text (a field's short description). */
		text: { type: String, default: '' },
		/** Full description, shown in the popover. Empty → no info button. */
		more: { type: String, default: '' },
		/** Validation error; replaces the helper text and hides the popover. */
		error: { type: String, default: '' },
	},

	data() {
		return {
			open: false,
		}
	},

	methods: {
		t,
	},
}
</script>

<style scoped>
/* Mirrors `.cn-form-dialog__helper` so the line looks identical now that it
   renders from this component rather than inline in CnFormDialog.
   Flex row because NcPopover's trigger wrapper is a plain <div> (floating-vue
   renders `<div class="v-popper">`), which as a block pushed the ⓘ onto its own
   line under the text. Making the helper a flex container puts the wrapper back
   beside the text. */
.cn-field-helper {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-field-helper--error {
	color: var(--color-error);
}

/* The button sits inside NcPopover's wrapper, so it is that wrapper — not the
   button — that must hold its width against the text beside it. */
.cn-field-helper > :deep(.v-popper) {
	flex: 0 0 auto;
	display: inline-flex;
}

/* Server's core/css/inputs.css gives every bare button
   `min-height: var(--default-clickable-area)` with `width: auto`, so the target
   came out 34px tall but only as wide as the 16px glyph. Size both axes to the
   clickable area and centre the icon in it. */
.cn-field-helper__trigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: var(--default-clickable-area);
	block-size: var(--default-clickable-area);
	padding: 0;
	border: none;
	background: transparent;
	color: var(--color-text-maxcontrast);
	cursor: pointer;
}

/* vue-material-design-icons ships a stylesheet nothing here imports, so the
   icon span is an unstyled inline box and its svg sits on the text baseline
   with descender slack under it — enough to read as off-centre. Make it a flex
   box so the glyph is the whole item and centres exactly. */
.cn-field-helper__trigger :deep(.material-design-icon) {
	display: flex;
	line-height: 1;
}

.cn-field-helper__trigger:hover,
.cn-field-helper__trigger:focus-visible {
	color: var(--color-main-text);
}

.cn-field-helper__full {
	max-width: 380px;
	max-height: 320px;
	overflow-y: auto;
	padding: 12px;
	font-size: 0.9em;
	line-height: 1.4;
	white-space: pre-wrap;
}
</style>
