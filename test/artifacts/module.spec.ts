import { Layers } from '../../src/dispatcher/model/Layers'
process.env.LAYER = Layers.Standalone

import { call } from '../../src/dispatcher'

import { init, saveArtifact, listArtifacts } from '../../src/artifacts/ArtifactModule'
import { FilesystemArtifactRepository } from '../../src/artifacts/filesystem/FilesystemArtifactRepository'

const saveArtifactMock = jest.fn()
const listArtifactsMock = jest.fn()
const repo: FilesystemArtifactRepository = {
    artifactPath: '',
    saveArtifact: saveArtifactMock,
    listArtifacts: listArtifactsMock,
}

init(repo)

describe('config module', () => {
    it('saves artifacts', async () => {
        // given
        saveArtifactMock.mockReturnValueOnce({})

        // when
        await call(saveArtifact)({
            path: 'path',
            artifact: {
                data: {},
                name: 'name',
            },
        })

        // then
        expect(saveArtifactMock).toHaveBeenCalledTimes(1)
        expect(saveArtifactMock).toHaveBeenCalledWith('path', { data: {}, name: 'name' })
    })

    it('lists artifacts', async () => {
        // given
        listArtifactsMock.mockReturnValueOnce({})

        // when
        await call(listArtifacts)('path')

        // then
        expect(listArtifactsMock).toHaveBeenCalledTimes(1)
        expect(listArtifactsMock).toHaveBeenCalledWith('path')
    })
})
