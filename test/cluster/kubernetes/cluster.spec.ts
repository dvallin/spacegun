import { KubernetesClusterProvider } from "../../../src/cluster/kubernetes/KubernetesCluster"
import { Pod, Deployment, Scaler } from "../../../src/cluster/Cluster"

import { Autoscaling_v1Api, Apps_v1beta2Api, Core_v1Api } from '@kubernetes/client-node'

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
                { image: { image: "image1:tag", tag: "tag" }, name: "pod1", restarts: 0 },
                { image: { image: "image2:tag", tag: "tag" }, name: "pod2", restarts: 1 }
            ])
        })
    })

    describe("deployements", () => {
        it("returns deployements", async () => {
            const deployements: Deployment[] = await cluster.deployments(cluster.clusters[0])
            expect(deployements).toEqual([
                { image: { image: "image1:tag", tag: "tag" }, name: "pod1" },
                { image: { image: "image2:tag", tag: "tag" }, name: "pod2" }
            ])
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
