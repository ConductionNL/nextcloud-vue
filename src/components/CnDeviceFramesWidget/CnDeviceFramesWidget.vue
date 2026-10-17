<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-device-frames-widget" data-testid="cn-device-frames-widget">
		<section
			v-for="frame in frames"
			:key="frame.key"
			class="cn-device-frames-widget__frame"
			:style="frameStyle"
			:aria-labelledby="headingId(frame.key)"
			:data-testid="`cn-device-frame-${frame.key}`">
			<header class="cn-device-frames-widget__head">
				<span
					v-if="frame.status"
					class="cn-device-frames-widget__status"
					:class="`cn-device-frames-widget__status--${frame.status.tone}`"
					data-testid="cn-device-frame-status">
					<component :is="frame.status.icon" :size="16" aria-hidden="true" />
					{{ frame.status.text }}
				</span>
				<h3 :id="headingId(frame.key)" class="cn-device-frames-widget__title">
					{{ frame.title }}
				</h3>
			</header>
			<div class="cn-device-frames-widget__body">
				<CnSectionsWidget
					:content="{ sections: frame.sections, cards: false, hideEmpty: true }"
					:availableWidgets="availableWidgets"
					:objectId="objectId"
					:objectData="objectData"
					:objectType="objectType"
					:schemaObject="schemaObject"
					:register="register"
					:schema="schema"
					:store="store"
					:surface="surface"
					:integrationContext="integrationContext"
					:cnRegistry="cnRegistry" />
			</div>
		</section>
	</div>
</template>

<script>
import { markRaw } from 'vue'
import CloudCheckOutline from 'vue-material-design-icons/CloudCheckOutline.vue'
import CloudOffOutline from 'vue-material-design-icons/CloudOffOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import CnSectionsWidget from '../CnSectionsWidget/CnSectionsWidget.vue'

/** Counter for unique heading ids across instances. */
let instanceCounter = 0

/**
 * CnDeviceFramesWidget - the `device-frames` widget: several small pages side
 * by side, each in a phone frame with its own header (board DqInspectie,
 * "Inspectie in het veld": the day offline, a checklist question with a
 * photo, and the sync queue).
 *
 * Each frame stacks widgets of the surface, as the `sections` widget does,
 * under a header with the frame's title and an optional status line. The
 * status can follow the connection ("Offline · synced at 07:42" while the
 * device is offline). The frames wrap onto the next row when the page is
 * narrower, and a frame takes the full width on a phone.
 *
 * ```json
 * {
 *   "type": "device-frames",
 *   "content": {
 *     "width": 350,
 *     "status": { "followConnection": true, "offlineText": "Offline · synced at 07:42", "onlineText": "Online" },
 *     "frames": [
 *       { "key": "today", "title": "Today", "widgetIds": ["today-runs", "offline-note"] },
 *       { "key": "question", "title": "Kerkplein 7", "widgetIds": ["checklist-run"] },
 *       { "key": "sync", "title": "Synchronise", "widgetIds": ["sync-queue"] }
 *     ]
 *   }
 * }
 * ```
 *
 * @spec openspec/changes/device-frames-widget/specs/device-frames-widget/spec.md#requirement-a-page-can-show-several-small-pages-as-phone-frames
 */
