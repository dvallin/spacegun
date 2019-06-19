import { Layers } from '../../src/dispatcher/model/Layers'
process.env.LAYER = Layers.Standalone

import {
    init,
    clusters,
    pods,
    scalers,
    deployments,
    updateDeployment,
    namespaces,
    takeSnapshot,
    applySnapshot,
    UpdateDeploymentParameters,
    restartDeployment,
    RestartDeploymentParameters,
    batches,
    UpdateBatchParameters,
    updateBatch,
    RestartBatchParameters,
    restartBatch,
} from '../../src/cluster/ClusterModule'
import { ClusterRepository } from '../../src/cluster/ClusterRepository'
import { ApplySnapshotParameters } from '../../src/cluster/ClusterModule'
import { call } from '../../src/dispatcher'

const podsMock = jest.fn()
const namespacesMock = jest.fn()
const batchesMock = jest.fn()
const updateBatchMock = jest.fn()
const restartBatchMock = jest.fn()
const deploymentsMock = jest.fn()
const updateDeploymentMock = jest.fn()
const restartDeploymentMock = jest.fn()
const scalersMock = jest.fn()
const takeSnapshotMock = jest.fn()
const applySnapshotMock = jest.fn()
const repo: ClusterRepository = {
    clusters: ['cluster1', 'cluster2'],
    pods: podsMock,
    namespaces: namespacesMock,
    batches: batchesMock,
    updateBatch: updateBatchMock,
    restartBatch: restartBatchMock,
    deployments: deploymentsMock,
    updateDeployment: updateDeploymentMock,
    restartDeployment: restartDeploymentMock,
    scalers: scalersMock,
    takeSnapshot: takeSnapshotMock,
    applySnapshot: applySnapshotMock,
}

init(repo)

