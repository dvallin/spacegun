import axios from 'axios'

import { Request } from '../../src/dispatcher/model/Request'
import { Layers } from '../../src/dispatcher/model/Layers'
import { PipelineDescription } from '../../src/jobs/model/PipelineDescription'
import { CronRegistry } from '../../src/crons/CronRegistry'

import { Deployment } from '../../src/cluster/model/Deployment'

import { JobsRepositoryImpl } from '../../src/jobs/JobsRepositoryImpl'
import { StepDescription } from '../../src/jobs/model/Step'
import { DeploymentPlan } from '../../src/jobs/model/DeploymentPlan'
import { JobPlan } from '../../src/jobs/model/JobPlan'
import { Event } from '../../src/events/model/Event'
import { axiosResponse } from '../test-utils/axios'
import { Batch } from 'src/cluster/model/Batch'

jest.useFakeTimers()

process.env.LAYER = Layers.Standalone

type Deployments = { [name: string]: Deployment[] }
const mockDeployments: Deployments = {
    cluster1: [
        { name: 'deployment1', image: { name: 'image1', url: 'imageUrl:tag1:digest1' } },
        { name: 'deployment2', image: { name: 'image2', url: 'imageUrl:tag2:digest1' } },
    ],
    cluster2namespace1: [
        { name: 'deployment1', image: { name: 'image1', url: 'imageUrl:tag1:digest2' } },
        { name: 'deployment2', image: { name: 'image2', url: 'imageUrl:tag2:digest3' } },
    ],
    cluster2namespace3: [
        { name: 'deployment1', image: { name: 'image1', url: 'imageUrl:tag1:digest3' } },
        { name: 'deployment2', image: { name: 'image2', url: 'imageUrl:tag2:digest5' } },
    ],
    cluster3: [
        { name: 'deployment1', image: { name: 'image1', url: 'imageUrl:tag1:digest2' } },
        { name: 'deployment2', image: { name: 'image2', url: 'imageUrl:tag2:digest4' } },
    ],
}

type Batches = { [name: string]: Batch[] }
const mockBatches: Batches = {
    cluster1: [
        { name: 'batch1', image: { name: 'image1', url: 'imageUrl:tag1:digest1' }, concurrencyPolicy: 'Allow', schedule: '' },
        { name: 'batch2', image: { name: 'image2', url: 'imageUrl:tag2:digest1' }, concurrencyPolicy: 'Allow', schedule: '' },
    ],
    cluster2namespace1: [
        { name: 'batch1', image: { name: 'image1', url: 'imageUrl:tag1:digest2' }, concurrencyPolicy: 'Allow', schedule: '' },
        { name: 'batch2', image: { name: 'image2', url: 'imageUrl:tag2:digest3' }, concurrencyPolicy: 'Allow', schedule: '' },
    ],
    cluster2namespace3: [
        { name: 'batch1', image: { name: 'image1', url: 'imageUrl:tag1:digest3' }, concurrencyPolicy: 'Allow', schedule: '' },
        { name: 'batch2', image: { name: 'image2', url: 'imageUrl:tag2:digest5' }, concurrencyPolicy: 'Allow', schedule: '' },
    ],
    cluster3: [
        { name: 'batch1', image: { name: 'image1', url: 'imageUrl:tag1:digest2' }, concurrencyPolicy: 'Allow', schedule: '' },
        { name: 'batch2', image: { name: 'image2', url: 'imageUrl:tag2:digest4' }, concurrencyPolicy: 'Allow', schedule: '' },
    ],
}

type Namespaces = { [key: string]: string[] }
const mockNamespaces: Namespaces = {
    cluster1: [],
    cluster2: ['namespace1', 'namespace3'],
    cluster3: ['namespace2'],
}

const mockUpdateDeployment = jest.fn()
const mockUpdateBatch = jest.fn()
const mockSlack = jest.fn()

