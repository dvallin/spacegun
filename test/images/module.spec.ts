import { Layers } from '../../src/dispatcher/model/Layers'
process.env.LAYER = Layers.Standalone

import { init, endpoint, tags, image, list } from '../../src/images/ImageModule'
import { call } from '../../src/dispatcher'
import { ImageRepository } from '../../src/images/ImageRepository'

const tagsMock = jest.fn()
const imageMock = jest.fn()
const listMock = jest.fn()
const repo: ImageRepository = {
    endpoint: 'someEndpoint',
    list: listMock,
    tags: tagsMock,
    image: imageMock,
}

init(repo)

describe('image module', () => {
    it('calls endpoint', async () => {
        // when
        const result = await call(endpoint)()

        // then
        expect(result).toEqual('someEndpoint')
    })

    it('calls list', async () => {
        // given
        listMock.mockReturnValueOnce({})

        // when
        const result = await call(list)()

        // then
        expect(result).toEqual({})
        expect(listMock).toHaveBeenCalledTimes(1)
    })

    it('calls tags', async () => {
        // given
        tagsMock.mockReturnValueOnce({})

        // when
        const result = await call(tags)({ name: 'imageName' })

        // then
        expect(result).toEqual({})
        expect(tagsMock).toHaveBeenCalledTimes(1)
        expect(tagsMock).toHaveBeenCalledWith('imageName')
    })

    it('calls image', async () => {
        // given
        imageMock.mockReturnValueOnce({})

        // when
        const result = await call(image)({ name: 'imageName', tag: 'tagName' })

        // then
        expect(result).toEqual({})
        expect(imageMock).toHaveBeenCalledTimes(1)
        expect(imageMock).toHaveBeenCalledWith('imageName', 'tagName')
    })
})
