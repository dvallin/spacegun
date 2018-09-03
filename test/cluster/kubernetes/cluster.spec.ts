import { KubernetesClusterRepository } from "../../../src/cluster/kubernetes/KubernetesClusterRepository"
import { Pod } from "../../../src/cluster/model/Pod"
import { Deployment } from "../../../src/cluster/model/Deployment"
import { Scaler } from "../../../src/cluster/model/Scaler"
import { ClusterSnapshot } from "../../../src/cluster/model/ClusterSnapshot"

import { Request } from "../../../src/dispatcher/model/Request"

const image1 = { name: "image1", tag: "tag", url: "repo/image1:tag" }
const image2 = { name: "image2", tag: "tag", url: "repo/image2:tag" }

const logMock = jest.fn()

import * as dispatcher from "../../../src/dispatcher"
import { replaceDeploymentMock } from "./__mocks__/@kubernetes/client-node";
dispatcher.call = (request: Request<any, any>) => {
    switch (request.module) {
        case "events": {
            switch (request.procedure) {
                case "log": {
                    return (input) => { logMock(input) }
                }
            }
        }
    }
}
describe("KubernetesClusterProvider", () => {

    beforeEach(() => {
        replaceDeploymentMock.mockReset()
    })

    const cluster = KubernetesClusterRepository.fromConfig("./test/test-config/kube/config")

    describe("clusters", () => {

        it("returns the names of the clusters", () => {
            expect(cluster.clusters).toEqual(["dev", "pre", "live"])
        })
    })

    describe("namespaces", () => {

        it("returns the names of the namespaces", async () => {
            const namespaces: string[] = await cluster.namespaces("dev")
            expect(namespaces).toEqual(["namespace1", "namespace2"])
        })

        it("returns only namespaces thate are allowed namespaces", async () => {
            const cluster2 = KubernetesClusterRepository.fromConfig("./test/test-config/kube/config", ["namespace2"])
            const namespaces: string[] = await cluster2.namespaces("dev")
            expect(namespaces).toEqual(["namespace2"])
        })
    })

    describe("pods", () => {

        it("returns pods", async () => {
            const pods: Pod[] = await cluster.pods({
                cluster: cluster.clusters[0]
            })
            expect(pods).toEqual([
                { image: image1, name: "pod1", restarts: 0, ready: true },
                { image: image2, name: "pod2", restarts: 1, ready: false },
            ])
        })
    })

    describe("deployments", () => {

        it("returns deployments", async () => {
            const deployments: Deployment[] = await cluster.deployments({
                cluster: cluster.clusters[0]
            })
            expect(deployments).toEqual([
                { image: image1, name: "deployment1" },
                { image: image2, name: "deployment2" }
            ])
        })

        it("updates deployments", async () => {
            const deployment: Deployment = await cluster.updateDeployment(
                { cluster: cluster.clusters[0] },
                { image: image1, name: "deployment1" },
                image2
            )
            expect(deployment).toEqual(
                { image: { name: "updatedImage", tag: "tag", url: "repo/updatedImage:tag" }, name: "updatedDeployment" }
            )
        })
    })

    describe("scalers", () => {

        it("returns horizontal auto scalers", async () => {
            const scalers: Scaler[] = await cluster.scalers({
                cluster: cluster.clusters[0]
            })
            expect(scalers).toEqual([
                { name: "pod1", replicas: { current: 0, maximum: 2, minimum: 1 } },
                { name: "pod2", replicas: { current: 1, maximum: 3, minimum: 2 } }
            ])
        })
    })

    describe("takeSnapshot", () => {

        it("returns a description of all deployments", async () => {
            const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                cluster: cluster.clusters[0]
            })
            expect(snapshot.deployments).toHaveLength(2)
        })
    })

    describe("appliesSnapshots", () => {

        it("calls endpoints only if needed", async () => {
            const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                cluster: cluster.clusters[0]
            })
            snapshot.deployments[0].data.spec.replicas = 2
            snapshot.deployments[0].data.spec.template.spec.containers[0].image = "somenewsillyimage"

            await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot)

            expect(replaceDeploymentMock).toHaveBeenCalledTimes(1)
            expect(replaceDeploymentMock).toHaveBeenCalledWith("deployment1", "default", {
                metadata: { name: "deployment1" },
                spec: { replicas: 2, template: { spec: { containers: [{ image: "repo/image1:tag" }] } } }
            })
        })

        it("calls endpoints if deployment is not known yet", async () => {
            const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                cluster: cluster.clusters[0]
            })
            snapshot.deployments[0].name = "somesillydeployment"
            snapshot.deployments[0].data.metadata.name = "somesillydeployment"
            snapshot.deployments[0].data.spec.replicas = 2
            snapshot.deployments[0].data.spec.template.spec.containers[0].image = "somenewsillyimage"

            await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot)

            expect(replaceDeploymentMock).toHaveBeenCalledTimes(1)
            expect(replaceDeploymentMock).toHaveBeenCalledWith("somesillydeployment", "default", {
                metadata: { name: "somesillydeployment" },
                spec: { replicas: 2, template: { spec: { containers: [{ image: "somenewsillyimage" }] } } }
            })
        })

        it("sends results to slack", async () => {
            const snapshot: ClusterSnapshot = await cluster.takeSnapshot({
                cluster: cluster.clusters[0]
            })
            snapshot.deployments[0].data.spec.replicas = 2
            snapshot.deployments[1].data.spec.replicas = 2

            await cluster.applySnapshot({ cluster: cluster.clusters[0] }, snapshot)

            expect(logMock).toHaveBeenCalledWith({
                description: "Applied Snapshots in dev ∞ undefined",
                fields: [
                    { title: "Failure", value: "Deployment deployment2" },
                    { title: "Success", value: "Deployment deployment1" }
                ],
                message: "Applied Snapshots",
                timestamp: 1520899200000,
                topics: ["slack"]
            })
        })
    })
})