describe('cluster module', () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    it('calls clusters', async () => {
        // when
        const result = await call(clusters)()

        // then
        expect(result).toEqual(['cluster1', 'cluster2'])
    })

    it('calls pods', async () => {
        // given
        podsMock.mockReturnValueOnce({})

        // when
        const result = await call(pods)({ cluster: 'clusterName' })

        // then
        expect(result).toEqual({})
        expect(podsMock).toHaveBeenCalledTimes(1)
        expect(podsMock).toHaveBeenCalledWith({ cluster: 'clusterName' })
    })

    it('calls scalers', async () => {
        // given
        scalersMock.mockReturnValueOnce({})

        // when
        const result = await call(scalers)({ cluster: 'clusterName' })

        // then
        expect(result).toEqual({})
        expect(scalersMock).toHaveBeenCalledTimes(1)
        expect(scalersMock).toHaveBeenCalledWith({ cluster: 'clusterName' })
    })

    it('calls namespaces', async () => {
        // given
        namespacesMock.mockReturnValueOnce([])

        // when
        const result = await call(namespaces)({ cluster: 'clusterName' })

        // then
        expect(result).toEqual([])
        expect(namespacesMock).toHaveBeenCalledTimes(1)
        expect(namespacesMock).toHaveBeenCalledWith('clusterName')
    })

    it('calls batches', async () => {
        // given
        batchesMock.mockReturnValueOnce({})

        // when
        const result = await call(batches)({ cluster: 'clusterName' })

        // then
        expect(result).toEqual({})
        expect(batchesMock).toHaveBeenCalledTimes(1)
        expect(batchesMock).toHaveBeenCalledWith({ cluster: 'clusterName' })
    })

    it('calls update batch', async () => {
        // given
        updateBatchMock.mockReturnValueOnce({})
        const batch = { id: 1, name: 'batch1' }
        const image = { id: 2, url: 'url', name: 'name', tag: 'tag' }
        const params: UpdateBatchParameters = {
            batch,
            image,
            group: { cluster: 'clusterName' },
        }

        // when
        const result = await call(updateBatch)(params)

        // then
        expect(result).toEqual({})
        expect(updateBatchMock).toHaveBeenCalledTimes(1)
        expect(updateBatchMock).toHaveBeenCalledWith({ cluster: 'clusterName' }, batch, image)
    })

    it('calls restart deployment', async () => {
        // given
        restartBatchMock.mockReturnValueOnce({})
        const batch = { id: 1, name: 'batch1' }
        const params: RestartBatchParameters = {
            batch,
            group: { cluster: 'clusterName' },
        }

        // when
        const result = await call(restartBatch)(params)

        // then
        expect(result).toEqual({})
        expect(restartBatchMock).toHaveBeenCalledTimes(1)
        expect(restartBatchMock).toHaveBeenCalledWith({ cluster: 'clusterName' }, batch)
    })

    it('calls deployments', async () => {
        // given
        deploymentsMock.mockReturnValueOnce({})

        // when
        const result = await call(deployments)({ cluster: 'clusterName' })

        // then
        expect(result).toEqual({})
        expect(deploymentsMock).toHaveBeenCalledTimes(1)
        expect(deploymentsMock).toHaveBeenCalledWith({ cluster: 'clusterName' })
    })

    it('calls update deployment', async () => {
        // given
        updateDeploymentMock.mockReturnValueOnce({})
        const deployment = { id: 1, name: 'deployment1' }
        const image = { id: 2, url: 'url', name: 'name', tag: 'tag' }
        const params: UpdateDeploymentParameters = {
            deployment,
            image,
            group: { cluster: 'clusterName' },
        }

        // when
        const result = await call(updateDeployment)(params)

        // then
        expect(result).toEqual({})
        expect(updateDeploymentMock).toHaveBeenCalledTimes(1)
        expect(updateDeploymentMock).toHaveBeenCalledWith({ cluster: 'clusterName' }, deployment, image)
    })

    it('calls restart deployment', async () => {
        // given
        restartDeploymentMock.mockReturnValueOnce({})
        const deployment = { id: 1, name: 'deployment1' }
        const params: RestartDeploymentParameters = {
            deployment,
            group: { cluster: 'clusterName' },
        }

        // when
        const result = await call(restartDeployment)(params)

        // then
        expect(result).toEqual({})
        expect(restartDeploymentMock).toHaveBeenCalledTimes(1)
        expect(restartDeploymentMock).toHaveBeenCalledWith({ cluster: 'clusterName' }, deployment)
    })

    it('calls take snapshot', async () => {
        // given
        takeSnapshotMock.mockReturnValueOnce({})

        // when
        const result = await call(takeSnapshot)({ cluster: 'clusterName' })

        // then
        expect(result).toEqual({})
        expect(takeSnapshotMock).toHaveBeenCalledTimes(1)
        expect(takeSnapshotMock).toHaveBeenCalledWith({ cluster: 'clusterName' })
    })

    describe('apply snapshot', () => {
        it('calls apply snapshot', async () => {
            // given
            applySnapshotMock.mockReturnValueOnce({})
            const params: ApplySnapshotParameters = { group: { cluster: 'clusterName' }, snapshot: { deployments: [], batches: [] } }

            // when
            const result = await call(applySnapshot)(params)

            // then
            expect(result).toEqual({})
            expect(applySnapshotMock).toHaveBeenCalledTimes(1)
            expect(applySnapshotMock).toHaveBeenCalledWith({ cluster: 'clusterName' }, { deployments: [], batches: [] }, true)
        })

        it('does not ignore image if flag is set', async () => {
            // given
            applySnapshotMock.mockReturnValueOnce({})
            const params: ApplySnapshotParameters = {
                group: { cluster: 'clusterName' },
                snapshot: { deployments: [], batches: [] },
                ignoreImage: false,
            }

            // when
            const result = await call(applySnapshot)(params)

            // then
            expect(result).toEqual({})
            expect(applySnapshotMock).toHaveBeenCalledTimes(1)
            expect(applySnapshotMock).toHaveBeenCalledWith({ cluster: 'clusterName' }, { deployments: [], batches: [] }, false)
        })
    })
})
