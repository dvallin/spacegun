import { fromConfig, FilesystemConfigRepository } from "../../../src/config/filesystem/FilesystemConfigRepository"
import { Layers } from "../../../src/dispatcher/model/Layers"

describe("FileSystemConfigRepository", () => {

    const repo = fromConfig({ artifacts: "test/test-config/artifacts/" })

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
