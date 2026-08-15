/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * videoUrlParser — small client-side helpers for the CnVideoWidgetForm picker.
 *
 * These helpers are purely a form-level UX aid: they let the form show
 * "Detected: YouTube" the moment a URL is pasted and pre-compute the canonical
 * embed URL the renderer expects. Any authoritative parsing / allow-list
 * enforcement is a consumer/server concern.
 *
 * Source-type detection:
 *   - youtube  → youtube.com, youtu.be, youtube-nocookie.com, m.youtube.com
 *   - vimeo    → vimeo.com, player.vimeo.com
 *   - peertube → URL path contains a `/w/{slug}` or `/videos/watch/{slug}`
 *                segment and the host is not one of the above
 *   - nc-file  → URL starts with `/apps/files/`, `/index.php/apps/files/`,
 *                or `/f/`
 *
 * Embed URL normalisation:
 *   - YouTube  → https://www.youtube.com/embed/{ID} (+ optional `?start=N`)
 *   - Vimeo    → https://player.vimeo.com/video/{ID}
 *   - PeerTube → preserves origin, rewrites `/w/{slug}` to `/videos/embed/{slug}`
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */

const YOUTUBE_HOSTS = new Set([
	'youtube.com',
	'www.youtube.com',
	'youtu.be',
	'youtube-nocookie.com',
	'www.youtube-nocookie.com',
	'm.youtube.com',
])

const VIMEO_HOSTS = new Set([
	'vimeo.com',
	'www.vimeo.com',
	'player.vimeo.com',
])

const NC_FILE_PATH_PREFIXES = [
	'/apps/files/',
	'/index.php/apps/files/',
	'/f/',
]

/**
 * Try to parse a string as a URL, accepting both absolute (`https://...`) and
 * path-relative (`/apps/files/...`) inputs (anchored to a synthetic origin).
 *
 * @param {string} input the candidate URL.
 * @return {URL|null} the parsed URL, or `null` when unparseable.
 */
function safeParseUrl(input) {
	if (typeof input !== 'string' || input.trim() === '') {
		return null
	}
	const trimmed = input.trim()
	try {
		return new URL(trimmed, 'https://__local__/')
	} catch (e) {
		return null
	}
}

/**
 * Detect which source type a URL belongs to.
 *
 * @param {string} input the user-provided URL.
 * @return {('youtube'|'vimeo'|'peertube'|'nc-file'|null)} the detected source type, or `null`.
 */
export function detectVideoSource(input) {
	const parsed = safeParseUrl(input)
	if (!parsed) {
		return null
	}

	const isRelative = parsed.origin === 'https://__local__'
	const path = parsed.pathname || ''

	if (isRelative) {
		for (const prefix of NC_FILE_PATH_PREFIXES) {
			if (path.startsWith(prefix)) {
				return 'nc-file'
			}
		}
		return null
	}

	const host = (parsed.hostname || '').toLowerCase()

	if (YOUTUBE_HOSTS.has(host)) {
		return 'youtube'
	}
	if (VIMEO_HOSTS.has(host)) {
		return 'vimeo'
	}

	for (const prefix of NC_FILE_PATH_PREFIXES) {
		if (path.startsWith(prefix)) {
			return 'nc-file'
		}
	}

	if (/\/w\/[A-Za-z0-9_-]+/.test(path) || /\/videos\/watch\/[A-Za-z0-9_-]+/.test(path)) {
		return 'peertube'
	}

	return null
}

/**
 * Extract a YouTube video ID from any of YouTube's URL formats.
 *
 * @param {URL} url the parsed URL.
 * @return {string|null} the video ID, or `null` when not extractable.
 */
function extractYouTubeId(url) {
	const host = (url.hostname || '').toLowerCase()
	if (host === 'youtu.be') {
		return url.pathname.replace(/^\//, '').split('/')[0] || null
	}
	const v = url.searchParams.get('v')
	if (v) {
		return v
	}
	const match = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)/)
	if (match) {
		return match[1]
	}
	return null
}

/**
 * Extract a Vimeo numeric video ID from any of Vimeo's URL formats.
 *
 * @param {URL} url the parsed URL.
 * @return {string|null} the numeric video ID as a string, or `null`.
 */
function extractVimeoId(url) {
	const playerMatch = url.pathname.match(/^\/video\/(\d+)/)
	if (playerMatch) {
		return playerMatch[1]
	}
	const directMatch = url.pathname.match(/^\/(\d+)/)
	if (directMatch) {
		return directMatch[1]
	}
	return null
}

/**
 * Parse a `t=NNs` (or `start=N`) time offset from a YouTube URL.
 *
 * @param {URL} url the parsed URL.
 * @return {number|null} the time offset in seconds, or `null`.
 */
function extractYouTubeTimeOffset(url) {
	const t = url.searchParams.get('t') || url.searchParams.get('start')
	if (!t) {
		return null
	}
	if (/^\d+$/.test(t)) {
		return parseInt(t, 10)
	}
	const match = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/)
	if (match) {
		const hours = parseInt(match[1] || '0', 10)
		const minutes = parseInt(match[2] || '0', 10)
		const seconds = parseInt(match[3] || '0', 10)
		const total = hours * 3600 + minutes * 60 + seconds
		return total > 0 ? total : null
	}
	return null
}

/**
 * Build the canonical embed URL the iframe renderer expects.
 *
 * @param {string} input the user-supplied URL.
 * @param {('youtube'|'vimeo'|'peertube')} sourceType the detected source type.
 * @return {string|null} the canonical embed URL, or `null` when unparseable.
 */
export function normalizeEmbedUrl(input, sourceType) {
	const parsed = safeParseUrl(input)
	if (!parsed) {
		return null
	}

	if (sourceType === 'youtube') {
		const id = extractYouTubeId(parsed)
		if (!id) {
			return null
		}
		const start = extractYouTubeTimeOffset(parsed)
		const base = `https://www.youtube.com/embed/${id}`
		return start ? `${base}?start=${start}` : base
	}

	if (sourceType === 'vimeo') {
		const id = extractVimeoId(parsed)
		if (!id) {
			return null
		}
		return `https://player.vimeo.com/video/${id}`
	}

	if (sourceType === 'peertube') {
		const watchMatch = parsed.pathname.match(/\/w\/([A-Za-z0-9_-]+)/)
			|| parsed.pathname.match(/\/videos\/watch\/([A-Za-z0-9_-]+)/)
		if (!watchMatch) {
			return null
		}
		return `${parsed.origin}/videos/embed/${watchMatch[1]}`
	}

	return null
}
