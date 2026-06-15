<!--
  CnObjectMetadataModal — Read-only object metadata in a small dialog.

  A thin NcDialog wrapper around CnObjectMetadataWidget. Surfaces an
  object's @self / system metadata (id, uuid, uri, register, schema,
  created, updated, owner, …) on demand — e.g. from the "Metadata" item
  in a widget's overflow Actions menu — instead of taking up permanent
  space on the detail page.
-->
<template>
	<NcDialog
		:open="open"
		:name="name"
		size="small"
		@update:open="onUpdateOpen">
		<CnObjectMetadataWidget
			title=""
			:object-data="objectData"
			:include="include"
			:exclude="exclude" />
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog } from '@nextcloud/vue'
import { CnObjectMetadataWidget } from '../CnObjectMetadataWidget/index.js'

/**
 * CnObjectMetadataModal — Read-only object metadata in a small dialog.
 *
 * Reuses CnObjectMetadataWidget for the body (with its card header
 * suppressed, since the dialog supplies the title). Mount it with `v-if`
 * and listen for `@close`, or bind `:open` and listen for `@update:open`.
 *
 * ```vue
 * <CnObjectMetadataModal
 *   v-if="metadataOpen"
 *   :object-data="object"
 *   @close="metadataOpen = false" />
 * ```
 */
export default {
	name: 'CnObjectMetadataModal',

	components: {
		NcDialog,
		CnObjectMetadataWidget,
	},

	props: {
		/** Whether the dialog is open. */
		open: {
			type: Boolean,
			default: true,
		},
		/** Dialog title. */
		name: {
			type: String,
			default: () => t('nextcloud-vue', 'Metadata'),
		},
		/**
		 * The object whose metadata to display. Supports flat objects and
		 * objects carrying a `@self` metadata block.
		 */
		objectData: {
			type: Object,
			required: true,
		},
		/**
		 * Metadata fields to include (whitelist). When null, all available
		 * fields are shown.
		 * @type {string[]|null}
		 */
		include: {
			type: Array,
			default: null,
		},
		/**
		 * Metadata fields to exclude.
		 * @type {string[]}
		 */
		exclude: {
			type: Array,
			default: () => [],
		},
	},

	emits: ['update:open', 'close'],

	methods: {
		/**
		 * Forward NcDialog's open-state change. Re-emits `update:open` for
		 * `:open`-bound hosts and `close` for `v-if`-mounted hosts.
		 * @param {boolean} value - The new open state.
		 */
		onUpdateOpen(value) {
			/**
			 * @event update:open The dialog open state changed.
			 * @type {boolean}
			 */
			this.$emit('update:open', value)
			if (!value) {
				/**
				 * @event close The dialog was dismissed.
				 */
				this.$emit('close')
			}
		},
	},
}
</script>
