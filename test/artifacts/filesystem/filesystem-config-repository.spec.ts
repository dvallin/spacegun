import { fromConfig, FilesystemArtifactRepository } from '../../../src/artifacts/filesystem/FilesystemArtifactRepository'
import { Config } from '../../../src/config/index'

const mockSave = jest.fn()
const mockLoad = jest.fn()
const mockList = jest.fn()
jest.mock('../../../src/file-loading', () => ({
    save: (path: string, data: object) => mockSave(path, data),
    load: (path: string) => mockLoad(path),
    list: (path: string) => mockList(path),
}))

describe('FileSystemConfigRepository', () => {
    beforeEach(() => {
        mockSave.mockReset()
        mockLoad.mockReset()
        mockList.mockReset()
    })

    const repo: FilesystemArtifactRepository = fromConfig(createConfig('test/test-config/artifacts'))

    describe('fromConfig', () => {
        it('sets artifact paths', () => {
            expect(repo.artifactPath).toEqual('test/test-config/artifacts')
        })
    })

    describe('FilesystemConfigRepository', () => {
        describe('saveArtifact', () => {
            it('saves artifacts', async () => {
                await repo.saveArtifact('some/path', { name: 'artifact', data: { some: 'Artifact' } })
                expect(mockSave).toHaveBeenCalledWith('test/test-config/artifacts/some/path/artifact.yml', { some: 'Artifact' })
            })
        })

        describe('listArtifacts', () => {
            it('lists artifacts', async () => {
                mockList.mockReturnValue(['not/even/a/file/', 'artifact2.yml', 'some.xml', 'artifact1.yml'])
                mockLoad.mockImplementation(artifactName => ({ artifactName }))

                const artifacts = await repo.listArtifacts('some/path')

                expect(artifacts).toEqual([
                    { data: { artifactName: 'test/test-config/artifacts/some/path/artifact2.yml' }, name: 'artifact2' },
                    { data: { artifactName: 'test/test-config/artifacts/some/path/artifact1.yml' }, name: 'artifact1' },
                ])
                expect(mockLoad).toHaveBeenCalledWith('test/test-config/artifacts/some/path/artifact1.yml')
                expect(mockLoad).toHaveBeenCalledWith('test/test-config/artifacts/some/path/artifact2.yml')
            })
        })
    })
})

function createConfig(artifacts: string): Config {
    return {
        kube: '',
        docker: '',
        pipelines: '',
        artifacts,
        server: { host: '', port: 2 },
        configBasePath: './',
    }
}
