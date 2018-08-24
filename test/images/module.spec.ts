import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import { init, endpoint, versions, images } from "../../src/images/ImageModule"
import { call } from "../../src/dispatcher"
import { ImageRepository } from "../../src/images/ImageRepository"

const imagesMock = jest.fn()
const versionsMock = jest.fn()
const repo: ImageRepository = {
    endpoint: "someEndpoint", images: imagesMock, versions: versionsMock
}

init(repo)

describe("image module", () => {

    it("calls endpoint", () => {
        // when
        const promise = call(endpoint)()

        // then
        expect(promise).resolves.toEqual(endpoint)
    })

    it("calls images", () => {
        // given
        imagesMock.mockReturnValueOnce({})

        // when
        const promise = call(images)()

        // then
        expect(promise).resolves.toEqual({})
        expect(imagesMock).toHaveBeenCalledTimes(1)
    })

    it("calls versions", () => {
        // given
        versionsMock.mockReturnValueOnce({})

        // when
        const promise = call(versions)({ name: "imageName" })

        // then
        expect(promise).resolves.toEqual({})
        expect(versionsMock).toHaveBeenCalledTimes(1)
        expect(versionsMock).toHaveBeenCalledWith("imageName")
    })
})
