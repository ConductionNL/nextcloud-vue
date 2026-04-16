<template>
	<div class="cn-settings-card" :class="{ 'cn-settings-card--collapsible': collapsible }">
		<h4
			v-if="title"
			:class="{ 'cn-settings-card__header--clickable': collapsible }"
			@click="collapsible ? toggleCollapsed() : null">
			<span>{{ icon }} {{ title }}</span>
			<ChevronDown
				v-if="collapsible && !isCollapsed"
				:size="20"
				class="cn-settings-card__chevron" />
			<ChevronUp
				v-if="collapsible && isCollapsed"
				:size="20"
				class="cn-settings-card__chevron" />
		</h4>

		<transition v-if="collapsible" name="cn-slide-fade">
			<div v-show="!isCollapsed" class="cn-settings-card__content">
				<slot />
			</div>
		</transition>

		<div v-else>
			<slot />
		</div>
	</div>
</template>

<script>
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'

/**
 * CnSettingsCard — Collapsible card for settings and configuration sections.
 *
 * Extracted from OpenRegister's SettingsCard. Provides a titled card with
 * optional collapse/expand animation.
 *
 * @example
 * <CnSettingsCard title="Database Settings" icon="🗄️" collapsible>
 *   <p>Content here</p>
 * </CnSettingsCard>
 */
export default {
	name: 'CnSettingsCard',

	components: {
		ChevronDown,
		ChevronUp,
	},

	props: {
		/** Card title text */
		title: {
			type: String,
			default: '',
		},
		/** Icon emoji or text displayed before the title */
		icon: {
			type: String,
			default: '',
		},
		/** Whether the card can be collapsed */
		collapsible: {
			type: Boolean,
			default: false,
		},
		/** Whether the card starts collapsed (only applies when collapsible) */
		defaultCollapsed: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			isCollapsed: this.defaultCollapsed,
		}
	},

	methods: {
		toggleCollapsed() {
			if (this.collapsible) {
				this.isCollapsed = !this.isCollapsed
				/** @event toggle Emitted when collapse state changes. Payload: isCollapsed boolean. */
				this.$emit('toggle', this.isCollapsed)
			}
		},
	},
}
</script>