jest.mock('../../src/dispatcher/index', () => ({
    get: jest.fn(),
    call: (request: Request<any, any>) => {
        switch (request.module) {
            case 'cluster': {
                switch (request.procedure) {
                    case 'deployments': {
                        return (input: { cluster: string; namespace: string }) => {
                            if (input.cluster !== 'cluster2') {
                                return Promise.resolve(mockDeployments[input.cluster])
                            } else {
                                return Promise.resolve(mockDeployments[input.cluster + input.namespace])
                            }
                        }
                    }
                    case 'batches': {
                        return (input: { cluster: string; namespace: string }) => {
                            if (input.cluster !== 'cluster2') {
                                return Promise.resolve(mockBatches[input.cluster])
                            } else {
                                return Promise.resolve(mockBatches[input.cluster + input.namespace])
                            }
                        }
                    }
                    case 'namespaces': {
                        return (input: { cluster: string }) => Promise.resolve(mockNamespaces[input.cluster])
                    }
                    case 'updateDeployment': {
                        return (input: any) => {
                            mockUpdateDeployment(input)
                            if (input.group.cluster !== 'cluster2') {
                                return Promise.resolve(mockDeployments[input.group.cluster])
                            } else {
                                return Promise.resolve(mockDeployments[input.group.cluster + input.group.namespace])
                            }
                        }
                    }
                    case 'updateBatch': {
                        return (input: any) => {
                            mockUpdateBatch(input)
                            if (input.group.cluster !== 'cluster2') {
                                return Promise.resolve(mockBatches[input.group.cluster])
                            } else {
                                return Promise.resolve(mockBatches[input.group.cluster + input.group.namespace])
                            }
                        }
                    }
                }
                break
            }
            case 'images': {
                switch (request.procedure) {
                    case 'image': {
                        return (input: { name: string; tag: string }) =>
                            Promise.resolve({
                                name: input.name,
                                tag: input.tag,
                                url: `${input.name}:${input.tag}:otherDigest`,
                            })
                    }
                    case 'tags': {
                        return () => Promise.reject(new Error())
                    }
                }
                break
            }
            case 'events': {
                switch (request.procedure) {
                    case 'log': {
                        return (message: Event) => {
                            mockSlack(message)
                        }
                    }
                }
                break
            }
        }
        return undefined
    },
    add: () => {},
    path: () => '',
}))

