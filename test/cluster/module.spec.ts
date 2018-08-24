import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import { init, clusters, pods, scalers, deployments, updateDeployment } from "../../src/cluster/ClusterModule"
import { ClusterRepository } from "../../src/cluster/ClusterRepository"
import { get, call } from "../../src/dispatcher"
import { RequestInput } from "../../src/dispatcher/model/RequestInput"

const podsMock = jest.fn()
const namespacesMock = jest.fn()
const deploymentsMock = jest.fn()
const updateDeploymentMock = jest.fn()
const scalersMock = jest.fn()
const repo: ClusterRepository = {
    clusters: ["cluster1", "cluster2"],
    pods: podsMock,
    namespaces: namespacesMock,
    deployments: deploymentsMock,
    updateDeployment: updateDeploymentMock,
    scalers: scalersMock
}

init(repo)

describe("cluster module", async () => {

    it("calls clusters", async () => {
        // when
        const result = await call(clusters)()

        // then
        expect(result).toEqual(["cluster1", "cluster2"])
    })

    it("calls pods", async () => {
        // given
        podsMock.mockReturnValueOnce({})

        // when
        const result = await call(pods)({ cluster: "clusterName" })

        // then
        expect(result).toEqual({})
        expect(podsMock).toHaveBeenCalledTimes(1)
        expect(podsMock).toHaveBeenCalledWith({ cluster: "clusterName" })
    })

    it("calls scalers", async () => {
        // given
        scalersMock.mockReturnValueOnce({})

        // when
        const result = await call(scalers)({ cluster: "clusterName" })

        // then
        expect(result).toEqual({})
        expect(scalersMock).toHaveBeenCalledTimes(1)
        expect(scalersMock).toHaveBeenCalledWith({ cluster: "clusterName" })
    })

    it("calls deployments", async () => {
        // given
        deploymentsMock.mockReturnValueOnce({})

        // when
        const result = await call(deployments)({ cluster: "clusterName" })

        // then
        expect(result).toEqual({})
        expect(deploymentsMock).toHaveBeenCalledTimes(1)
        expect(deploymentsMock).toHaveBeenCalledWith({ cluster: "clusterName" })
    })

    it("calls deployments", async () => {
        // given
        updateDeploymentMock.mockReturnValueOnce({})
        const deployment = { id: 1 }
        const image = { id: 2 }

        // when
        const result = await call(updateDeployment)({
            deployment,
            image,
            group: { cluster: "clusterName" }
        })

        // then
        expect(result).toEqual({})
        expect(updateDeploymentMock).toHaveBeenCalledTimes(1)
        expect(updateDeploymentMock).toHaveBeenCalledWith({ cluster: "clusterName" }, deployment, image)
    })
})
