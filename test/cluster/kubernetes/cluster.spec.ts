import { KubernetesClusterProvider } from "../../../src/cluster/kubernetes/KubernetesCluster"
import { Pod, Deployment, Scaler } from "../../../src/cluster/Cluster"

const image1 = { name: "image1", tag: "tag", url: "repo/image1:tag" }
const image2 = { name: "image2", tag: "tag", url: "repo/image2:tag" }

describe("KubernetesClusterProvider", () => {
    const cluster = new KubernetesClusterProvider('./test/config/kube')

    describe("clusters", () => {
        it("returns the names of the clusters", () => {
            expect(cluster.clusters).toEqual(["dev", "pre", "live"])
        })
    })

    describe("pods", () => {
        it("returns pods", async () => {
            const pods: Pod[] = await cluster.pods(cluster.clusters[0])
            expect(pods).toEqual([
                { image: image1, name: "pod1", restarts: 0, ready: true },
                { image: image2, name: "pod2", restarts: 1, ready: false },
            ])
        })
    })

    describe("deployements", () => {
        it("returns deployements", async () => {
            const deployements: Deployment[] = await cluster.deployments(cluster.clusters[0])
            expect(deployements).toEqual([
                { image: image1, name: "deployement1" },
                { image: image2, name: "deployement2" }
            ])
        })

        it("updates deployments", async () => {
            const deployement: Deployment = await cluster.updateDeployment(
                cluster.clusters[0], { image: image1, name: "deployement1" }, image2
            )
            expect(deployement).toEqual(
                { image: { name: "updatedImage", tag: "tag", url: "repo/updatedImage:tag" }, name: "updatedDeployment" }
            )
        })
    })

    describe("scalers", () => {
        it("returns horizontal auto scalers", async () => {
            const scalers: Scaler[] = await cluster.scalers(cluster.clusters[0])
            expect(scalers).toEqual([
                { name: "pod1", replicas: { current: 0, maximum: 2, minimum: 1 } },
                { name: "pod2", replicas: { current: 1, maximum: 3, minimum: 2 } }
            ])
        })
    })
})
