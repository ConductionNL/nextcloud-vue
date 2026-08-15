<template>
	<div
		:id="panelId"
		class="cn-tab"
		role="tabpanel"
		:aria-labelledby="tabId"
		:tabindex="visible ? 0 : -1"
		:hidden="visible ? null : true"
		:style="visible ? null : { display: 'none' }">
		<!-- @slot The panel body. -->
		<slot />
	</div>
</template>

<script>
/**
 * CnTab — one panel inside a `CnTabs` strip.
 *
 * ```vue
 * <CnTab title="Documents">…</CnTab>
 *
 * <CnTab :active="selected === i" @click="selected = i">
 *   <template #title>
 *     {{ label }} <CnIcon name="close" @click.stop="close(i)" />
 *   </template>
 *   …
 * </CnTab>
 * ```
 *
 * ## The panel stays in the DOM
 *
 * An inactive panel is hidden with `hidden` + `display: none`, not removed with
 * `v-if`. This matches bootstrap-vue's `<BTab>`, and it is load-bearing: panels
 * that fetch on `mounted()` would refire that request on every tab switch if
 * they were destroyed and recreated. Use `v-if` inside the panel yourself if
 * you specifically want teardown.
 *
 * ## Rendered outside a CnTabs parent
 *
 * The panel shows its content rather than vanishing. That is deliberate: the
 * alternative failure — an app whose `inject()` misses because the library got
 * loaded twice — would otherwise render blank with no error at all. See
 * `tabsKey.js` for why the key is `Symbol.for`.
 */
import { computed, defineComponent, getCurrentInstance, inject, onBeforeUnmount, onMounted, watch } from 'vue'
import { CN_TABS_INJECTION_KEY } from './tabsKey.js'

export default defineComponent({
	name: 'CnTab',

	props: {
		/** Plain-text tab title. Ignored when a `#title` slot is supplied. */
		title: {
			type: String,
			default: '',
		},
		/** Select this tab. Honoured on mount and on every later change. */
		active: {
			type: Boolean,
			default: false,
		},
		/** Render the nav button disabled and skip this tab in keyboard navigation. */
		disabled: {
			type: Boolean,
			default: false,
		},
	},

	emits: [
		/** The user activated this tab. */
		'click',
	],

	setup(props, { slots, emit }) {
		const tabsApi = inject(CN_TABS_INJECTION_KEY, null)
		const uid = getCurrentInstance().uid
		const tabId = `cn-tab-${uid}`
		const panelId = `cn-tabpanel-${uid}`

		const entry = {
			uid,
			tabId,
			panelId,
			// Invoked from the PARENT's render effect, so reading `props.title`
			// (or calling the slot) here is what keeps a computed title reactive
			// in the nav strip.
			titleRender: () => (slots.title ? slots.title() : props.title),
			onActivate: () => {
				if (props.disabled) {
					return
				}
				tabsApi?.select(uid)
				emit('click')
			},
			get active() {
				return props.active
			},
			get disabled() {
				return props.disabled
			},
		}

		onMounted(() => tabsApi?.register(entry))
		onBeforeUnmount(() => tabsApi?.unregister(uid))

		watch(() => props.active, (isActive) => {
			if (isActive && !props.disabled) {
				tabsApi?.select(uid)
			}
		})

		const visible = computed(() => (tabsApi ? tabsApi.isActive(uid) : true))

		return { visible, tabId, panelId }
	},
})
</script>
