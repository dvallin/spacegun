import { Pod } from "./model/Pod"
import { Image } from "./model/Image"
import { Deployment } from "./model/Deployment"
import { Scaler } from "./model/Scaler"

export interface ClusterRepository {
    clusters: string[]
    pods(cluster: string): Promise<Pod[]>
    deployments(cluster: string): Promise<Deployment[]>
    updateDeployment(cluster: string, deployment: Deployment, targetImage: Image): Promise<Deployment>
    scalers(cluster: string): Promise<Scaler[]>
}
