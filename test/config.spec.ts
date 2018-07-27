import { validateConfig } from "../src/config"

describe("validateConfig", () => {

    it("ensures a docker endpoint exists", () => {
        expect(() => validateConfig({})).toThrowErrorMatchingSnapshot()
    })

    it("defaults values", () => {
        const config = validateConfig({ docker: "someDocker" })
        expect(config.jobs).toEqual("./jobs")
        expect(config.kube.endsWith(".kube/config")).toBeTruthy()
    })
})
