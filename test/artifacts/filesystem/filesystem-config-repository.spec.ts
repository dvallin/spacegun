import { fromConfig, FilesystemArtifactRepository } from "../../../src/artifacts/filesystem/FilesystemArtifactRepository"
import { Config } from "../../../src/config/index"

const mockSave = jest.fn()
const mockLoad = jest.fn()
jest.mock("../../../src/file-loading", () => ({
    save: (path: string, data: object) => mockSave(path, data),
    load: (path: string) => mockLoad(path)
}))


describe("FileSystemConfigRepository", () => {

    const repo: FilesystemArtifactRepository = fromConfig(createConfig("test/test-config/artifacts"))

    describe("fromConfig", () => {

        it("sets artifact paths", () => {
            expect(repo.artifactPath).toEqual("test/test-config/artifacts")
        })
    })

    describe("FilesystemConfigRepository", () => {

        describe("loadArtifact", () => {

            it("loads artifacts", async () => {
                mockLoad.mockReturnValue({ some: "artifact" })

                const artifact = await repo.loadArtifact("artifact", "some/path")

                expect(artifact).toEqual({ some: "artifact" })
                expect(mockLoad).toHaveBeenCalledWith("test/test-config/artifacts/some/path/artifact.yml")
            })

            it("wraps errors to undefined", async () => {
                mockLoad.mockImplementation(() => { throw Error("") })

                const artifact = await repo.loadArtifact("artifact", "some/path")

                expect(artifact).toBeUndefined()
            })
        })

        describe("saveArtifact", () => {

            it("saves artifacts", async () => {
                await repo.saveArtifact("artifact", "some/path", { some: "Artifact" })
                expect(mockSave).toHaveBeenCalledWith("test/test-config/artifacts/some/path/artifact.yml", { some: "Artifact" })
            })
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
