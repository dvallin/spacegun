import { Pod } from "@/cluster/model/Pod"
import { Image } from "@/cluster/model/Image"
import { Deployment } from "@/cluster/model/Deployment"
import { Scaler } from "@/cluster/model/Scaler"
import { ServerGroup } from "@/cluster/model/ServerGroup"
import { ClusterSnapshot } from "@/cluster/model/ClusterSnapshot"

export interface ClusterRepository {
    clusters: string[]

    namespaces(context: string): Promise<string[]>
    pods(group: ServerGroup): Promise<Pod[]>
    deployments(group: ServerGroup): Promise<Deployment[]>
    updateDeployment(group: ServerGroup, deployment: Deployment, targetImage: Image): Promise<Deployment>
    scalers(group: ServerGroup): Promise<Scaler[]>

    takeSnapshot(group: ServerGroup): Promise<ClusterSnapshot>
    applySnapshot(group: ServerGroup, snapshot: ClusterSnapshot, ignoreImage: boolean): Promise<void>
}
