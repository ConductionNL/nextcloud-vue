// In-memory implementation of @nextcloud/l10n for the styleguide.
// Backed by a Vue.observable so translate() reads are tracked as reactive
// dependencies — components calling t() in templates/computeds will
// automatically re-render when the registered translations change.

const Vue = require('vue').default || require('vue')

const state = Vue.observable({
    language: 'en',
    locale: 'en_US',
    // bumped on every register() to force re-evaluation of computeds even when
    // the language string stays the same (e.g. re-registering after locale fix)
    revision: 0,
})

const registry = Object.create(null)   // { [appName]: { [sourceText]: translated } }

function register(app, translations) {
    registry[app] = Object.assign(registry[app] || {}, translations || {})
    state.revision++   // notify reactive consumers
}

function translate(app, text, vars, _count, _options) {
    // Touch reactive state so Vue tracks language/registry as a dependency
    // of whatever render is currently running.
    // eslint-disable-next-line no-unused-expressions
    state.language; state.revision

    const bundle = registry[app] || {}
    let out = bundle[text] || text
    if (vars && typeof vars === 'object') {
        out = out.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m))
    }
    return out
}

function translatePlural(app, singular, plural, count, vars, options) {
    const text = count === 1 ? singular : plural
    return translate(app, text, Object.assign({ count }, vars || {}), count, options)
}

function getLanguage() { return state.language }
function getLocale() { return state.locale }
function setLanguage(lang) { state.language = lang }
function setLocale(locale) { state.locale = locale }
function isRTL() { return false }
function getFirstDay() { return 1 }

const api = {
    register,
    translate,
    translatePlural,
    getLanguage,
    getLocale,
    setLanguage,
    setLocale,
    isRTL,
    getFirstDay,
}

module.exports = api
module.exports.default = api