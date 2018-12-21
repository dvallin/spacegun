import { Request } from "../../../src/dispatcher/model/Request"

import { PlanClusterDeployment } from "../../../src/jobs/steps/PlanClusterDeployment"
import { ServerGroup } from "../../../src/cluster/model/ServerGroup"
import { Deployment } from "../../../src/cluster/model/Deployment"

let mockDeployments: { [key: string]: Deployment[] } = {}

jest.mock("../../../src/dispatcher/index", () => ({
    get: jest.fn(),
    call: (request: Request<any, any>) => {
        switch (request.module) {
            case "cluster": {
                switch (request.procedure) {
                    case "deployments": {
                        return (input: { cluster: string }) => Promise.resolve(mockDeployments[input.cluster])
                    }
                }
                break
            }
        }
        return undefined
    },
    add: () => { },
    path: () => ""
}))

describe(PlanClusterDeployment.name, () => {

    const group: ServerGroup = { cluster: "targetCluster", namespace: "namespace" }
    const step = new PlanClusterDeployment("name", "sourceCluster", {
        namespaces: ["namespace"],
        deployments: ["deployment1"]
    })
    const targetDeployments: Deployment[] = [{
        name: "deployment1", image: { name: "image1", url: "url2" }
    }]

    it("plans deployments", async () => {
        // given
        mockDeployments = { sourceCluster: [{ name: "deployment1", image: { name: "image1", url: "url1" } }] }

        // when
        const plan = await step.plan(group, targetDeployments)

        // then
        expect(plan).toEqual([
            {
                deployment: { name: "deployment1", image: { name: "image1", url: "url2" } },
                group: { cluster: "targetCluster", namespace: "namespace" },
                image: { name: "image1", url: "url1" }
            }
        ])
    })

    it("ignores deployments that have same image as source", async () => {
        // given
        mockDeployments = { sourceCluster: [{ name: "deployment1", image: { name: "image1", url: "url1" } }] }

        // when
        const plan = await step.plan(group, [{ name: "deployment1", image: { name: "image1", url: "url1" } }])

        // then
        expect(plan).toEqual([])
    })

    it("ignores deployments that do not match", async () => {
        // given
        mockDeployments = { sourceCluster: [{ name: "deployment2", image: { name: "image1", url: "url1" } }] }

        // when
        const plan = await step.plan(group, [{ name: "deployment2", image: { name: "image1", url: "url2" } }])

        // then
        expect(plan).toEqual([])
    })

    it("ignores deployments that cannot be found in source", async () => {
        // given
        step.io.error = jest.fn()
        mockDeployments = { sourceCluster: [{ name: "otherDeployment", image: { name: "image1", url: "url1" } }] }

        // when
        const plan = await step.plan(group, targetDeployments)

        // then
        expect(plan).toEqual([])
        expect(step.io.error).toHaveBeenCalledWith(
            "deployment1 in cluster targetCluster has no appropriate deployment in cluster sourceCluster"
        )
    })

    it("ignores deployments have no image in source", async () => {
        // given
        step.io.error = jest.fn()
        mockDeployments = { sourceCluster: [{ name: "deployment1" }] }

        // when
        const plan = await step.plan(group, targetDeployments)

        // then
        expect(plan).toEqual([])
        expect(step.io.error).toHaveBeenCalledWith(
            "deployment1 in cluster targetCluster has no image"
        )
    })

    it("does not plan if server group does not match", async () => {
        // when
        const plan = await step.plan({ cluster: "cluster", namespace: "other" }, targetDeployments)

        // then
        expect(plan).toEqual([])
    })
})
