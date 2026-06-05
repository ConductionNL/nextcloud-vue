import { translate as t } from '@nextcloud/l10n'

/**
 * Known OpenRegister validation-message patterns. The backend sends these as
 * plain English strings, so they don't localise. Each pattern captures the
 * dynamic (single-quoted) segments and re-renders them through a translatable
 * template, leaving the static text to the user's language.
 *
 * Patterns are matched against the full message (anchored). When none match,
 * the original server text is returned unchanged — never a crash.
 */
const PATTERNS = [
	{
		regex: /^Property '(.*?)' should match format '(.*?)' but '(.*?)' does not\. Please provide a value in the correct format\.$/,
		keys: ['property', 'format', 'value'],
		msgid: "Property '{property}' should match format '{format}' but '{value}' does not. Please provide a value in the correct format.",
	},
]

/**
 * Localise a backend validation message by matching it against the known
 * patterns and rendering a translated template with the extracted values.
 *
 * @param {string} message The raw validation message from the backend.
 * @return {string} The translated message, or the input unchanged when no pattern matches.
 */
export function translateValidationMessage(message) {
	if (typeof message !== 'string') {
		return message
	}
	for (const { regex, keys, msgid } of PATTERNS) {
		const match = message.match(regex)
		if (match) {
			const params = {}
			keys.forEach((key, i) => {
				params[key] = match[i + 1]
			})
			return t('nextcloud-vue', msgid, params)
		}
	}
	return message
}
