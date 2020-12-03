jest.mock('../../../src/dispatcher/index', () => ({
    call: (request: Request<any, any>) => {
        switch (request.module) {
            case 'events': {
                switch (request.procedure) {
                    case 'log': {
                        return (input: any) => {
                            mockLog(input)
                        }
                    }
                }
            }
        }
        return undefined
    },
    add: () => {},
    path: () => '',
}))

import * as moment from 'moment'
import { KubernetesClusterRepository } from '../../../src/cluster/kubernetes/KubernetesClusterRepository'
import { Pod } from '../../../src/cluster/model/Pod'
import { Deployment } from '../../../src/cluster/model/Deployment'
import { Scaler } from '../../../src/cluster/model/Scaler'
import { ClusterSnapshot } from '../../../src/cluster/model/ClusterSnapshot'

import { Request } from '../../../src/dispatcher/model/Request'

const image1 = { name: 'image1', url: 'repo/image1:tag@some:digest' }
const image2 = { name: 'image2', url: 'repo/image2:tag@some:digest' }

const mockLog = jest.fn()

import { replaceDeploymentMock, createDeploymentMock, replaceBatchMock, createBatchMock } from './__mocks__/@kubernetes/client-node'
import { V1Deployment, V1beta1CronJob } from '@kubernetes/client-node'
import { Batch } from 'src/cluster/model/Batch'
import { callParameters } from '../../test-utils/jest'

