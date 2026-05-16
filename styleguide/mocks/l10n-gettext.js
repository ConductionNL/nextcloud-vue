// Stub for @nextcloud/l10n/gettext — webpack 4 cannot resolve "exports" subpath maps,
// and the real implementation crashes without Nextcloud globals (getLanguage() returns undefined).
// Returns original strings untranslated, which is fine for the styleguide.
function getGettextBuilder() {
	const builder = {
		detectLocale: function() { return builder },
		detectLanguage: function() { return builder },
		setLanguage: function() { return builder },
		addTranslation: function() { return builder },
		enableDebugMode: function() { return builder },
		build: function() {
			return {
				gettext: function(str) { return str },
				ngettext: function(singular, plural, count) { return count === 1 ? singular : plural },
			}
		},
	}
	return builder
}

module.exports = { getGettextBuilder }
