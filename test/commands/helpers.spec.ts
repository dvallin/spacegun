import { createIO } from '../test-utils/io'

import { applyWithConsent, foreachCluster, foreachNamespace } from '../../src/commands/helpers'

const mockDispatchFn = jest.fn()
jest.mock('../../src/dispatcher/index', () => ({
    get: () => mockDispatchFn,
    call: () => mockDispatchFn,
    add: () => {},
    path: () => '',
}))

describe(applyWithConsent, () => {
    const callback = jest.fn().mockReturnValue(Promise.resolve())
    beforeEach(() => {
        callback.mockReset()
    })

    it('applies directly if flag is set', () => {
        const io = createIO()
        applyWithConsent({ command: 'apply', yes: true }, io, callback)
        expect(callback).toHaveBeenCalled()
    })

    it('does not apply if no consent', () => {
        const io = createIO({ expect: jest.fn().mockReturnValue(false) })
        applyWithConsent({ command: 'apply' }, io, callback)
        expect(callback).not.toHaveBeenCalled()
    })

    it('applies if consent is given', async () => {
        const io = createIO({ expect: jest.fn().mockReturnValue(true) })
        await applyWithConsent({ command: 'apply' }, io, callback)
        expect(callback).toHaveBeenCalled()
    })
})

describe(foreachCluster.name, () => {
    const io = createIO()
    beforeEach(() => {
        mockDispatchFn.mockReturnValue(['cluster1', 'cluster2'])
    })

    it('iterates over given clusters', async () => {
        const calledClusters: string[] = []
        await foreachCluster({ command: 'apply', cluster: 'customCluster' }, io, ({}, {}, cluster) => calledClusters.push(cluster))
        expect(calledClusters).toEqual(['customCluster'])
    })

    it('iterates over all available clusters', async () => {
        const calledClusters: string[] = []
        await foreachCluster({ command: 'apply' }, io, ({}, {}, cluster) => calledClusters.push(cluster))
        expect(calledClusters).toEqual(['cluster1', 'cluster2'])
    })
})

describe(foreachNamespace.name, () => {
    const io = createIO()
    beforeEach(() => {
        mockDispatchFn.mockReturnValue(['namespace1', 'namespace2'])
    })

    it('iterates over given namespace', async () => {
        const calledNamespaces: string[] = []
        await foreachNamespace({ command: 'apply', namespace: 'customNamespace' }, io, 'cluster1', ({}, {}, namespace) =>
            calledNamespaces.push(namespace!)
        )
        expect(calledNamespaces).toEqual(['customNamespace'])
    })

    it('iterates over all available namespaces', async () => {
        const calledNamespaces: string[] = []
        await foreachNamespace({ command: 'apply' }, io, 'cluster1', ({}, {}, namespace) => calledNamespaces.push(namespace!))
        expect(calledNamespaces).toEqual(['namespace1', 'namespace2'])
    })
})
