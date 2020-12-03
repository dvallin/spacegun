const mockDispatched = jest.fn()
const mockDispatchFn = jest.fn()
jest.mock('../../src/dispatcher/index', () => ({
    get: (moduleName: string, procedureName: string) => {
        mockDispatched(moduleName, procedureName)
        return mockDispatchFn
    },
    call: (request: any) => {
        mockDispatched(request.module, request.procedure)
        return mockDispatchFn
    },
    add: () => {},
    path: () => '',
}))

import { commands } from '../../src/commands'
import { Options } from '../../src/options'
import * as moment from 'moment'

import { createIO } from '../test-utils/io'

const emptyOptions: Options = { command: 'help' }

describe('commands', () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    describe('images', () => {
        it('calls the images backend and prints images', async () => {
            // given
            const image = { imageName: 'someImage' }
            mockDispatchFn.mockReturnValue([image])

            // when
            await commands.images(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(1)
            expect(mockDispatched).toBeCalledWith('images', 'list')
        })
    })

    describe('namespaces', () => {
        it('calls the namespaces backend and prints namespace', async () => {
            // given
            mockDispatchFn.mockReturnValue(['namespace1', 'namespace2'])

            // when
            await commands.namespaces(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(3)
            expect(mockDispatched).toBeCalledWith('cluster', 'namespaces')
        })
    })

    describe('pipelines', () => {
        it('calls the jobs backend and prints pipelines', async () => {
            // given
            const pipeline = { name: '1->2', cluster: 'cluster2', steps: [], start: '' }
            mockDispatchFn.mockReturnValue([pipeline])

            // when
            await commands.pipelines(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(1)
            expect(mockDispatched).toBeCalledWith('jobs', 'pipelines')
        })
    })

    describe('pods', () => {
        it('calls the pods backend for each cluster', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(['cluster1', 'cluster2'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: 'service1', creationTimeMS: 1542379151000 }])
                .mockReturnValueOnce(['namespace1'])
                .mockReturnValueOnce([{ name: 'service1', creationTimeMS: 1542379151000 }])

            // when
            await commands.pods(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith('cluster', 'clusters')
            expect(mockDispatched).toBeCalledWith('cluster', 'namespaces')
            expect(mockDispatched).toBeCalledWith('cluster', 'pods')
        })

        it('prints out the pods correctly', async () => {
            // given
            const withAgeOf = function(amount: moment.DurationInputArg1, unit: moment.DurationInputArg2): number {
                let now = moment()
                now.subtract(amount, unit)
                return now.valueOf()
            }
            mockDispatchFn
                .mockReturnValueOnce(['cluster1'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([
                    {
                        name: 'service1',
                        image: undefined,
                        restarts: undefined,
                        ready: true,
                        createdAt: withAgeOf(1, 'day'),
                    },
                    {
                        name: 'service2',
                        image: { url: 'url1' },
                        restarts: 1,
                        ready: false,
                        createdAt: withAgeOf(2, 'days'),
                    },
                    {
                        name: 'service3',
                        image: undefined,
                        restarts: 11,
                        ready: true,
                        createdAt: withAgeOf(3, 'days'),
                    },
                    {
                        name: 'service4',
                        image: { url: 'url2' },
                        restarts: 111,
                        ready: false,
                        createdAt: withAgeOf(4, 'days'),
                    },
                ])
            let output: string[] = []
            const out = jest.fn((text: string) => {
                output.push(text)
                return text
            })
            const io = createIO({ out })

            // when
            await commands.pods(emptyOptions, io)

            // then
            expect(output.concat('\n')).toMatchSnapshot()
        })
    })

    describe('scalers', () => {
        it('calls the scalers backend for each cluster', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(['cluster1', 'cluster2'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: 'scaler1', replicas: { current: 0, minimum: 1, maximum: 2 } }])
                .mockReturnValueOnce(['namespace1'])
                .mockReturnValueOnce([{ name: 'scaler1', replicas: { current: 1, minimum: 1, maximum: 1 } }])

            // when
            await commands.scalers(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith('cluster', 'clusters')
            expect(mockDispatched).toBeCalledWith('cluster', 'namespaces')
            expect(mockDispatched).toBeCalledWith('cluster', 'scalers')
        })
    })

    describe('deployments', () => {
        it('calls the pods deployments for each cluster', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(['cluster1', 'cluster2'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: 'deployment1' }])
                .mockReturnValueOnce(['namespace1'])
                .mockReturnValueOnce([{ name: 'deployment2' }])

            // when
            await commands.deployments(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith('cluster', 'clusters')
            expect(mockDispatched).toBeCalledWith('cluster', 'namespaces')
            expect(mockDispatched).toBeCalledWith('cluster', 'deployments')
        })
    })

    describe('batches', () => {
        it('calls the batch jobs for each cluster', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(['cluster1', 'cluster2'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: 'batch1' }])
                .mockReturnValueOnce(['namespace1'])
                .mockReturnValueOnce([{ name: 'batch2' }])

            // when
            await commands.batches(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith('cluster', 'clusters')
            expect(mockDispatched).toBeCalledWith('cluster', 'namespaces')
            expect(mockDispatched).toBeCalledWith('cluster', 'batches')
        })
    })

    describe('run', () => {
        it('runs a pipeline if user agrees', async () => {
            // given
            mockDispatchFn.mockReturnValueOnce([{ name: 'pipeline1' }, { name: 'pipeline2' }]).mockReturnValueOnce({
                name: 'plan',
                deployments: [{ name: 'deployment1', deployable: {}, image: {} }],
                batches: [],
            })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ choose, expect: expectFn })

            // when
            await commands.run(emptyOptions, io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(3)
            expect(mockDispatched).toBeCalledWith('jobs', 'pipelines')
            expect(mockDispatched).toBeCalledWith('jobs', 'plan')
            expect(mockDispatched).toBeCalledWith('jobs', 'run')
        })

        it('does not run a pipeline if user disagrees', async () => {
            // given
            mockDispatchFn.mockReturnValueOnce([{ name: 'pipeline1' }, { name: 'pipeline2' }]).mockReturnValueOnce({
                name: 'plan',
                deployments: [{ name: 'deployment1', deployable: {}, image: {} }],
                batches: [],
            })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => false)
            const io = createIO({ choose, expect: expectFn })

            // when
            await commands.run(emptyOptions, io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(2)
            expect(mockDispatched).not.toBeCalledWith('jobs', 'run')
        })
    })

    describe('deploy', () => {
        const clusters = ['cluster1', 'cluster2']
        const namespaces: string[] = []
        const deployments = [{ name: 'deployment1', image: { name: 'image' } }]
        const batches = [{ name: 'batch1', image: { name: 'image' } }]
        const tags = ['latest', 'notLatest']
        const image = { name: 'image', tag: 'latest', url: 'image:latest:url' }

        it('deploys to a deployment if user agrees', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(batches)
                .mockReturnValueOnce(tags)
                .mockReturnValueOnce(image)
                .mockReturnValueOnce({ name: 'deployment1' })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const chooseMultiple = jest.fn().mockImplementation(({}, b) => ({ first: true, result: b[0] }))
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ chooseMultiple, choose, expect: expectFn })

            // when
            await commands.deploy(emptyOptions, io)

            // then
            expect(choose).toHaveBeenCalledTimes(2)
            expect(choose).toHaveBeenCalledWith('> ', clusters)
            expect(choose).toHaveBeenCalledWith('> ', tags)

            expect(chooseMultiple).toHaveBeenCalledTimes(1)
            expect(chooseMultiple).toHaveBeenCalledWith('> ', deployments, batches)

            expect(mockDispatched).toHaveBeenCalledTimes(7)
            expect(mockDispatched).toBeCalledWith('cluster', 'clusters')
            expect(mockDispatched).toBeCalledWith('cluster', 'namespaces')
            expect(mockDispatched).toBeCalledWith('cluster', 'deployments')
            expect(mockDispatched).toBeCalledWith('cluster', 'batches')
            expect(mockDispatched).toBeCalledWith('images', 'tags')
            expect(mockDispatched).toBeCalledWith('images', 'image')
            expect(mockDispatched).toBeCalledWith('cluster', 'updateDeployment')
        })

        it('deploys to a batch job if user agrees', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(batches)
                .mockReturnValueOnce(tags)
                .mockReturnValueOnce(image)
                .mockReturnValueOnce({
                    name: 'deployment1',
                    concurrencyPolicy: 'Allow',
                    schedule: '',
                })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const chooseMultiple = jest.fn().mockImplementation(({}, {}, b) => ({ first: false, result: b[0] }))
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ chooseMultiple, choose, expect: expectFn })

            // when
            await commands.deploy(emptyOptions, io)

            // then
            expect(choose).toHaveBeenCalledTimes(2)
            expect(choose).toHaveBeenCalledWith('> ', clusters)
            expect(choose).toHaveBeenCalledWith('> ', tags)

            expect(chooseMultiple).toHaveBeenCalledTimes(1)
            expect(chooseMultiple).toHaveBeenCalledWith('> ', deployments, batches)

            expect(mockDispatched).toHaveBeenCalledTimes(7)
            expect(mockDispatched).toBeCalledWith('cluster', 'updateBatch')
        })

        it('asks user for namespace if there are any', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(['namespace1'])
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(batches)
                .mockReturnValueOnce(tags)
                .mockReturnValueOnce(image)
                .mockReturnValueOnce({ name: 'deployment1' })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const chooseMultiple = jest.fn().mockImplementation(({}, b) => ({ first: true, result: b[0] }))
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ chooseMultiple, choose, expect: expectFn })

            // when
            await commands.deploy(emptyOptions, io)

            // then
            expect(choose).toHaveBeenCalledTimes(3)
            expect(choose).toHaveBeenCalledWith('> ', clusters)
            expect(choose).toHaveBeenCalledWith('> ', tags)

            expect(chooseMultiple).toHaveBeenCalledTimes(1)
            expect(chooseMultiple).toHaveBeenCalledWith('> ', deployments, batches)
        })

        it('does not deploy an image if user disagrees', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(batches)
                .mockReturnValueOnce(tags)
                .mockReturnValueOnce(image)
                .mockReturnValueOnce({ name: 'deployment1' })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const chooseMultiple = jest.fn().mockImplementation(({}, b) => ({ first: true, result: b[0] }))
            const expectFn = jest.fn().mockImplementation(() => false)
            const io = createIO({ chooseMultiple, choose, expect: expectFn })

            // when
            await commands.deploy(emptyOptions, io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(6)
            expect(mockDispatched).not.toBeCalledWith('cluster', 'updateDeployment')
            expect(mockDispatched).not.toBeCalledWith('cluster', 'updateBatch')
        })
    })

    describe('restart', () => {
        const clusters = ['cluster1', 'cluster2']
        const namespaces: string[] = []
        const deployments = [{ name: 'deployment1', image: { name: 'image' } }]
        const batches = [{ name: 'batch1', image: { name: 'image' } }]

        it('restarts a deployment if user agrees', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(batches)
                .mockReturnValueOnce({ name: 'deployment1' })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const chooseMultiple = jest.fn().mockImplementation(({}, b) => ({ first: true, result: b[0] }))
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ choose, chooseMultiple, expect: expectFn })

            // when
            await commands.restart(emptyOptions, io)

            // then
            expect(choose).toHaveBeenCalledTimes(1)
            expect(choose).toHaveBeenCalledWith('> ', clusters)

            expect(chooseMultiple).toHaveBeenCalledTimes(1)
            expect(chooseMultiple).toHaveBeenCalledWith('> ', deployments, batches)

            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith('cluster', 'clusters')
            expect(mockDispatched).toBeCalledWith('cluster', 'namespaces')
            expect(mockDispatched).toBeCalledWith('cluster', 'deployments')
            expect(mockDispatched).toBeCalledWith('cluster', 'batches')
            expect(mockDispatched).toBeCalledWith('cluster', 'restartDeployment')
        })

        it('restarts a batch job if user agrees', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(batches)
                .mockReturnValueOnce({
                    name: 'deployment1',
                    concurrencyPolicy: 'Allow',
                    schedule: '',
                })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const chooseMultiple = jest.fn().mockImplementation(({}, {}, b) => ({ first: false, result: b[0] }))
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ choose, chooseMultiple, expect: expectFn })

            // when
            await commands.restart(emptyOptions, io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith('cluster', 'restartBatch')
        })

        it('asks user for namespace if there are any', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(['service1'])
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(batches)
                .mockReturnValueOnce({ name: 'deployment1' })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const chooseMultiple = jest.fn().mockImplementation(({}, b) => ({ first: true, result: b[0] }))
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ choose, chooseMultiple, expect: expectFn })

            // when
            await commands.restart(emptyOptions, io)

            // then
            expect(chooseMultiple).toHaveBeenCalledTimes(1)
            expect(chooseMultiple).toHaveBeenCalledWith('> ', deployments, batches)
        })

        it('does not deploy an image if user disagrees', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(batches)
                .mockReturnValueOnce({ name: 'deployment1' })

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const chooseMultiple = jest.fn().mockImplementation(({}, b) => ({ first: true, result: b[0] }))
            const expectFn = jest.fn().mockImplementation(() => false)
            const io = createIO({ choose, chooseMultiple, expect: expectFn })

            // when
            await commands.restart(emptyOptions, io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(4)
            expect(mockDispatched).not.toBeCalledWith('cluster', 'restartDeployment')
        })
    })

    describe('schedules', () => {
        it('prints schedules of a pipeline', async () => {
            // given
            const pipeline = { name: '1->2', cluster: 'cluster2', steps: [], start: '' }
            const schedules = { lastRun: undefined, nextRuns: [] }
            mockDispatchFn.mockReturnValueOnce([pipeline]).mockReturnValueOnce(schedules)

            const choose = jest.fn().mockImplementation(({}, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ choose, expect: expectFn })

            // when
            await commands.schedules(emptyOptions, io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(2)
            expect(mockDispatched).toBeCalledWith('jobs', 'pipelines')
            expect(mockDispatched).toBeCalledWith('jobs', 'schedules')
        })
    })

    describe('help', () => {
        it('fetches cluster and image endpoint names', async () => {
            // given
            mockDispatchFn.mockReturnValueOnce(['cluster']).mockReturnValueOnce('someEndpoint')

            // when
            await commands.help(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(2)
            expect(mockDispatched).toBeCalledWith('cluster', 'clusters')
            expect(mockDispatched).toBeCalledWith('images', 'endpoint')
        })
    })

    describe('version', () => {
        it('returns current version', async () => {
            // given
            const out = jest.fn()
            const io = createIO({ out })

            // when
            await commands.version(emptyOptions, io)

            // then
            expect(io.out).toHaveBeenCalledTimes(1)
        })
    })

    describe('snapshot', () => {
        it('creates snapshots', async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(['cluster'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce({
                    deployments: [
                        { data: {}, name: 'deployment1' },
                        { data: {}, name: 'deployment2' },
                    ],
                    batches: [{ name: 'batch1', image: { name: 'image' } }],
                })

            // when
            await commands.snapshot(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(6)
            expect(mockDispatched).toBeCalledWith('cluster', 'clusters')
            expect(mockDispatched).toBeCalledWith('cluster', 'namespaces')
            expect(mockDispatched).toBeCalledWith('cluster', 'takeSnapshot')
            expect(mockDispatched).toBeCalledWith('artifacts', 'saveArtifact')
            expect(mockDispatched).toBeCalledWith('artifacts', 'saveArtifact')
        })
    })

    describe('apply', () => {
        it('applies snapshots', async () => {
            // given
            const deployments = [
                { name: 'deployment1', image: { name: 'image' } },
                { name: 'deployment2', image: { name: 'image' } },
            ]
            const batches = [{ name: 'batch1', image: { name: 'image' } }]
            mockDispatchFn
                .mockReturnValueOnce(['cluster'])
                .mockReturnValueOnce([])
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(batches)
                .mockReturnValueOnce({})
                .mockReturnValueOnce({})

            // when
            await commands.apply(emptyOptions, createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith('cluster', 'clusters')
            expect(mockDispatched).toBeCalledWith('cluster', 'namespaces')
            expect(mockDispatched).toBeCalledWith('artifacts', 'listArtifacts')
            expect(mockDispatched).toBeCalledWith('artifacts', 'listArtifacts')
            expect(mockDispatched).toBeCalledWith('cluster', 'applySnapshot')
        })
    })
})
