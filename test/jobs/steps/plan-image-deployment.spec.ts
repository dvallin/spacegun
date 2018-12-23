import { Request } from "../../../src/dispatcher/model/Request"

import { PlanImageDeployment } from "../../../src/jobs/steps/PlanImageDeployment"
import { ServerGroup } from "../../../src/cluster/model/ServerGroup"
import { Deployment } from "../../../src/cluster/model/Deployment"
import { Image } from "../../../src/images/model/Image"

let mockImages: { [name: string]: Image } = {}
let mockTags: { [name: string]: string[] } = {}

const mockImageRequest = jest.fn()

jest.mock("../../../src/dispatcher/index", () => ({
    get: jest.fn(),
    call: (request: Request<any, any>) => {
        switch (request.module) {
            case "images": {
                switch (request.procedure) {
                    case "image": {
                        return (input: { name: string, tag: string }) => {
                            mockImageRequest(input)
                            return Promise.resolve(mockImages[input.name])
                        }
                    }
                    case "tags": {
                        return (input: { name: string }) => Promise.resolve(mockTags[input.name])
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

    beforeEach(() => {
        mockImageRequest.mockReset()
    })

    const group: ServerGroup = { cluster: "targetCluster", namespace: "namespace" }
    const step = new PlanImageDeployment("name", "latest", undefined, {
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
        const plan = await step.plan(group, "pipeline1", targetDeployments)

        // then
        expect(plan.deployments).toEqual([
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
        const plan = await step.plan(group, "pipeline1", targetDeployments)

        // then
        expect(plan.deployments).toEqual([])
    })

    it("ignores deployments that do not match", async () => {
        // given
        mockImages = { image1: { name: "image1", tag: "tag", url: "url1" } }

        // when
        const plan = await step.plan(group, "pipeline1", [{ name: "deployment2", image: { name: "image1", url: "url2" } }])

        // then
        expect(plan.deployments).toEqual([])
    })

    it("ignores deployments that have not image", async () => {
        // given
        step.io.error = jest.fn()
        mockImages = { image1: { name: "image1", tag: "tag", url: "url1" } }

        // when
        const plan = await step.plan(group, "pipeline1", [{ name: "deployment1" }])

        // then
        expect(plan.deployments).toEqual([])
        expect(step.io.error).toHaveBeenCalledWith(
            "deployment1 in cluster targetCluster has no image, so spacegun cannot determine the right image source"
        )
    })

    it("does not plan if server group does not match", async () => {
        // given
        mockImages = { image1: { name: "image1", tag: "tag", url: "url1" } }

        // when
        const plan = await step.plan({ cluster: "cluster", namespace: "other" }, "pipeline1", targetDeployments)

        // then
        expect(plan.deployments).toEqual([])
    })

    describe("tag resolution", () => {

        const latestImage = { name: "image1", tag: "latest", url: "url1" }

        it("uses the defined tag if present", async () => {
            // given
            mockImages = { image1: latestImage }
            const step = new PlanImageDeployment("name", "latest", undefined, undefined)

            // when
            const plan = await step.plan(group, "pipeline1", targetDeployments)

            // then
            expect(plan.deployments[0].image).toEqual(latestImage)
        })

        it("uses the lexicographically largest tag", async () => {
            // given
            mockTags = { image1: ["a", "b", "c"] }
            mockImages = { image1: latestImage }
            const step = new PlanImageDeployment("name", undefined, undefined, undefined)

            // when
            const plan = await step.plan(group, "pipeline1", targetDeployments)

            // then
            expect(mockImageRequest).toHaveBeenCalledWith({ name: "image1", tag: "c" })
            expect(plan.deployments[0].image).toEqual(latestImage)
        })

        it("uses the matching tag", async () => {
            // given
            mockTags = { image1: ["someTag", "latest"] }
            mockImages = { image1: latestImage }
            const step = new PlanImageDeployment("name", undefined, "latest", undefined)

            // when
            const plan = await step.plan(group, "pipeline1", targetDeployments)

            // then
            expect(mockImageRequest).toHaveBeenCalledWith({ name: "image1", tag: "latest" })
            expect(plan.deployments[0].image).toEqual(latestImage)
        })

        it("extracts the matching part and uses the lexicographically largest one", async () => {
            // given
            mockTags = { image1: ["latest1", "latest2", "latest3", "latest4"] }
            mockImages = { image1: latestImage }
            const step = new PlanImageDeployment("name", undefined, "latest.", undefined)

            // when
            const plan = await step.plan(group, "pipeline1", targetDeployments)

            // then
            expect(mockImageRequest).toHaveBeenCalledTimes(1)
            expect(mockImageRequest).toHaveBeenCalledWith({ name: "image1", tag: "latest4" })
            expect(plan.deployments[0].image).toEqual(latestImage)
        })


        it("works with more complex regex", async () => {
            mockTags = { image1: ["ztag-2003-1-92", "aaatag-2020-10-01", "aaatag-2018-99-99"] }
            mockImages = { image1: latestImage }
            const step = new PlanImageDeployment("name", undefined, "\\d{4}\-\\d{1,2}\-\\d{1,2}$", undefined)

            // when
            await step.plan(group, "pipeline1", targetDeployments)

            // then
            expect(mockImageRequest).toHaveBeenCalledTimes(1)
            expect(mockImageRequest).toHaveBeenCalledWith({ name: "image1", tag: "aaatag-2020-10-01" })
        })

        it("throws an error if it cannot match a single tag", async () => {
            // given
            mockTags = { image1: ["notLatest", "otherTag", "coolTag"] }
            const step = new PlanImageDeployment("name", undefined, "latest.", undefined)

            // when /
            expect(step.plan(group, "pipeline1", targetDeployments)).rejects.toMatchSnapshot()
        })

        it("throws an error if it cannot match a unique tag", async () => {
            // given
            mockTags = { image1: ["latest1", "latest2"] }
            const step = new PlanImageDeployment("name", undefined, "latest", undefined)

            // when / then
            expect(step.plan(group, "pipeline1", targetDeployments)).rejects.toMatchSnapshot()
        })
    })
})
