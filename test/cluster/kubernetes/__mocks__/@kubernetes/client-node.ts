import {
    BatchV1beta1Api as api4,
    AutoscalingV1Api as api3,
    AppsV1beta2Api as api2,
    CoreV1Api as api1,
    KubeConfig,
} from '@kubernetes/client-node'

function mockPod(name: string, creationTimestamp: Date, image: string, restartCount: number, ready: boolean = true): object {
    const readyCondition = ready ? { type: 'Ready', status: 'True' } : { type: 'Ready', status: 'False' }
    return {
        metadata: { name, creationTimestamp },
        spec: {
            containers: [{ image }],
        },
        status: {
            conditions: [readyCondition],
            containerStatuses: [{ restartCount }],
        },
    }
}

function mockNamespace(name: string): object {
    return {
        metadata: { name },
    }
}

function mockDeployment(name: string, image: string): object {
    return {
        metadata: { name },
        spec: {
            template: {
                metadata: { annotations: {} },
                spec: {
                    containers: [{ image }],
                },
            },
        },
    }
}

function mockBatch(name: string, image: string): object {
    return {
        metadata: { name },
        spec: {
            jobTemplate: {
                spec: {
                    template: {
                        metadata: { annotations: {} },
                        spec: {
                            containers: [{ image }],
                        },
                    },
                },
            },
        },
    }
}

function mockScaler(name: string, currentReplicas: number, minReplicas: number, maxReplicas: number): object {
    return {
        metadata: { name },
        status: {
            currentReplicas,
        },
        spec: {
            minReplicas,
            maxReplicas,
        },
    }
}

const CoreV1Api = jest.fn().mockImplementation(function() {
    const mockedApi = new api1()
    mockedApi.listNamespacedPod = jest.fn().mockResolvedValue({
        body: {
            items: [
                mockPod('pod1', new Date(2018, 11, 16), 'repo/image1:tag@some:digest', 0, true),
                mockPod('pod2', new Date(2018, 11, 15), 'repo/image2:tag@some:digest', 1, false),
            ],
        },
    })
    mockedApi.listNamespace = jest.fn().mockResolvedValue({
        body: {
            items: [mockNamespace('namespace1'), mockNamespace('namespace2')],
        },
    })
    return mockedApi
})

export const replaceDeploymentMock = jest.fn()
export const createDeploymentMock = jest.fn()

const AppsV1beta2Api = jest.fn().mockImplementation(function() {
    const mockedApi = new api2()
    mockedApi.listNamespacedDeployment = jest.fn().mockResolvedValue({
        body: {
            items: [
                mockDeployment('deployment1', 'repo/image1:tag@some:digest'),
                mockDeployment('deployment2', 'repo/image2:tag@some:digest'),
            ],
        },
    })
    mockedApi.readNamespacedDeployment = jest.fn().mockResolvedValue({
        body: mockDeployment('deployment1', 'repo/image1:tag@some:digest'),
    })
    mockedApi.createNamespacedDeployment = jest.fn().mockImplementation((namespace, body) => {
        createDeploymentMock(namespace, body)
        return { body }
    })
    mockedApi.replaceNamespacedDeployment = jest.fn().mockImplementation((name, namespace, body) => {
        if (name !== 'deployment2') {
            replaceDeploymentMock(name, namespace, body)
            return { body }
        } else {
            throw Error()
        }
    })
    return mockedApi
})

const AutoscalingV1Api = jest.fn().mockImplementation(function() {
    const mockedApi = new api3()
    mockedApi.listNamespacedHorizontalPodAutoscaler = jest.fn().mockResolvedValue({
        body: {
            items: [mockScaler('pod1', 0, 1, 2), mockScaler('pod2', 1, 2, 3)],
        },
    })
    return mockedApi
})

export const replaceBatchMock = jest.fn()
export const createBatchMock = jest.fn()

const BatchV1beta1Api = jest.fn().mockImplementation(function() {
    const mockedApi = new api4()
    mockedApi.listNamespacedCronJob = jest.fn().mockResolvedValue({
        body: {
            items: [mockBatch('batch1', 'repo/image1:tag@some:digest'), mockBatch('batch2', 'repo/image2:tag@some:digest')],
        },
    })
    mockedApi.readNamespacedCronJob = jest.fn().mockResolvedValue({
        body: mockBatch('batch1', 'repo/image1:tag@some:digest'),
    })
    mockedApi.createNamespacedCronJob = jest.fn().mockImplementation((namespace, body) => {
        createBatchMock(namespace, body)
        return { body }
    })
    mockedApi.replaceNamespacedCronJob = jest.fn().mockImplementation((name, namespace, body) => {
        if (name !== 'batch2') {
            replaceBatchMock(name, namespace, body)
            return { body }
        } else {
            throw Error()
        }
    })
    return mockedApi
})

export { BatchV1beta1Api, CoreV1Api, AppsV1beta2Api, AutoscalingV1Api, KubeConfig }
