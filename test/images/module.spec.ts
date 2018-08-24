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

    it("calls endpoint", async () => {
        // when
        const result = await call(endpoint)()

        // then
        expect(result).toEqual("someEndpoint")
    })

    it("calls images", async () => {
        // given
        imagesMock.mockReturnValueOnce({})

        // when
        const result = await call(images)()

        // then
        expect(result).toEqual({})
        expect(imagesMock).toHaveBeenCalledTimes(1)
    })

    it("calls versions", async () => {
        // given
        versionsMock.mockReturnValueOnce({})

        // when
        const result = await call(versions)({ name: "imageName" })

        // then
        expect(result).toEqual({})
        expect(versionsMock).toHaveBeenCalledTimes(1)
        expect(versionsMock).toHaveBeenCalledWith("imageName")
    })
})
