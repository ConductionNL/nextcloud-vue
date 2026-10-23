<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-saved-view-look" data-testid="cn-saved-view-look-fields">
		<NcTextField
			:modelValue="description"
			:label="t('nextcloud-vue', 'Description')"
			:labelVisible="true"
			:helperText="t('nextcloud-vue', 'Shown when you point at the view in the menu.')"
			data-testid="cn-saved-view-description"
			@update:modelValue="(v) => $emit('update:description', v)" />
		<div
			class="cn-saved-view-look__icons"
			role="radiogroup"
			:aria-label="t('nextcloud-vue', 'Icon')"
			data-testid="cn-saved-view-icon">
			<span class="cn-saved-view-look__label" aria-hidden="true">{{ t('nextcloud-vue', 'Icon') }}</span>
			<button
				v-for="name in iconNames"
				:key="name"
				type="button"
				role="radio"
				class="cn-saved-view-look__icon"
				:class="{ 'cn-saved-view-look__icon--chosen': name === chosenIcon }"
				:aria-checked="name === chosenIcon ? 'true' : 'false'"
				:aria-label="name"
				:title="name"
				:data-icon="name"
				@click="$emit('update:icon', name === defaultIcon ? '' : name)">
				<component :is="componentOf(name)" :size="20" />
			</button>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcTextField } from '@nextcloud/vue'
import { SAVED_VIEW_ICONS, SAVED_VIEW_MENU_DEFAULT_ICON } from '../../utils/savedViewMenu.js'
import { getSemanticIconComponent } from '../CnIcon/semanticIcons.js'

/**
 * CnSavedViewLookFields — a saved view's description and icon, in the save
 * and edit dialogs. The description is the tooltip on the view's menu entry;
 * the icon stands before it in the menu. The icons are a short list from the
 * shared semantic vocabulary, so every one resolves in the menu without the
 * app registering it. Choosing the menu's own default icon stores none.
 *
 * @event {string} update:description The typed description.
 * @event {string} update:icon The chosen icon name, '' for the default.
 * @spec openspec/changes/saved-view-icon-description-count/specs/saved-view-icon-description-count/spec.md#requirement-a-saved-view-has-an-icon-and-a-description
 */
export default {
	name: 'CnSavedViewLookFields',

	components: { NcTextField },

	props: {
		/** The view's description. */
		description: {
			type: String,
			default: '',
		},

		/** The view's icon name, '' for the menu's default. */
		icon: {
			type: String,
			default: '',
		},
	},

	emits: ['update:description', 'update:icon'],

	computed: {
		/** @return {string} The icon the menu falls back to. */
		defaultIcon() {
			return SAVED_VIEW_MENU_DEFAULT_ICON
		},

		/** @return {Array<string>} The icons offered, the default first. */
		iconNames() {
			return SAVED_VIEW_ICONS
		},

		/** @return {string} The icon shown as chosen. */
		chosenIcon() {
			return this.icon && SAVED_VIEW_ICONS.includes(this.icon) ? this.icon : SAVED_VIEW_MENU_DEFAULT_ICON
		},
	},

	methods: {
		t,

		/**
		 * @param {string} name An icon name.
		 * @return {object|null} Its component.
		 */
		componentOf(name) {
			return getSemanticIconComponent(name)
		},
	},
}
</script>

<style scoped>
.cn-saved-view-look {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-saved-view-look__icons {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.cn-saved-view-look__label {
	flex: 0 0 100%;
	font-weight: 600;
}

.cn-saved-view-look__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--default-clickable-area);
	height: var(--default-clickable-area);
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-saved-view-look__icon--chosen {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
}

.cn-saved-view-look__icon:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}
</style>
