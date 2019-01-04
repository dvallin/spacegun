import { load, validatePipeline, validateSteps } from "../../src/jobs"
import { PipelineDescription } from "../../src/jobs/model/PipelineDescription"
import { StepDescription } from "../../src/jobs/model/Step";

describe("job loading", () => {

    const pipelines: Map<string, PipelineDescription> = load(`${__dirname}/pipelines`)

    it("loads jobs", () => {
        expect(pipelines.get("pipeline1")).toEqual({
            name: "pipeline1",
            cluster: "cluster1",
            cron: "0 */5 * * * MON-FRI",
            start: "probe1",
            steps: [
                {
                    name: "probe1", type: "clusterProbe", hook: "someHook"
                },
                {
                    name: "plan1", type: "planImageDeployment",
                    tag: "latest", onSuccess: "apply1",
                    filter: { deployments: ["deployment1", "deployment2"], namespaces: ["namespace1", "namespace2"] }
                },
                {
                    name: "plan2", type: "planImageDeployment",
                    semanticTagExtractor: "/^\\d{4}\\-\\d{1,2}\\-\\d{1,2}$", onSuccess: "apply1"
                },
                { name: "apply1", type: "applyDeployment" }
            ]
        })
        expect(pipelines.get("pipeline2")).toEqual({
            cluster: "cluster2",
            cron: "0 */5 * * * MON-FRI",
            name: "pipeline2",
            start: "probe1",
            steps: [
                { name: "probe1", type: "clusterProbe", hook: "https://some.hook.com", onSuccess: "deployImage" },
                { name: "plan1", type: "planClusterDeployment", cluster: "cluster3", onFailure: "rollback1", onSuccess: "apply1", },
                { name: "apply1", type: "applyDeployment", onFailure: "rollback1", onSuccess: "snapshot1" },
                { name: "snapshot1", type: "takeSnapshot" },
                { name: "rollback1", type: "rollback" }]
        })
    })
})

describe("validatePipeline", () => {

    it("ensures cluster exists", () => {
        expect(() => validatePipeline({}, "jobName")).toThrowErrorMatchingSnapshot()
    })

    it("ensures steps exists", () => {
        expect(() => validatePipeline({ cluster: "someCluster" }, "jobName")).toThrowErrorMatchingSnapshot()
    })

    it("ensures that a start step exists", () => {
        expect(() => validatePipeline({ cluster: "someCluster", steps: [] }, "jobName")).toThrowErrorMatchingSnapshot()
    })

    it("ensures that a start step exists", () => {
        expect(validatePipeline({ cluster: "someCluster", steps: [], start: "someStart" }, "jobName")).toEqual({
            cluster: "someCluster", name: "jobName", start: "someStart", steps: []
        })
    })
})

describe("validateSteps", () => {

    it("validates empty array", () => {
        expect(validateSteps([], "jobname", "clustername")).toEqual([])
    })

    it("ensures steps have name", () => {
        expect(() => validateSteps([{}], "jobname", "clustername")).toThrowErrorMatchingSnapshot()
    })

    it("ensures steps have a type", () => {
        expect(() => validateSteps([{ name: "stepName" }], "jobname", "clustername")).toThrowErrorMatchingSnapshot()
    })

    describe("planClusterDeployment", () => {

        it("ensures cluster exists", () => {
            expect(() => validateSteps([{ name: "stepName", type: "planClusterDeployment" }], "jobname", "clustername")).toThrowErrorMatchingSnapshot()
        })

        it("ensures cluster is not origin", () => {
            expect(() => validateSteps([{ name: "stepName", type: "planClusterDeployment", cluster: "clustername" }], "jobname", "clustername")).toThrowErrorMatchingSnapshot()
        })

        it("validates step", () => {
            const step: StepDescription = { name: "stepName", type: "planClusterDeployment", cluster: "otherCluster", onFailure: "failure", onSuccess: "success" }
            expect(validateSteps([step], "jobname", "clustername")).toEqual([step])
        })
    })

    describe("clusterProbe", () => {

        it("ensures hook exists", () => {
            expect(() => validateSteps([{ name: "stepName", type: "clusterProbe" }], "jobname", "clustername")).toThrowErrorMatchingSnapshot()
        })

        it("validates step", () => {
            const step: StepDescription = { name: "stepName", type: "clusterProbe", hook: "hook", onFailure: "failure", onSuccess: "success" }
            expect(validateSteps([step], "jobname", "clustername")).toEqual([step])
        })
    })

    describe("planImageDeployment", () => {

        it("validates step", () => {
            const step: StepDescription = { name: "stepName", type: "planImageDeployment", onFailure: "failure", onSuccess: "success" }
            expect(validateSteps([step], "jobname", "clustername")).toEqual([step])
        })
    })
})
