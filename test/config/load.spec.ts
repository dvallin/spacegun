import { load, validateConfig } from "../../src/config"

describe("config loading", () => {

    it("loads configurations files", () => {
        const config = load('test/test-config/config.yml')
        expect(config).toEqual({
            docker: "https://docker.com",
            jobs: "test/test-config/jobs",
            slack: "https://some.slack.hook",
            git: { remote: "https://some.git" },
            kube: "test/test-config/kube/config",
            namespaces: ["service1", "service2"],
            server: { "host": "localhost", "port": 8080 }
        })
    })
})

describe("validateConfig", () => {

    it("ensures a docker endpoint exists", () => {
        expect(() => validateConfig("basePath", {})).toThrowErrorMatchingSnapshot()
    })

    it("defaults values", () => {
        const config = validateConfig("basePath", { docker: "someDocker" })
        expect(config.jobs).toEqual("basePath/jobs")
        expect(config.kube.endsWith(".kube/config")).toBeTruthy()
        expect(config.git).toBeUndefined()
        expect(config.server).toEqual({
            host: "localhost",
            port: 3000
        })
        expect(config.namespaces).toBeUndefined()
    })
})
