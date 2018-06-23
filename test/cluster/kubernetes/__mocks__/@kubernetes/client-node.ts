import { Autoscaling_v1Api as api3, Apps_v1beta2Api as api2, Core_v1Api as api1, KubeConfig } from '@kubernetes/client-node'

function mockPod(name: string, image: string, restartCount: number): object {
    return {
        metadata: { name },
        spec: {
            containers: [{ image }]
        },
        status: {
            containerStatuses: [{ restartCount }]
        }
    }
}

function mockDeployment(name: string, image: string): object {
    return {
        metadata: { name },
        spec: {
            template: {
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
    mockedApi.listNamespacedPod = jest.fn().mockReturnValue({
        get: () => ({
            items: [mockPod("pod1", "image1", 0), mockPod("pod2", "image2", 1)]
        })
    })
    return mockedApi
});

const Apps_v1beta2Api = jest.fn<api2>().mockImplementation(function () {
    const mockedApi = new api2()
    mockedApi.listNamespacedDeployment = jest.fn().mockReturnValue({
        get: () => ({
            items: [mockDeployment("pod1", "image1"), mockDeployment("pod2", "image2")]
        })
    })
    return mockedApi
})

const Autoscaling_v1Api = jest.fn<api3>().mockImplementation(function () {
    const mockedApi = new api3()
    mockedApi.listNamespacedHorizontalPodAutoscaler = jest.fn().mockReturnValue({
        get: () => ({
            items: [mockScaler("pod1", 0, 1, 2), mockScaler("pod2", 1, 2, 3)]
        })
    })
    return mockedApi
})

export {
    Core_v1Api,
    Apps_v1beta2Api,
    Autoscaling_v1Api,
    KubeConfig
};
