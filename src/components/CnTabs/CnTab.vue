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
		<slot v-if="rendered" />
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
 * `lazy` changes only the FIRST paint: the body waits until the tab is first
 * activated, and from then on the panel behaves exactly as above. It is for
 * strips whose panels are expensive to mount, not for saving memory.
 *
 * ## Rendered outside a CnTabs parent
 *
 * The panel shows its content rather than vanishing. That is deliberate: the
 * alternative failure — an app whose `inject()` misses because the library got
 * loaded twice — would otherwise render blank with no error at all. See
 * `tabsKey.js` for why the key is `Symbol.for`.
 */
import { computed, defineComponent, getCurrentInstance, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
		/**
		 * Hold the panel body back until this tab is first activated, then keep
		 * it mounted for the rest of the strip's life.
		 *
		 * Off by default, because the eager panel is what makes a tab switch
		 * instant and it is the behaviour every existing consumer already has.
		 * Turn it on when the panels are expensive: six panels that each fetch
		 * on `mounted()` fire six requests on page load, and five of those
		 * answer questions nobody has asked yet.
		 *
		 * This is NOT `v-if`-per-switch. Once a panel has been shown it stays
		 * in the DOM, so switching back to it never refetches. That is the
		 * whole reason an inactive panel is hidden rather than destroyed.
		 */
		lazy: {
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

		// Latches on first activation and never resets, so a lazy panel mounts
		// once and then behaves exactly like an eager one.
		const shown = ref(false)
		watch(visible, (isVisible) => {
			if (isVisible) {
				shown.value = true
			}
		}, { immediate: true })

		const rendered = computed(() => !props.lazy || shown.value)

		return { visible, rendered, tabId, panelId }
	},
})
</script>
