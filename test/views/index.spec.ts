import { Module } from '../../src/views/index'

const m = new Module()

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

describe('view', () => {
    describe('index', () => {
        it('reports errors', async () => {
            mockDispatchFn
                .mockRejectedValueOnce(new Error('error1'))
                .mockRejectedValueOnce(new Error('error2'))
                .mockRejectedValueOnce(new Error('error3'))

            const result = (await m.index()) as { errors: string[] }

            expect(result.errors).toMatchSnapshot()
        })

        it('fetches namespaces and clusters', async () => {
            mockDispatchFn
                .mockResolvedValueOnce(['cluster1', 'cluster2'])
                .mockResolvedValueOnce(['namespace1', 'namespace2'])
                .mockResolvedValueOnce(['namespace3'])

            const result = (await m.index()) as { clusters: object[] }

            expect(result).toMatchSnapshot()
        })

        it('fetches pipelines', async () => {
            mockDispatchFn
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([
                    { name: 'pipeline1', cluster: 'cluster1', cron: 'cron1', start: 'start1', steps: [] },
                    { name: 'pipeline2', cluster: 'cluster2', start: 'start1', steps: [] },
                ])
                .mockResolvedValueOnce({ name: 'pipeline1', lastRun: 42, nextRuns: [1, 2, 3], isStarted: true, isRunning: true })
                .mockResolvedValueOnce({ name: 'pipeline2', isStarted: false, nextRuns: [], isRunning: true })

            const result = (await m.index()) as { jobs: object[] }

            expect(result).toMatchSnapshot()
        })

        it('fetches images', async () => {
            mockDispatchFn
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(['image1', 'image2'])

            const result = (await m.index()) as { images: object[] }

            expect(result.images).toEqual(['image1', 'image2'])
        })
    })

    describe('deployments', () => {
        it('fetches namespaces and deployments', async () => {
            mockDispatchFn.mockResolvedValueOnce(['namespace1', 'namespace2']).mockResolvedValueOnce([{ justSome: 'deployment' }])

            const result = (await m.deployments({ cluster: 'cluster1' })) as { namespaces: object[] }

            expect(result).toMatchSnapshot()
        })
    })

    describe('batches', () => {
        it('fetches namespaces and batches', async () => {
            mockDispatchFn.mockResolvedValueOnce(['namespace1', 'namespace2']).mockResolvedValueOnce([{ justSome: 'batch' }])

            const result = (await m.batches({ cluster: 'cluster1' })) as { namespaces: object[] }

            expect(result).toMatchSnapshot()
        })
    })

    describe('pods', () => {
        it('fetches namespaces and pods', async () => {
            mockDispatchFn.mockResolvedValueOnce(['namespace1', 'namespace2']).mockResolvedValueOnce([{ justSome: 'pod' }])

            const result = (await m.pods({ cluster: 'cluster1' })) as { namespaces: object[] }

            expect(result).toMatchSnapshot()
        })
    })

    describe('namespace', () => {
        it('fetches pods, batches and deployments', async () => {
            mockDispatchFn
                .mockResolvedValueOnce([{ justSome: 'pod' }])
                .mockResolvedValueOnce([{ justSome: 'batch' }])
                .mockResolvedValueOnce([{ justSome: 'deployment' }])

            const result = (await m.namespace({ cluster: 'cluster1', namespace: 'namespace1' })) as { namespaces: object[] }

            expect(result).toMatchSnapshot()
        })
    })

    describe('images', () => {
        it('fetches images', async () => {
            mockDispatchFn.mockResolvedValueOnce(['tag1', 'tag2', 'tag3'])

            const result = (await m.images({ image: 'image1' })) as { images: object[] }

            expect(result).toMatchSnapshot()
        })

        describe('focused image', () => {
            it('fetches focused image', async () => {
                mockDispatchFn.mockResolvedValueOnce(['tag1', 'tag2']).mockResolvedValueOnce({ focused: 'image' })

                const result = (await m.images({ image: 'image1', tag: 'tag1' })) as { focusedImage: object }

                expect(result.focusedImage).toEqual({ focused: 'image' })
            })

            it('fetches only if the tag is available', async () => {
                mockDispatchFn.mockResolvedValueOnce(['tag1', 'tag2'])

                const result = (await m.images({ image: 'image1', tag: 'unkownTag' })) as { focusedImage: object }

                expect(result.focusedImage).toBeUndefined()
            })

            it('defaults to latest', async () => {
                mockDispatchFn.mockResolvedValueOnce(['latest']).mockResolvedValueOnce({ focused: 'image' })

                const result = (await m.images({ image: 'image1' })) as { focusedImage: object }

                expect(result.focusedImage).toEqual({ focused: 'image' })
            })
        })
    })
})
