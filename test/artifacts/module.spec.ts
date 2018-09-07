import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import { call } from "../../src/dispatcher"

import { init, saveArtifact, loadArtifact } from "../../src/artifacts/ArtifactModule"
import { FilesystemArtifactRepository } from "../../src/artifacts/filesystem/FilesystemArtifactRepository"

const saveArtifactMock = jest.fn()
const loadArtifactMock = jest.fn()
const repo: FilesystemArtifactRepository = {
    artifactPath: "",
    saveArtifact: saveArtifactMock,
    loadArtifact: loadArtifactMock
}

init(repo)

describe("config module", () => {

    it("saves artifacts", async () => {
        // given
        saveArtifactMock.mockReturnValueOnce({})

        // when
        await call(saveArtifact)({
            data: {},
            name: "name",
            path: "path"
        })

        // then
        expect(saveArtifactMock).toHaveBeenCalledTimes(1)
        expect(saveArtifactMock).toHaveBeenCalledWith("name", "path", {})
    })

    it("loads artifacts", async () => {
        // given
        loadArtifactMock.mockReturnValueOnce({})

        // when
        await call(loadArtifact)({
            name: "name",
            path: "path"
        })

        // then
        expect(loadArtifactMock).toHaveBeenCalledTimes(1)
        expect(loadArtifactMock).toHaveBeenCalledWith("name", "path")
    })
})
