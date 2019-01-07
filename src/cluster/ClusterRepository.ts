import { Pod } from './model/Pod'
import { Image } from './model/Image'
import { Deployment } from './model/Deployment'
import { Scaler } from './model/Scaler'
import { ServerGroup } from './model/ServerGroup'
import { ClusterSnapshot } from './model/ClusterSnapshot'

export interface ClusterRepository {
    clusters: string[]

    namespaces(context: string): Promise<string[]>
    pods(group: ServerGroup): Promise<Pod[]>
    deployments(group: ServerGroup): Promise<Deployment[]>
    updateDeployment(group: ServerGroup, deployment: Deployment, targetImage: Image): Promise<Deployment>
    restartDeployment(group: ServerGroup, deployment: Deployment): Promise<Deployment>
    scalers(group: ServerGroup): Promise<Scaler[]>

    takeSnapshot(group: ServerGroup): Promise<ClusterSnapshot>
    applySnapshot(group: ServerGroup, snapshot: ClusterSnapshot, ignoreImage: boolean): Promise<void>
}
