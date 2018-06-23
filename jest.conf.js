module.exports = {
    moduleFileExtensions: [
        "js",
        "ts",
        "json"
    ],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1"
    },
    testRegex: "(/__tests__/.*|(\\.|/)spec)\\.(ts?)$",
    transform: {
        "^.+\\.ts$": "<rootDir>/node_modules/ts-jest"
    },
    setupFiles: ["<rootDir>/test/setup"],
    coverageDirectory: "<rootDir>/coverage",
    collectCoverageFrom: [
        "src/**/*.{js,ts}",
        "!src/main.ts",
        "!**/node_modules/**"
    ]
}
