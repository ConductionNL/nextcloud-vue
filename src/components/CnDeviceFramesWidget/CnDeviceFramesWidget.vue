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
					:content="{ sections: frame.sections, cards: false, dividers: false, gap: 12, hideEmpty: true }"
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
import { fetchReferenceObjects } from '../../utils/boardReferenceColumns.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedTokens, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

/** Counter for unique heading ids across instances. */
let instanceCounter = 0

/**
 * CnDeviceFramesWidget - the `device-frames` widget: several small pages side
 * by side, each in a phone frame with its own header (board DqInspectie,
 * "Inspectie in het veld": the day offline, a checklist question with a
 * photo, and the sync queue).
 *
 * Each frame stacks widgets of the surface as plain sections, 12px apart
 * without a rule, under a header with the frame's title and an optional
 * status line. The status can follow the connection ("Offline · synced at
 * 07:42" while the device is offline). The frames wrap onto the next row
 * when the page is narrower, and a frame takes the full width on a phone.
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
		 * - `frames` — `[{ key?, title, titleFrom?, widgetIds? | sections?, status? }]`, in order. `widgetIds` names
		 *   widgets of the surface, stacked; `sections` takes the `sections` widget's entries instead.
		 *   `titleFrom: { source: { register, schema, filter, sort? }, field }` titles the frame by that field of the
		 *   first matching record, read under the reader's rights; `title` stays while none matches.
		 * - `status` — the status line of every frame (a frame's own `status` wins): `{ text?, tone?,
		 *   followConnection?, onlineText?, offlineText? }`. With `followConnection` the line reads
		 *   `offlineText` while the device is offline and `onlineText` otherwise. `tone` is `warning`
		 *   (default while offline), `success` or `info`. With `syncedFrom: { source: { register, schema,
		 *   filter }, field }` the newest value of that date field is the last synchronisation, and while
		 *   offline the line reads `offlineSyncedText` with `{time}` as its time (`offlineText` without one).
		 * - `width` — the frame width in pixels (default 350).
		 * - `height` — the frame height in pixels (at least 400); what does not fit scrolls inside it. Without it the frame grows with its content.
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
			readTitles: {},
			syncedTime: '',
		}
	},

	computed: {
		/** @return {object} The frame width. */
		frameStyle() {
			const width = Number(this.content?.width)
			const height = Number(this.content?.height)
			const style = { '--cn-device-frame-width': `${Number.isFinite(width) && width >= 240 ? width : 350}px` }
			if (Number.isFinite(height) && height >= 400) {
				style['--cn-device-frame-height'] = `${height}px`
			}
			return style
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
						title: this.readTitles[index] || this.tr(frame.title || ''),
						sections,
						status: this.statusOf(frame.status || this.content?.status || null),
					}
				})
		},
	},

	mounted() {
		this.readSources()
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
				if (!this.online && this.syncedTime && typeof status.offlineSyncedText === 'string' && status.offlineSyncedText !== '') {
					return this.statusLine(this.tr(status.offlineSyncedText).replace('{time}', this.syncedTime), tone)
				}
			}
			if (typeof text !== 'string' || text === '') {
				return null
			}
			return this.statusLine(this.tr(text), tone)
		},

		/**
		 * A status line of a text and a tone.
		 *
		 * @param {string} text The translated text.
		 * @param {string} tone The tone.
		 * @return {{text: string, tone: string, icon: object}}
		 */
		statusLine(text, tone) {
			const known = ['warning', 'success', 'info'].includes(tone) ? tone : 'info'
			const icon = known === 'warning' ? CloudOffOutline : (known === 'success' ? CloudCheckOutline : InformationOutline)
			return { text, tone: known, icon: markRaw(icon) }
		},

		/**
		 * The first record of a `{ source: { register, schema, filter, sort? } }`, sorted by `sort` (or
		 * newest first by `orderBy`), under the reader's rights; null without one or while a token is unresolved.
		 *
		 * @param {object} spec The source spec.
		 * @param {string} [orderBy] A field to sort on, newest first, when the source names no sort.
		 * @return {Promise<object|null>}
		 */
		async firstOf(spec, orderBy = '') {
			const source = spec?.source
			if (!source || typeof source !== 'object' || !source.register || !source.schema) {
				return null
			}
			const filter = resolveFilterTokens(source.filter || {}, { objectId: this.objectId || null, object: this.objectData })
			if (hasUnresolvedTokens(filter)) {
				return null
			}
			const sort = source.sort?.field ? { [`_order[${source.sort.field}]`]: source.sort.dir === 'asc' ? 'asc' : 'desc' } : (orderBy ? { [`_order[${orderBy}]`]: 'desc' } : {})
			try {
				const rows = await fetchReferenceObjects({ register: source.register, schema: source.schema, filter: { ...filter, ...sort }, limit: 1 })
				return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
			} catch {
				return null
			}
		},

		/** Read the frame titles (`titleFrom`) and the last synchronisation (`status.syncedFrom`). */
		async readSources() {
			const list = Array.isArray(this.content?.frames) ? this.content.frames.filter((frame) => frame && typeof frame === 'object') : []
			const titles = {}
			await Promise.all(list.map(async (frame, index) => {
				if (!frame.titleFrom?.field) {
					return
				}
				const value = readPath(await this.firstOf(frame.titleFrom), frame.titleFrom.field)
				if (typeof value === 'string' && value !== '') {
					titles[index] = value
				}
			}))
			this.readTitles = titles
			const synced = this.content?.status?.syncedFrom
			if (synced?.field) {
				const at = new Date(readPath(await this.firstOf(synced, synced.field), synced.field) ?? '')
				this.syncedTime = Number.isNaN(at.getTime()) ? '' : `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
			}
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
	height: var(--cn-device-frame-height, auto);
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
	line-height: normal;
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
	line-height: 1.2;
}

.cn-device-frames-widget__body {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 14px;
}

/* `height` (DqInspectie: 700) makes every frame a phone of that height;
   what does not fit scrolls inside the screen. */
.cn-device-frames-widget__frame[style*='--cn-device-frame-height'] .cn-device-frames-widget__body {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
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