describe('JobsRepositoryImpl', () => {
    let repo: JobsRepositoryImpl
    let crons: CronRegistry
    const twelvePMEveryWorkday = '0 0 0 12 * MON-FRI'
    const everyMinuteEveryWorkday = '0 */5 * * MON-FRI'
    const planClusterStep: StepDescription = {
        name: 'plan',
        type: 'planClusterDeployment',
        cluster: 'cluster1',
        onSuccess: 'apply',
        filter: { namespaces: ['namespace1'], resources: ['deployment1', 'batch1'] },
    }
    const planImageStep: StepDescription = {
        name: 'plan',
        type: 'planImageDeployment',
        tag: 'latest',
        onSuccess: 'apply',
    }
    const planNamespaceStep: StepDescription = {
        name: 'plan',
        type: 'planNamespaceDeployment',
        cluster: 'cluster2',
        source: 'namespace3',
        target: 'namespace2',
        onSuccess: 'apply',
        filter: { resources: ['deployment2', 'batch2'] },
    }
    const applyStep: StepDescription = { name: 'apply', type: 'applyDeployment' }
    const probeStep: StepDescription = { name: 'probe', type: 'clusterProbe', hook: 'someHook', onSuccess: 'plan' }
    const job1: PipelineDescription = {
        name: '1->2',
        cluster: 'cluster2',
        steps: [planClusterStep, applyStep, probeStep],
        start: 'probe',
        cron: twelvePMEveryWorkday,
    }
    const job2: PipelineDescription = {
        name: 'i->1',
        cluster: 'cluster1',
        steps: [planImageStep, applyStep],
        start: 'plan',
        cron: everyMinuteEveryWorkday,
    }
    const jobNamespaceDepl: PipelineDescription = {
        name: '2n1->3n2',
        cluster: 'cluster3',
        steps: [planNamespaceStep, applyStep],
        start: 'plan',
    }

    beforeEach(() => {
        process.env.LAYER = Layers.Server

        const jobs = new Map()
        jobs.set(job1.name, job1)
        jobs.set(job2.name, job2)
        jobs.set(jobNamespaceDepl.name, jobNamespaceDepl)

        crons = new CronRegistry()
        repo = new JobsRepositoryImpl(jobs, crons)

        mockUpdateDeployment.mockClear()
        mockUpdateBatch.mockClear()
        mockSlack.mockClear()
    })

    it('registers the job names', () => {
        expect(repo.list).toEqual([job1, job2, jobNamespaceDepl])
    })

    describe('cron jobs', () => {
        it('updates lastRun', () => {
            expect(repo.crons[0].lastRun).toBeUndefined()
            expect(repo.crons[1].lastRun).toBeUndefined()

            crons.cronJobs.get('1->2')!.start()
            jest.runOnlyPendingTimers()

            expect(repo.crons[0].lastRun).toBeDefined()
            expect(repo.crons[1].lastRun).toBeUndefined()
        })

        it('shows next five runs', () => {
            expect(repo.crons[0].nextRuns).toMatchSnapshot()
            expect(repo.crons[1].nextRuns).toMatchSnapshot()
        })
    })

    it('plans a cluster job with namespacing', async () => {
        // when
        const plan = await repo.plan('1->2')
        // then
        expect(plan.name).toEqual('1->2')
        expect(plan.deployments).toHaveLength(1)

        const deploymentPlan = plan.deployments[0]

        // deploy into cluster2
        expect(deploymentPlan.group.cluster).toBe('cluster2')
        expect(deploymentPlan.group.namespace).toEqual('namespace1')

        // deployment1 gets another image url
        expect(deploymentPlan.image!.url).toBe('imageUrl:tag1:digest1')
        expect(deploymentPlan.deployable.name).toBe('deployment1')
        expect(deploymentPlan.deployable.image!.url).toBe('imageUrl:tag1:digest2')
    })

    it('plans an image job', async () => {
        // when
        const plan = await repo.plan('i->1')

        // then
        expect(plan.name).toEqual('i->1')
        expect(plan.deployments).toHaveLength(2)

        const firstPlannedDeployment = plan.deployments[0]

        // deploy into cluster1
        expect(firstPlannedDeployment.group.cluster).toBe('cluster1')
        expect(firstPlannedDeployment.group.namespace).toBeUndefined()

        // deployment1 gets from digest1 to otherDigest
        expect(firstPlannedDeployment.image.url).toBe('image1:latest:otherDigest')
        expect(firstPlannedDeployment.deployable.name).toBe('deployment1')
        expect(firstPlannedDeployment.deployable.image!.url).toBe('imageUrl:tag1:digest1')

        const secondPlannedDeployment = plan.deployments[1]

        // deploy into cluster1
        expect(secondPlannedDeployment.group.cluster).toBe('cluster1')
        expect(secondPlannedDeployment.group.namespace).toBeUndefined()

        // deployment2 gets from digest1 to otherDigest
        expect(secondPlannedDeployment.image.url).toBe('image2:latest:otherDigest')
        expect(secondPlannedDeployment.deployable.name).toBe('deployment2')
        expect(secondPlannedDeployment.deployable.image!.url).toBe('imageUrl:tag2:digest1')
    })

    it('plans a namespace deployment job', async () => {
        // when
        const plan = await repo.plan(jobNamespaceDepl.name)

        // then
        expect(plan.name).toEqual('2n1->3n2')
        expect(plan.deployments).toHaveLength(1)

        const deployment = plan.deployments[0]

        // deploy into cluster3 namespace2
        expect(deployment.group.cluster).toBe('cluster3')
        expect(deployment.group.namespace).toBe('namespace2')

        // deployment2 goes from digest4 to digest5
        expect(deployment.deployable.name).toBe('deployment2')
        expect(deployment.deployable.image!.url).toBe('imageUrl:tag2:digest4')
        expect(deployment.image.url).toBe('imageUrl:tag2:digest5')
    })

    it('does not break if pipeline is unknown', async () => {
        // when
        await repo.run('notKnown').toPromise()

        // then
        expect(mockUpdateDeployment).not.toHaveBeenCalled()
        expect(mockUpdateBatch).not.toHaveBeenCalled()
    })

    it('runs first pipeline', async () => {
        // given
        //@ts-ignore
        axios.get = axiosResponse(200)

        // when
        await repo.run('1->2').toPromise()

        // then
        expect(mockUpdateDeployment).toHaveBeenCalledWith({
            deployment: {
                image: { name: 'image1', url: 'imageUrl:tag1:digest2' },
                name: 'deployment1',
            },
            image: { name: 'image1', url: 'imageUrl:tag1:digest1' },
            group: { cluster: 'cluster2', namespace: 'namespace1' },
        })
        expect(mockUpdateBatch).toHaveBeenCalledWith({
            batch: {
                image: { name: 'image1', url: 'imageUrl:tag1:digest2' },
                name: 'batch1',
                concurrencyPolicy: 'Allow',
                schedule: '',
            },
            image: { name: 'image1', url: 'imageUrl:tag1:digest1' },
            group: { cluster: 'cluster2', namespace: 'namespace1' },
        })
    })

    it('runs second pipeline', async () => {
        // when
        await repo.run('i->1').toPromise()

        // then
        expect(mockUpdateDeployment).toHaveBeenCalledWith({
            deployment: {
                image: { name: 'image1', url: 'imageUrl:tag1:digest1' },
                name: 'deployment1',
            },
            image: { name: 'image1', url: 'image1:latest:otherDigest', tag: 'latest' },
            group: { cluster: 'cluster1' },
        })
        expect(mockUpdateBatch).toHaveBeenCalledWith({
            batch: {
                image: { name: 'image1', url: 'imageUrl:tag1:digest1' },
                name: 'batch1',
                concurrencyPolicy: 'Allow',
                schedule: '',
            },
            image: { name: 'image1', url: 'image1:latest:otherDigest', tag: 'latest' },
            group: { cluster: 'cluster1' },
        })
    })

    it('runs namespace deployment pipeline', async () => {
        // when
        await repo.run('2n1->3n2').toPromise()

        // then
        expect(mockUpdateDeployment).toHaveBeenCalledWith({
            group: { cluster: 'cluster3', namespace: 'namespace2' },
            deployment: {
                name: 'deployment2',
                image: { name: 'image2', url: 'imageUrl:tag2:digest4' },
            },
            image: { name: 'image2', url: 'imageUrl:tag2:digest5' },
        })
        expect(mockUpdateBatch).toHaveBeenCalledWith({
            group: { cluster: 'cluster3', namespace: 'namespace2' },
            batch: {
                name: 'batch2',
                image: { name: 'image2', url: 'imageUrl:tag2:digest4' },
                concurrencyPolicy: 'Allow',
                schedule: '',
            },
            image: { name: 'image2', url: 'imageUrl:tag2:digest5' },
        })
    })

    it('calls slack', async () => {
        // when
        const deploymentPlan: DeploymentPlan<Deployment> = {
            deployable: {
                image: { name: 'image1', url: 'imageUrl:tag1:digest1' },
                name: 'service1',
            },
            image: { name: 'image1', url: 'image:tag:digest' },
            group: { cluster: 'cluster1', namespace: 'namespace1' },
        }
        const plan: JobPlan = { name: 'pipelineName', deployments: [deploymentPlan], batches: [] }
        await repo.apply(plan)

        // then
        expect(mockSlack).toHaveBeenCalledWith({
            message: 'Applied pipeline pipelineName',
            timestamp: 1520899200000,
            topics: ['slack'],
            description: 'Applied 1 deployments while executing pipeline pipelineName',
            fields: [
                {
                    title: 'cluster1 ∞ namespace1 ∞ service1',
                    value: 'updated to image:tag:digest',
                },
            ],
        })
    })

    it('calls on failure', async () => {
        // given
        const pipeline: PipelineDescription = {
            name: 'pipeline',
            cluster: 'cluster2',
            start: 'step1',
            steps: [
                { name: 'step1', onFailure: 'step2', type: 'planImageDeployment' },
                {
                    name: 'step2',
                    type: 'logError',
                },
            ],
        }
        const map = new Map()
        map.set('pipeline', pipeline)
        const jobs = new JobsRepositoryImpl(map, new CronRegistry())
        jobs.io.error = jest.fn()

        // when
        await jobs.run('pipeline').toPromise()

        // then
        expect(jobs.io.error).toHaveBeenCalled()
    })

    it('returns scheduled cron jobs', async () => {
        // when
        const crons = await repo.schedules('i->1')

        // then
        expect(crons).toBeDefined()
        expect(crons!.isRunning).toBeFalsy()
        expect(crons!.isStarted).toBeFalsy()
        expect(crons!.name).toEqual('i->1')
        expect(crons!.nextRuns).toHaveLength(5)
    })
})
