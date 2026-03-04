module.exports = {
	testEnvironment: 'jsdom',
	moduleFileExtensions: ['js', 'vue', 'json'],
	transform: {
		'^.+\\.js$': 'babel-jest',
		'^.+\\.vue$': '@vue/vue2-jest',
	},
	transformIgnorePatterns: [
		'/node_modules/(?!(@nextcloud|vue-material-design-icons|pinia)/)',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'\\.(css)$': 'jest-transform-stub',
	},
	testMatch: [
		'<rootDir>/tests/**/*.spec.js',
		'<rootDir>/tests/**/*.test.js',
	],
	setupFiles: [
		'<rootDir>/tests/setup.js',
	],
}
