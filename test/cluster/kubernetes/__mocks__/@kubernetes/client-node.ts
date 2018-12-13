import { Autoscaling_v1Api as api3, Apps_v1beta2Api as api2, Core_v1Api as api1, KubeConfig } from '@kubernetes/client-node'

function mockPod(name: string, creationTimestamp: Date, image: string, restartCount: number, ready: boolean = true): object {
    const readyCondition = ready ? { type: 'Ready', status: 'True' } : { type: 'Ready', status: 'False' }
    return {
        metadata: { name, creationTimestamp },
        spec: {
            containers: [{ image }]
        },
        status: {
            conditions: [readyCondition],
            containerStatuses: [{ restartCount }]
        }
    }
}

function mockNamespace(name: string): object {
    return {
        metadata: { name }
    }
}

function mockDeployment(name: string, image: string): object {
    return {
        metadata: { name },
        spec: {
            template: {
                metadata: { annotations: {} },
                spec: {
                    containers: [{ image }]
                }
            }
        },
    }
}

function mockScaler(name: string, currentReplicas: number, minReplicas: number, maxReplicas: number): object {
    return {
        metadata: { name },
        status: {
            currentReplicas
        },
        spec: {
            minReplicas,
            maxReplicas
        }
    }
}

const Core_v1Api = jest.fn<api1>().mockImplementation(function () {
    const mockedApi = new api1()
    mockedApi.listNamespacedPod = jest.fn().mockResolvedValue({
        body: {
            items: [
                mockPod(
                    "pod1",
                    new Date(2018, 11, 16),
                    "repo/image1:tag@some:digest",
                    0,
                    true
                ),
                mockPod(
                    "pod2",
                    new Date(2018, 11, 15),
                    "repo/image2:tag@some:digest",
                    1,
                    false
                )
            ]
        }
    })
    mockedApi.listNamespace = jest.fn().mockResolvedValue({
        body: {
            items: [mockNamespace("namespace1"), mockNamespace("namespace2")]
        }
    })
    return mockedApi
});

export const replaceDeploymentMock = jest.fn()
export const createDeploymentMock = jest.fn()

const Apps_v1beta2Api = jest.fn<api2>().mockImplementation(function () {
    const mockedApi = new api2()
    mockedApi.listNamespacedDeployment = jest.fn().mockResolvedValue({
        body: {
            items: [mockDeployment("deployment1", "repo/image1:tag@some:digest"), mockDeployment("deployment2", "repo/image2:tag@some:digest")]
        }
    })
    mockedApi.readNamespacedDeployment = jest.fn().mockResolvedValue({
        body: mockDeployment("deployment1", "repo/image1:tag@some:digest")
    })
    mockedApi.createNamespacedDeployment = jest.fn().mockImplementation((namespace, body) => {
        createDeploymentMock(namespace, body)
        return { body }
    })
    mockedApi.replaceNamespacedDeployment = jest.fn().mockImplementation((name, namespace, body) => {
        if (name !== "deployment2") {
            replaceDeploymentMock(name, namespace, body)
            return { body }
        } else {
            throw Error()
        }
    })
    return mockedApi
})

const Autoscaling_v1Api = jest.fn<api3>().mockImplementation(function () {
    const mockedApi = new api3()
    mockedApi.listNamespacedHorizontalPodAutoscaler = jest.fn().mockResolvedValue({
        body: {
            items: [mockScaler("pod1", 0, 1, 2), mockScaler("pod2", 1, 2, 3)]
        }
    })
    return mockedApi
})

export {
    Core_v1Api,
    Apps_v1beta2Api,
    Autoscaling_v1Api,
    KubeConfig
};
