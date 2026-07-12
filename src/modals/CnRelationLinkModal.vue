<!--
  CnRelationLinkModal — link an existing related object to the current object.

  Async-searches a target register+schema (via CnResourceSelect in link-mode:
  allowCreate stays opt-in) and, on confirm, PATCHes a foreign-key field on the
  current object with the chosen object's id. Used by CnDetailPage's declarative
  relation-link action. Isolated NcModal file per ADR-004; the NcSelect inside
  CnResourceSelect carries an inputLabel.
-->
<template>
	<NcDialog size="small" :name="title" @closing="$emit('close')">
		<div class="cn-relation-link" data-testid="cn-relation-link-modal">
			<CnResourceSelect
				:register="register"
				:schema="schema"
				:label-field="labelField"
				:allow-create="allowCreate"
				:model-value="selectedId"
				:input-label="selectLabel"
				@update:modelValue="selectedId = $event" />
			<p v-if="error" class="cn-relation-link__error" data-testid="cn-relation-link-error">
				{{ error }}
			</p>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton variant="primary" :disabled="!selectedId || saving" @click="onConfirm">
				<template v-if="saving" #icon>
					<NcLoadingIcon :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcDialog } from '@nextcloud/vue'
import CnResourceSelect from '../components/CnResourceSelect/CnResourceSelect.vue'
import { useObjectStore } from '../store/index.js'

/**
 * CnRelationLinkModal — pick an existing object from a target schema and patch a
 * foreign-key field on the current object with its id.
 *
 * Reuses `CnResourceSelect`'s async search (link-mode: `allowCreate` defaults to
 * false, so it behaves as a plain existing-object picker — set `allowCreate` to
 * let an agent create-and-link inline). On confirm it merges
 * `{ [fkField]: <selectedId> }` onto the current object and saves via
 * `objectStore.saveObject`, then emits `linked` with the updated object so the
 * host (CnDetailPage) can reload.
 */
export default {
	name: 'CnRelationLinkModal',

	components: { NcDialog, NcButton, NcLoadingIcon, CnResourceSelect },

	props: {
		/** Modal heading. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Link related object'),
		},
		/** Accessible label for the picker. */
		selectLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Search…'),
		},
		/** Target register slug to search. */
		register: {
			type: String,
			required: true,
		},
		/** Target schema slug to search. */
		schema: {
			type: String,
			required: true,
		},
		/** Field used as the option label. */
		labelField: {
			type: String,
			default: 'name',
		},
		/** Whether the picker offers inline create from the search term. */
		allowCreate: {
			type: Boolean,
			default: false,
		},
		/**
		 * The object-type slug of the CURRENT object being patched
		 * (`${register}-${schema}`). Required to save through the store.
		 */
		currentType: {
			type: String,
			required: true,
		},
		/** The CURRENT object being patched (must carry an `id`). */
		currentObject: {
			type: Object,
			required: true,
		},
		/** The foreign-key field on the current object to write the chosen id into. */
		fkField: {
			type: String,
			required: true,
		},
	},

	emits: ['linked', 'close'],

	data() {
		return {
			selectedId: '',
			saving: false,
			error: '',
		}
	},

	computed: {
		/** Pinia store handle (lazy so a Pinia-less test still mounts). */
		objectStore() {
			try {
				return useObjectStore()
			} catch (e) {
				return null
			}
		},
	},

	methods: {
		/**
		 * Patch the FK field on the current object with the selected id and save.
		 *
		 * @return {Promise<void>}
		 */
		async onConfirm() {
			if (!this.selectedId || !this.objectStore) return
			this.saving = true
			this.error = ''
			try {
				const payload = { ...this.currentObject, [this.fkField]: this.selectedId }
				const saved = await this.objectStore.saveObject(this.currentType, payload)
				if (!saved) {
					const err = this.objectStore.errors && this.objectStore.errors[this.currentType]
					this.error = (err && err.toString && err.toString()) || t('nextcloud-vue', 'Could not link the object.')
					return
				}
				/**
				 * @event linked The FK was patched and saved. Payload is the updated object.
				 * @type {object}
				 */
				this.$emit('linked', saved)
				this.$emit('close')
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Could not link the object.')
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-relation-link {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-relation-link__error {
	color: var(--color-error);
	font-size: 0.85em;
	margin: 0;
}
</style>
