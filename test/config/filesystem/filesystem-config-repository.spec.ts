import { fromConfig, FilesystemConfigRepository } from "../../../src/config/filesystem/FilesystemConfigRepository"
import { Config } from "../../../src/config/index"

describe("FileSystemConfigRepository", () => {

    const repo: FilesystemConfigRepository = fromConfig(createConfig("test/test-config/artifacts/"))

    describe("fromConfig", () => {

        it("sets artifact paths", () => {
            expect(repo.artifactPath).toEqual("test/test-config/artifacts/")
        })
    })

    describe("FilesystemConfigRepository", () => {

        it("has no new config", async () => {
            const hasNewConfig = await repo.hasNewConfig()
            expect(hasNewConfig).toBeFalsy()
        })

        it("fetches no config", () => {
            expect(repo.fetchNewConfig()).resolves
        })

        it("loads artifacts", async () => {
            const artifact = await repo.loadArtifact("artifact", "")
            expect(artifact).toEqual({ some: "artifact" })
        })
    })
})

function createConfig(artifacts: string): Config {
    return {
        kube: "",
        docker: "",
        jobs: "",
        artifacts,
        server: { host: "", port: 2 }
    }
}
