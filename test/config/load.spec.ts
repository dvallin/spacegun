import { load, validateConfig } from "../../src/config"

describe("config loading", () => {

    it("loads jobs", () => {
        const config = load(`${__dirname}/../test-config/config.yml`)
        expect(config).toEqual({
            docker: "https://docker.com",
            jobs: "./jobs",
            git: { remote: "https://some.git" },
            kube: "kube/config",
            namespaces: ["service1", "service2"],
            server: { "host": "localhost", "port": 8080 }
        })
    })
})

describe("validateConfig", () => {

    it("ensures a docker endpoint exists", () => {
        expect(() => validateConfig({})).toThrowErrorMatchingSnapshot()
    })

    it("defaults values", () => {
        const config = validateConfig({ docker: "someDocker" })
        expect(config.jobs).toEqual("./jobs")
        expect(config.kube.endsWith(".kube/config")).toBeTruthy()
        expect(config.git).toBeUndefined()
        expect(config.server).toEqual({
            host: "localhost",
            port: 3000
        })
        expect(config.namespaces).toBeUndefined()
    })
})
