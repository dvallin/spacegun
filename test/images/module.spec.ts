import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import { init, moduleName, functions } from "../../src/images/ImageModule"
import { get } from "../../src/dispatcher"
import { RequestInput } from "../../src/dispatcher/model/RequestInput"
import { ImageRepository } from "../../src/images/ImageRepository"

const endpoint = "someEndpoint"
const images = jest.fn()
const versions = jest.fn()
const repo: ImageRepository = {
    endpoint, images, versions, fillCache: jest.fn()
}

init(repo)

describe("image module", () => {

    it("calls endpoint", () => {
        // when
        const call = get(moduleName, functions.endpoint)()

        // then
        expect(call).resolves.toEqual(endpoint)
    })

    it("calls images", () => {
        // given
        images.mockReturnValueOnce({})

        // when
        const call = get(moduleName, functions.images)()

        // then
        expect(call).resolves.toEqual({})
        expect(images).toHaveBeenCalledTimes(1)
    })

    it("calls versions", () => {
        // given
        versions.mockReturnValueOnce({})

        // when
        const call = get(moduleName, functions.versions)(
            RequestInput.of(["name", "imageName"])
        )

        // then
        expect(call).resolves.toEqual({})
        expect(versions).toHaveBeenCalledTimes(1)
        expect(versions).toHaveBeenCalledWith("imageName")
    })
})