export default {
	name: 'CnDeviceFramesWidget',

	components: { CnSectionsWidget },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `frames` — `[{ key?, title, widgetIds? | sections?, status? }]`, in order. `widgetIds` names
		 *   widgets of the surface, stacked; `sections` takes the `sections` widget's entries instead.
		 * - `status` — the status line of every frame (a frame's own `status` wins): `{ text?, tone?,
		 *   followConnection?, onlineText?, offlineText? }`. With `followConnection` the line reads
		 *   `offlineText` while the device is offline and `onlineText` otherwise. `tone` is `warning`
		 *   (default while offline), `success` or `info`.
		 * - `width` — the frame width in pixels (default 350).
		 *
		 * @type {{frames?: Array<object>, status?: object, width?: number}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** Sibling widget definitions on the surface, for `widgetIds`. */
		availableWidgets: {
			type: Array,
			default: () => [],
		},

		/** The bound record's id, forwarded to the children. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The loaded record, forwarded to the children. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The resolved object-type slug. */
		objectType: {
			type: String,
			default: '',
		},

		/** The resolved JSON Schema object. */
		schemaObject: {
			type: Object,
			default: null,
		},

		/** OpenRegister register slug of the surface. */
		register: {
			type: [String, Object],
			default: '',
		},

		/** OpenRegister schema slug of the surface. */
		schema: {
			type: [String, Object],
			default: '',
		},

		/** The effective object store. */
		store: {
			type: Object,
			default: null,
		},

		/** Rendering surface forwarded to the children. */
		surface: {
			type: String,
			default: 'app-dashboard',
		},

		/** Object context forwarded to integration children. */
		integrationContext: {
			type: Object,
			default: null,
		},

		/** The consumer's component registry, for custom child widget types. */
		cnRegistry: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		instanceCounter += 1
		return {
			uid: instanceCounter,
			online: typeof navigator === 'undefined' || navigator.onLine !== false,
		}
	},

	computed: {
		/** @return {object} The frame width. */
		frameStyle() {
			const width = Number(this.content?.width)
			return { '--cn-device-frame-width': `${Number.isFinite(width) && width >= 240 ? width : 350}px` }
		},

		/**
		 * The frames to draw: a key, a translated title, the sections and the
		 * status line.
		 *
		 * @return {Array<{key: string, title: string, sections: Array<object>, status: object|null}>}
		 */
		frames() {
			const list = Array.isArray(this.content?.frames) ? this.content.frames : []
			return list
				.filter((frame) => frame && typeof frame === 'object')
				.map((frame, index) => {
					const sections = Array.isArray(frame.sections)
						? frame.sections
						: (Array.isArray(frame.widgetIds) ? frame.widgetIds : []).filter((id) => typeof id === 'string' && id !== '').map((widgetId) => ({ widgetId }))
					return {
						key: String(frame.key || `frame-${index}`).replace(/[^\w-]/g, '-'),
						title: this.tr(frame.title || ''),
						sections,
						status: this.statusOf(frame.status || this.content?.status || null),
					}
				})
		},
	},

	mounted() {
		if (typeof window !== 'undefined') {
			window.addEventListener('online', this.onConnection)
			window.addEventListener('offline', this.onConnection)
		}
	},

	beforeUnmount() {
		if (typeof window !== 'undefined') {
			window.removeEventListener('online', this.onConnection)
			window.removeEventListener('offline', this.onConnection)
		}
	},

	methods: {
		/**
		 * Translate through the app's translate.
		 *
		 * @param {string} key The source string.
		 * @return {string}
		 */
		tr(key) {
			return key && typeof this.cnTranslate === 'function' ? this.cnTranslate(key) : (key || '')
		},

		/**
		 * The status line of a frame, or null.
		 *
		 * @param {object|null} status The configured status.
		 * @return {{text: string, tone: string, icon: object}|null}
		 */
		statusOf(status) {
			if (!status || typeof status !== 'object') {
				return null
			}
			let text = status.text
			let tone = status.tone
			if (status.followConnection === true) {
				text = this.online ? status.onlineText : status.offlineText
				tone = tone || (this.online ? 'success' : 'warning')
			}
			if (typeof text !== 'string' || text === '') {
				return null
			}
			const known = ['warning', 'success', 'info'].includes(tone) ? tone : 'info'
			const icon = known === 'warning' ? CloudOffOutline : (known === 'success' ? CloudCheckOutline : InformationOutline)
			return { text: this.tr(text), tone: known, icon: markRaw(icon) }
		},

		/** Follow the browser's connection state. */
		onConnection() {
			this.online = typeof navigator === 'undefined' || navigator.onLine !== false
		},

		/**
		 * The id of a frame's heading.
		 *
		 * @param {string} key The frame key.
		 * @return {string}
		 */
		headingId(key) {
			return `cn-device-frame-${this.uid}-${key}`
		},
	},
}
</script>

<style scoped>
.cn-device-frames-widget {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 20px;
}

.cn-device-frames-widget__frame {
	display: flex;
	flex: none;
	flex-direction: column;
	width: var(--cn-device-frame-width, 350px);
	max-width: 100%;
	min-height: 600px;
	box-sizing: border-box;
	overflow: hidden;
	border: 10px solid var(--color-main-text);
	border-radius: 36px;
	background: var(--color-background-hover);
}

.cn-device-frames-widget__head {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 14px 18px 10px;
	border-bottom: 1px solid var(--color-border);
	background: var(--color-main-background);
}

.cn-device-frames-widget__status {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	font-weight: 600;
}

.cn-device-frames-widget__status--warning {
	color: var(--color-warning-text, var(--color-main-text));
}

.cn-device-frames-widget__status--success {
	color: var(--color-success-text, var(--color-main-text));
}

.cn-device-frames-widget__status--info {
	color: var(--color-text-maxcontrast);
}

.cn-device-frames-widget__title {
	margin: 0;
	font-size: 20px;
	font-weight: 700;
}

.cn-device-frames-widget__body {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 14px;
}

/* On a phone the frame is the screen: no bezel, the full width. */
@media (max-width: 640px) {
	.cn-device-frames-widget__frame {
		width: 100%;
		min-height: 0;
		border-width: 0;
		border-radius: var(--cn-board-card-radius, 12px);
	}
}
</style>
