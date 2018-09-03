import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import { init, clusters, pods, scalers, deployments, updateDeployment, namespaces, takeSnapshot, applySnapshot } from "../../src/cluster/ClusterModule"
import { ClusterRepository } from "../../src/cluster/ClusterRepository"
import { call } from "../../src/dispatcher"

const podsMock = jest.fn()
const namespacesMock = jest.fn()
const deploymentsMock = jest.fn()
const updateDeploymentMock = jest.fn()
const scalersMock = jest.fn()
const takeSnapshotMock = jest.fn()
const applySnapshotMock = jest.fn()
const repo: ClusterRepository = {
    clusters: ["cluster1", "cluster2"],
    pods: podsMock,
    namespaces: namespacesMock,
    deployments: deploymentsMock,
    updateDeployment: updateDeploymentMock,
    scalers: scalersMock,
    takeSnapshot: takeSnapshotMock,
    applySnapshot: applySnapshotMock,
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

    it("calls namespaces", async () => {
        // given
        namespacesMock.mockReturnValueOnce([])

        // when
        const result = await call(namespaces)({ cluster: "clusterName" })

        // then
        expect(result).toEqual([])
        expect(namespacesMock).toHaveBeenCalledTimes(1)
        expect(namespacesMock).toHaveBeenCalledWith("clusterName")
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

    it("calls take snapshot", async () => {
        // given
        takeSnapshotMock.mockReturnValueOnce({})

        // when
        const result = await call(takeSnapshot)({ cluster: "clusterName" })

        // then
        expect(result).toEqual({})
        expect(takeSnapshotMock).toHaveBeenCalledTimes(1)
        expect(takeSnapshotMock).toHaveBeenCalledWith({ cluster: "clusterName" })
    })

    it("calls apply snapshot", async () => {
        // given
        applySnapshotMock.mockReturnValueOnce({})

        // when
        const result = await call(applySnapshot)({ group: { cluster: "clusterName" }, snapshot: {} })

        // then
        expect(result).toEqual({})
        expect(applySnapshotMock).toHaveBeenCalledTimes(1)
        expect(applySnapshotMock).toHaveBeenCalledWith({ cluster: "clusterName" }, {})
    })
})