describe('KubernetesClusterProvider', () => {
    beforeEach(() => {
        createDeploymentMock.mockReset()
        replaceDeploymentMock.mockReset()
        replaceBatchMock.mockReset()
        createBatchMock.mockReset()
    })

    const cluster = KubernetesClusterRepository.fromConfig('./test/test-config/kube/config')

    describe('clusters', () => {
        it('returns the names of the clusters', () => {
            expect(cluster.clusters).toEqual(['dev', 'pre', 'live'])
        })
    })

    describe('namespaces', () => {
        it('returns the names of the namespaces', async () => {
            const namespaces: string[] = await cluster.namespaces('dev')
            expect(namespaces).toEqual(['namespace1', 'namespace2'])
        })

        it('returns only namespaces that are allowed namespaces', async () => {
            const cluster2 = KubernetesClusterRepository.fromConfig('./test/test-config/kube/config', ['namespace2'])
            const namespaces: string[] = await cluster2.namespaces('dev')
            expect(namespaces).toEqual(['namespace2'])
        })
    })

    describe('pods', () => {
        it('returns pods', async () => {
            const pods: Pod[] = await cluster.pods({
                cluster: cluster.clusters[0],
            })
            expect(pods).toEqual([
                {
                    image: image1,
                    createdAt: moment({ year: 2018, month: 11, day: 16 }).valueOf(),
                    name: 'pod1',
                    restarts: 0,
                    ready: true,
                },
                {
                    image: image2,
                    createdAt: moment({ year: 2018, month: 11, day: 15 }).valueOf(),
                    name: 'pod2',
                    restarts: 1,
                    ready: false,
                },
            ])
        })
    })

    describe('deployments', () => {
        it('returns deployments', async () => {
            const deployments: Deployment[] = await cluster.deployments({
                cluster: cluster.clusters[0],
            })
            expect(deployments).toEqual([
                { image: image1, name: 'deployment1' },
                { image: image2, name: 'deployment2' },
            ])
        })

        it('updates deployments', async () => {
            const deployment: Deployment = await cluster.updateDeployment(
                { cluster: cluster.clusters[0] },
                { image: image1, name: 'deployment1' },
                image2
            )
            expect(deployment).toEqual({ image: { name: 'image2', url: 'repo/image2:tag@some:digest' }, name: 'deployment1' })
            expect(callParameters(replaceDeploymentMock, 0)).toMatchSnapshot()
        })

        it('restarts deployments', async () => {
            const deployment: Deployment = await cluster.restartDeployment(
                { cluster: cluster.clusters[0] },
                { image: image1, name: 'deployment1' }
            )
            expect(deployment).toEqual({ image: { name: 'image1', url: 'repo/image1:tag@some:digest' }, name: 'deployment1' })
            expect(callParameters(replaceDeploymentMock, 0)).toMatchSnapshot()
        })
    })

    describe('batches', () => {
        it('returns batches', async () => {
            const batches: Batch[] = await cluster.batches({
                cluster: cluster.clusters[0],
            })
            expect(batches).toEqual([
                {
                    image: image1,
                    name: 'batch1',
                    concurrencyPolicy: 'Allow',
                    schedule: 'someSchedule',
                },
                {
                    image: image2,
                    name: 'batch2',
                    concurrencyPolicy: 'Allow',
                    schedule: 'someSchedule',
                },
            ])
        })

        it('updates batches', async () => {
            const batch: Batch = await cluster.updateBatch(
                { cluster: cluster.clusters[0] },
                { image: image1, name: 'batch1', concurrencyPolicy: 'Allow', schedule: '' },
                image2
            )
            expect(batch).toEqual({
                image: { name: 'image2', url: 'repo/image2:tag@some:digest' },
                name: 'batch1',
                concurrencyPolicy: 'Allow',
                schedule: 'someSchedule',
            })
            expect(callParameters(replaceBatchMock, 0)).toMatchSnapshot()
        })

        it('restarts batches', async () => {
            const deployment: Batch = await cluster.restartBatch(
                { cluster: cluster.clusters[0] },
                { image: image1, name: 'batch1', concurrencyPolicy: 'Allow', schedule: '' }
            )
            expect(deployment).toEqual({
                image: { name: 'image1', url: 'repo/image1:tag@some:digest' },
                name: 'batch1',
                concurrencyPolicy: 'Allow',
                schedule: 'someSchedule',
            })
            expect(callParameters(replaceBatchMock, 0)).toMatchSnapshot()
        })
    })

    describe('scalers', () => {
        it('returns horizontal auto scalers', async () => {
            const scalers: Scaler[] = await cluster.scalers({
                cluster: cluster.clusters[0],
            })
            expect(scalers).toEqual([
                { name: 'pod1', replicas: { current: 0, maximum: 2, minimum: 1 } },
                { name: 'pod2', replicas: { current: 1, maximum: 3, minimum: 2 } },
            ])
        })
    })

    describe('takeSnapshot', () => {
        it('returns a description of all deployments', async () => {
            const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                cluster: cluster.clusters[0],
            })
            expect(snapshot.deployments).toHaveLength(2)
        })
    })

    describe('appliesSnapshots', () => {
        describe('for batch jobs', () => {
            it('calls endpoints on snapshot change', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })
                const batch1 = snapshot.batches[0].data as V1beta1CronJob
                batch1.spec!.schedule = 'some schedule'

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, false)

                expect(replaceBatchMock).toHaveBeenCalledTimes(1)
                expect(callParameters(replaceBatchMock, 0)).toMatchSnapshot()
            })

            it('does not call endpoints if nothing has changed', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, false)

                expect(replaceBatchMock).not.toHaveBeenCalled()
            })

            it('does not call endpoints if spacegun batch version has changed', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })
                const batch1 = snapshot.batches[0].data as V1beta1CronJob
                batch1.spec!.jobTemplate.spec!.template.metadata!.annotations = {
                    'spacegun.batch': '1520899200000',
                }

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, false)

                expect(replaceBatchMock).not.toHaveBeenCalled()
            })

            it('ignores image if flag is set', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })
                const batch1 = snapshot.batches[0].data as V1beta1CronJob
                batch1.spec!.jobTemplate.spec!.template.spec!.containers[0].image = 'somenewsillyimage'

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, true)

                expect(replaceBatchMock).not.toHaveBeenCalled()
            })

            it('creates batch jobs if batch job is not known yet', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })
                const batch1 = snapshot.batches[0].data as V1beta1CronJob
                snapshot.batches[0].name = 'somesillyjob'
                batch1.metadata!.name = 'somesillyjob'
                batch1.spec!.jobTemplate.spec!.template.spec!.containers[0].image = 'somenewsillyimage'

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, false)

                expect(createBatchMock).toHaveBeenCalledTimes(1)
                expect(callParameters(createBatchMock, 0)).toMatchSnapshot()
            })

            it('sends results to slack', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })

                const batch1 = snapshot.batches[0].data as V1beta1CronJob
                batch1.spec!.schedule = 'some schedule'
                const batch2 = snapshot.batches[1].data as V1beta1CronJob
                batch2.spec!.schedule = 'some schedule'

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, true)

                expect(mockLog).toHaveBeenCalledWith({
                    description: 'Applied Snapshots in dev ∞ undefined',
                    fields: [{ title: 'Updated', value: 'Batch batch1' }],
                    message: 'Applied Snapshots',
                    timestamp: 1520899200000,
                    topics: ['slack'],
                })
            })
        })

        describe('for deployments', () => {
            it('calls endpoints on snapshot change', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })
                const deployment1 = snapshot.deployments[0].data as V1Deployment
                deployment1.spec!.replicas = 2

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, false)

                expect(replaceDeploymentMock).toHaveBeenCalledTimes(1)
                expect(replaceDeploymentMock).toHaveBeenCalledWith('deployment1', 'default', {
                    metadata: { name: 'deployment1', annotations: {} },
                    spec: {
                        replicas: 2,
                        template: { metadata: { annotations: {} }, spec: { containers: [{ image: 'repo/image1:tag@some:digest' }] } },
                    },
                })
            })

            it('does not call endpoints if nothing has changed', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, false)

                expect(replaceDeploymentMock).not.toHaveBeenCalled()
            })

            it('does not call endpoints if kubernetes revision has changed', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })
                const deployment1 = snapshot.deployments[0].data as V1Deployment
                deployment1.metadata!.annotations = {
                    'deployment.kubernetes.io/revision': '123',
                }

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, false)

                expect(replaceDeploymentMock).not.toHaveBeenCalled()
            })

            it('does not call endpoints if spacegun deployment version has changed', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })
                const deployment1 = snapshot.deployments[0].data as V1Deployment
                deployment1.spec!.template.metadata!.annotations = {
                    'spacegun.deployment': '1520899200000',
                }

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, false)

                expect(replaceDeploymentMock).not.toHaveBeenCalled()
            })

            it('ignores image if flag is set', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })
                const deployment1 = snapshot.deployments[0].data as V1Deployment
                deployment1.spec!.template.spec!.containers[0].image = 'somenewsillyimage'

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, true)

                expect(replaceDeploymentMock).not.toHaveBeenCalled()
            })

            it('creates deployments if deployment is not known yet', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })
                const deployment1 = snapshot.deployments[0].data as V1Deployment
                snapshot.deployments[0].name = 'somesillydeployment'
                deployment1.metadata!.name = 'somesillydeployment'
                deployment1.spec!.replicas = 2
                deployment1.spec!.template.spec!.containers[0].image = 'somenewsillyimage'

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, false)

                expect(createDeploymentMock).toHaveBeenCalledTimes(1)
                expect(createDeploymentMock).toHaveBeenCalledWith('default', {
                    metadata: { name: 'somesillydeployment', annotations: {} },
                    spec: {
                        replicas: 2,
                        template: { metadata: { annotations: {} }, spec: { containers: [{ image: 'somenewsillyimage' }] } },
                    },
                })
            })

            it('sends results to slack', async () => {
                const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                    cluster: cluster.clusters[0],
                })

                const deployment1 = snapshot.deployments[0].data as V1Deployment
                deployment1.spec!.replicas = 2
                const deployment2 = snapshot.deployments[1].data as V1Deployment
                deployment2.spec!.replicas = 2

                await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot, true)

                expect(mockLog).toHaveBeenCalledWith({
                    description: 'Applied Snapshots in dev ∞ undefined',
                    fields: [
                        { title: 'Failure', value: 'Deployment deployment2' },
                        { title: 'Updated', value: 'Deployment deployment1' },
                    ],
                    message: 'Applied Snapshots',
                    timestamp: 1520899200000,
                    topics: ['slack'],
                })
            })
        })
    })
})
