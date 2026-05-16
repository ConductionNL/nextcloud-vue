module.exports = {
	testEnvironment: 'jsdom',
	moduleFileExtensions: ['js', 'vue', 'json'],
	transform: {
		'^.+\\.js$': 'babel-jest',
		'^.+\\.vue$': '@vue/vue2-jest',
	},
	transformIgnorePatterns: [
		'/node_modules/(?!(@nextcloud|@vueuse|vue-material-design-icons|pinia|vue-codemirror6|codemirror|@codemirror)/)',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'\\.(css)$': 'jest-transform-stub',
		'^vue-codemirror6$': '<rootDir>/tests/__mocks__/vue-codemirror6.js',
		'^@codemirror/lang-json$': '<rootDir>/tests/__mocks__/codemirror-lang-json.js',
		'^@codemirror/lang-xml$': '<rootDir>/tests/__mocks__/codemirror-lang-xml.js',
		'^@codemirror/lang-html$': '<rootDir>/tests/__mocks__/codemirror-lang-html.js',
		'^@nextcloud/vue$': '<rootDir>/tests/__mocks__/nextcloud-vue.js',
		'^@nextcloud/axios$': '<rootDir>/tests/__mocks__/nextcloud-axios.js',
		'^@microsoft/fetch-event-source$': '<rootDir>/tests/__mocks__/fetch-event-source.js',
		'^@nextcloud/notify_push$': '<rootDir>/tests/__mocks__/nextcloud-notify-push.js',
		'^@vueuse/core$': '<rootDir>/tests/__mocks__/vueuse-core.js',
		'^gridstack$': '<rootDir>/tests/__mocks__/gridstack.js',
		'^gridstack/dist/gridstack\\.min\\.css$': 'jest-transform-stub',
	},
	testMatch: [
		'<rootDir>/tests/**/*.spec.js',
		'<rootDir>/tests/**/*.test.js',
	],
	setupFiles: [
		'<rootDir>/tests/setup.js',
	],
}
