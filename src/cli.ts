import { parse } from "./options"

const options = parse()

import { KubernetesCluster } from './cluster/kubernetes/KubernetesCluster'
const cluster = new KubernetesCluster(options.kube)

console.log(cluster.clusters)
cluster.pods(cluster.clusters[0]).then((v) => console.log(v))
cluster.deployments(cluster.clusters[0]).then((v) => console.log(v))
cluster.scalers(cluster.clusters[0]).then((v) => console.log(v))
