import { Request } from "../../../src/dispatcher/model/Request"

import { PlanImageDeployment } from "../../../src/jobs/steps/PlanImageDeployment"
import { ServerGroup } from "../../../src/cluster/model/ServerGroup"
import { Deployment } from "../../../src/cluster/model/Deployment"
import { Image } from "../../../src/images/model/Image"

let mockImages: { [name: string]: Image } = {}

jest.mock("../../../src/dispatcher/index", () => ({
    get: jest.fn(),
    call: (request: Request<any, any>) => {
        switch (request.module) {
            case "images": {
                switch (request.procedure) {
                    case "image": {
                        return (input: { name: string, tag: string }) => Promise.resolve(mockImages[input.name])
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

describe(PlanImageDeployment.name, () => {


    const group: ServerGroup = { cluster: "targetCluster", namespace: "namespace" }
    const step = new PlanImageDeployment("name", "sourceCluster", {
        namespaces: ["namespace"],
        deployments: ["deployment1"]
    })
    const targetDeployments: Deployment[] = [{
        name: "deployment1", image: { name: "image1", url: "url2" }
    }]

    it("plans deployments", async () => {
        // given
        mockImages = { image1: { name: "image1", tag: "tag", url: "url1" } }

        // when
        const plan = await step.plan(group, targetDeployments)

        // then
        expect(plan).toEqual([
            {
                deployment: { name: "deployment1", image: { name: "image1", url: "url2" } },
                group: { cluster: "targetCluster", namespace: "namespace" },
                image: { name: "image1", tag: "tag", url: "url1" }
            }
        ])
    })

    it("ignores deployments that have same source image", async () => {
        // given
        mockImages = { image1: { name: "image1", tag: "tag", url: "url2" } }

        // when
        const plan = await step.plan(group, targetDeployments)

        // then
        expect(plan).toEqual([])
    })

    it("ignores deployments that do not match", async () => {
        // given
        mockImages = { image1: { name: "image1", tag: "tag", url: "url1" } }

        // when
        const plan = await step.plan(group, [{ name: "deployment2", image: { name: "image1", url: "url2" } }])

        // then
        expect(plan).toEqual([])
    })

    it("ignores deployments that have not image", async () => {
        // given
        step.io.error = jest.fn()
        mockImages = { image1: { name: "image1", tag: "tag", url: "url1" } }

        // when
        const plan = await step.plan(group, [{ name: "deployment1" }])

        // then
        expect(plan).toEqual([])
        expect(step.io.error).toHaveBeenCalledWith(
            "deployment1 in cluster targetCluster has no image, so spacegun cannot determine the right image source"
        )
    })

    it("does not plan if server group does not match", async () => {
        // given
        mockImages = { image1: { name: "image1", tag: "tag", url: "url1" } }

        // when
        const plan = await step.plan({ cluster: "cluster", namespace: "other" }, targetDeployments)

        // then
        expect(plan).toEqual([])
    })
})
