import { IO } from "../src/IO"

const mockDispatched = jest.fn()
const mockDispatchFn = jest.fn()
jest.mock("../src/dispatcher/index", () => ({
    get: (moduleName: string, procedureName: string) => {
        mockDispatched(moduleName, procedureName)
        return mockDispatchFn
    },
    call: (request: any) => {
        mockDispatched(request.module, request.procedure)
        return mockDispatchFn
    },
    add: () => { },
    path: () => ""
}))

import { commands } from "../src/commands"
import * as moment from "moment"

describe("commands", () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    describe(commands.images.name, () => {

        it("calls the images backend and prints images", async () => {

            // given
            const image = { imageName: "someImage" }
            mockDispatchFn.mockReturnValue([image])

            // when
            await commands.images(createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(1)
            expect(mockDispatched).toBeCalledWith("images", "list")
        })
    })

    describe(commands.namespaces.name, () => {

        it("calls the namespaces backend and prints namespace", async () => {
            // given
            mockDispatchFn.mockReturnValue(["namespace1", "namespace2"])

            // when
            await commands.namespaces(createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(3)
            expect(mockDispatched).toBeCalledWith("cluster", "namespaces")
        })
    })

    describe(commands.pipelines.name, () => {

        it("calls the jobs backend and prints pipelines", async () => {
            // given
            const pipeline = { name: "1->2", cluster: "cluster2", steps: [], start: "" }
            mockDispatchFn.mockReturnValue([pipeline])

            // when
            await commands.pipelines(createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(1)
            expect(mockDispatched).toBeCalledWith("jobs", "pipelines")
        })
    })

    describe(commands.pods.name, () => {

        it("calls the pods backend for each cluster", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: "service1", age: "2 days" }])
                .mockReturnValueOnce(["service1"])
                .mockReturnValueOnce([{ name: "service1", age: "2 days" }])

            // when
            await commands.pods(createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith("cluster", "clusters")
            expect(mockDispatched).toBeCalledWith("cluster", "namespaces")
            expect(mockDispatched).toBeCalledWith("cluster", "pods")
        })

        it("prints out the pods correctly", async () => {
            // given
            const withAgeOf = function (amount: moment.DurationInputArg1, unit: moment.DurationInputArg2): number {
                let now = moment()
                now.subtract(amount, unit)
                return now.valueOf()
            }
            mockDispatchFn
                .mockReturnValueOnce(["cluster1"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([
                    {
                        name: "service1",
                        image: undefined,
                        restarts: undefined,
                        ready: true,
                        creationTimeMS: withAgeOf(1, "day")
                    },
                    {
                        name: "service2",
                        image: { url: "url1" },
                        restarts: 1,
                        ready: false,
                        creationTimeMS: withAgeOf(2, "days")
                    },
                    {
                        name: "service3",
                        image: undefined,
                        restarts: 11,
                        ready: true,
                        creationTimeMS: withAgeOf(3, "days")
                    },
                    {
                        name: "service4",
                        image: { url: "url2" },
                        restarts: 111,
                        ready: false,
                        creationTimeMS: withAgeOf(4, "days")
                    }
                ])
            let output: string[] = []
            const out = jest.fn((text: string) => {
                output.push(text)
                return text
            })
            const io = createIO({ out })

            // when
            await commands.pods(io)

            // then
            expect(output.concat("\n")).toMatchSnapshot()
        })
    })

    describe(commands.scalers.name, () => {

        it("calls the scalers backend for each cluster", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: "scaler1", replicas: { current: 0, minimum: 1, maximum: 2 } }])
                .mockReturnValueOnce(["service1"])
                .mockReturnValueOnce([{ name: "scaler1", replicas: { current: 1, minimum: 1, maximum: 1 } }])

            // when
            await commands.scalers(createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith("cluster", "clusters")
            expect(mockDispatched).toBeCalledWith("cluster", "namespaces")
            expect(mockDispatched).toBeCalledWith("cluster", "scalers")
        })
    })

    describe(commands.deployments.name, () => {

        it("calls the pods deployments for each cluster", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: "deployment1" }])
                .mockReturnValueOnce(["service1"])
                .mockReturnValueOnce([{ name: "deployment2" }])

            // when
            await commands.deployments(createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith("cluster", "clusters")
            expect(mockDispatched).toBeCalledWith("cluster", "namespaces")
            expect(mockDispatched).toBeCalledWith("cluster", "deployments")
        })
    })

    describe(commands.run.name, () => {

        it("runs a pipeline if user agrees", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce([{ name: "pipeline1" }, { name: "pipeline2" }])
                .mockReturnValueOnce({
                    name: "plan", deployments: [
                        { name: "deployment1", deployment: {}, image: {} }
                    ]
                })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ choose, expect: expectFn })

            // when
            await commands.run(io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(3)
            expect(mockDispatched).toBeCalledWith("jobs", "pipelines")
            expect(mockDispatched).toBeCalledWith("jobs", "plan")
            expect(mockDispatched).toBeCalledWith("jobs", "run")
        })

        it("does not run a pipeline if user disagrees", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce([{ name: "pipeline1" }, { name: "pipeline2" }])
                .mockReturnValueOnce({
                    name: "plan", deployments: [
                        { name: "deployment1", deployment: {}, image: {} }
                    ]
                })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => false)
            const io = createIO({ choose, expect: expectFn })

            // when
            await commands.run(io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(2)
            expect(mockDispatched).not.toBeCalledWith("jobs", "run")
        })
    })

    describe(commands.deploy.name, () => {
        const clusters = ["cluster1", "cluster2"]
        const namespaces: string[] = []
        const deployments = [{ name: "deployment1", image: { name: "image" } }]
        const tags = ["latest", "notLatest"]
        const image = { name: "image", tag: "latest", url: "image:latest:url" }

        it("deploys an image if user agrees", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(tags)
                .mockReturnValueOnce(image)
                .mockReturnValueOnce({ name: "deployment1" })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ choose, expect: expectFn })

            // when
            await commands.deploy(io)

            // then
            expect(choose).toHaveBeenCalledTimes(3)
            expect(choose).toHaveBeenCalledWith("> ", clusters)
            expect(choose).toHaveBeenCalledWith("> ", deployments)
            expect(choose).toHaveBeenCalledWith("> ", tags)

            expect(mockDispatched).toHaveBeenCalledTimes(6)
            expect(mockDispatched).toBeCalledWith("cluster", "clusters")
            expect(mockDispatched).toBeCalledWith("cluster", "namespaces")
            expect(mockDispatched).toBeCalledWith("cluster", "deployments")
            expect(mockDispatched).toBeCalledWith("images", "tags")
            expect(mockDispatched).toBeCalledWith("images", "image")
            expect(mockDispatched).toBeCalledWith("cluster", "updateDeployment")
        })

        it("asks user for namespace if there are any", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(["service1"])
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(tags)
                .mockReturnValueOnce(image)
                .mockReturnValueOnce({ name: "deployment1" })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ choose, expect: expectFn })

            // when
            await commands.deploy(io)

            // then
            expect(choose).toHaveBeenCalledTimes(4)
            expect(choose).toHaveBeenCalledWith("> ", clusters)
            expect(choose).toHaveBeenCalledWith("> ", deployments)
            expect(choose).toHaveBeenCalledWith("> ", tags)
        })

        it("does not deploy an image if user disagrees", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(tags)
                .mockReturnValueOnce(image)
                .mockReturnValueOnce({ name: "deployment1" })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => false)
            const io = createIO({ choose, expect: expectFn })

            // when
            await commands.deploy(io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).not.toBeCalledWith("cluster", "updateDeployment")
        })
    })

    describe(commands.pipelineSchedules.name, () => {

        it("prints schedules of a pipeline", async () => {
            // given
            const pipeline = { name: "1->2", cluster: "cluster2", steps: [], start: "" }
            const schedules = { lastRun: undefined, nextRuns: [] }
            mockDispatchFn
                .mockReturnValueOnce([pipeline])
                .mockReturnValueOnce(schedules)

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)
            const io = createIO({ choose, expect: expectFn })

            // when
            await commands.pipelineSchedules(io)

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(2)
            expect(mockDispatched).toBeCalledWith("jobs", "pipelines")
            expect(mockDispatched).toBeCalledWith("jobs", "schedules")
        })
    })

    describe(commands.help.name, () => {

        it("fetches cluster and image endpoint names", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(["cluster"])
                .mockReturnValueOnce("someEndpoint")

            // when
            await commands.help(createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(2)
            expect(mockDispatched).toBeCalledWith("cluster", "clusters")
            expect(mockDispatched).toBeCalledWith("images", "endpoint")
        })
    })

    describe(commands.snapshot.name, () => {

        it("creates snapshots", async () => {
            // given
            mockDispatchFn
                .mockReturnValueOnce(["cluster"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce({
                    deployments: [
                        { data: {}, name: "deployment1" },
                        { data: {}, name: "deployment2" }
                    ]
                })

            // when
            await commands.snapshot(createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(5)
            expect(mockDispatched).toBeCalledWith("cluster", "clusters")
            expect(mockDispatched).toBeCalledWith("cluster", "namespaces")
            expect(mockDispatched).toBeCalledWith("cluster", "takeSnapshot")
            expect(mockDispatched).toBeCalledWith("artifacts", "saveArtifact")
            expect(mockDispatched).toBeCalledWith("artifacts", "saveArtifact")
        })
    })

    describe(commands.apply.name, () => {

        it("applies snapshots", async () => {
            // given
            const deployments = [
                { name: "deployment1", image: { name: "image" } },
                { name: "deployment2", image: { name: "image" } }
            ]
            mockDispatchFn
                .mockReturnValueOnce(["cluster"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce({})
                .mockReturnValueOnce({})

            // when
            await commands.apply(createIO())

            // then
            expect(mockDispatched).toHaveBeenCalledTimes(6)
            expect(mockDispatched).toBeCalledWith("cluster", "clusters")
            expect(mockDispatched).toBeCalledWith("cluster", "namespaces")
            expect(mockDispatched).toBeCalledWith("cluster", "deployments")
            expect(mockDispatched).toBeCalledWith("artifacts", "loadArtifact")
            expect(mockDispatched).toBeCalledWith("artifacts", "loadArtifact")
            expect(mockDispatched).toBeCalledWith("cluster", "applySnapshot")
        })
    })
})

function createIO(mocks: Partial<{ choose: jest.Mock<{}>, expect: jest.Mock<{}>, out: jest.Mock<{}> }> = {}): IO {
    const io = new IO()
    io.out = mocks.out || jest.fn()
    io.expect = mocks.expect || jest.fn()
    io.choose = mocks.choose || jest.fn()
    return io
}
