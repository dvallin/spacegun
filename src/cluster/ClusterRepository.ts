import { Pod } from "@/cluster/model/Pod"
import { Image } from "@/cluster/model/Image"
import { Deployment } from "@/cluster/model/Deployment"
import { Scaler } from "@/cluster/model/Scaler"

export interface ClusterRepository {
    clusters: string[]
    pods(cluster: string): Promise<Pod[]>
    deployments(cluster: string): Promise<Deployment[]>
    updateDeployment(cluster: string, deployment: Deployment, targetImage: Image): Promise<Deployment>
    scalers(cluster: string): Promise<Scaler[]>
}
