import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import { init, moduleName, functions } from "../../src/cluster/ClusterModule"
import { ClusterRepository } from "../../src/cluster/ClusterRepository"
import { get } from "../../src/dispatcher"
import { RequestInput } from "../../src/dispatcher/model/RequestInput"

const clusters = ["cluster1", "cluster2"]
const pods = jest.fn()
const namespaces = jest.fn()
const deployments = jest.fn()
const updateDeployment = jest.fn()
const scalers = jest.fn()
const repo: ClusterRepository = {
    clusters, namespaces, pods, deployments, updateDeployment, scalers
}

init(repo)

describe("cluster module", () => {

    it("calls clusters", () => {
        // when
        const call = get(moduleName, functions.clusters)()

        // then
        expect(call).resolves.toEqual(clusters)
    })

    it("calls pods", () => {
        // given
        pods.mockReturnValueOnce({})

        // when
        const call = get(moduleName, functions.pods)(
            RequestInput.of(["cluster", "clusterName"])
        )

        // then
        expect(call).resolves.toEqual({})
        expect(pods).toHaveBeenCalledTimes(1)
        expect(pods).toHaveBeenCalledWith({ cluster: "clusterName" })
    })

    it("calls scalers", () => {
        // given
        scalers.mockReturnValueOnce({})

        // when
        const call = get(moduleName, functions.scalers)(
            RequestInput.of(["cluster", "clusterName"])
        )

        // then
        expect(call).resolves.toEqual({})
        expect(scalers).toHaveBeenCalledTimes(1)
        expect(scalers).toHaveBeenCalledWith({ cluster: "clusterName" })
    })

    it("calls deployments", () => {
        // given
        deployments.mockReturnValueOnce({})

        // when
        const call = get(moduleName, functions.deployments)(
            RequestInput.of(["cluster", "clusterName"])
        )

        // then
        expect(call).resolves.toEqual({})
        expect(deployments).toHaveBeenCalledTimes(1)
        expect(deployments).toHaveBeenCalledWith({ cluster: "clusterName" })
    })

    it("calls deployments", () => {
        // given
        updateDeployment.mockReturnValueOnce({})
        const deployment = { id: 1 }
        const image = { id: 2 }

        // when
        const call = get(moduleName, functions.updateDeployment)(
            RequestInput.ofData({
                deployment, image
            }, ["cluster", "clusterName"])
        )

        // then
        expect(call).resolves.toEqual({})
        expect(updateDeployment).toHaveBeenCalledTimes(1)
        expect(updateDeployment).toHaveBeenCalledWith({ cluster: "clusterName" }, deployment, image)
    })
})
