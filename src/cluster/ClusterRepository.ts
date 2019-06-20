import { Pod } from './model/Pod'
import { Image } from './model/Image'
import { Deployment } from './model/Deployment'
import { Scaler } from './model/Scaler'
import { ServerGroup } from './model/ServerGroup'
import { ClusterSnapshot } from './model/ClusterSnapshot'
import { Batch } from './model/Batch'

export interface ClusterRepository {
    clusters: string[]

    namespaces(context: string): Promise<string[]>
    pods(group: ServerGroup): Promise<Pod[]>
    scalers(group: ServerGroup): Promise<Scaler[]>

    batches(group: ServerGroup): Promise<Batch[]>
    updateBatch(group: ServerGroup, batch: Batch, targetImage: Image): Promise<Batch>
    restartBatch(group: ServerGroup, batch: Batch): Promise<Batch>

    deployments(group: ServerGroup): Promise<Deployment[]>
    updateDeployment(group: ServerGroup, deployment: Deployment, targetImage: Image): Promise<Deployment>
    restartDeployment(group: ServerGroup, deployment: Deployment): Promise<Deployment>

    takeSnapshot(group: ServerGroup): Promise<ClusterSnapshot>
    applySnapshot(group: ServerGroup, snapshot: ClusterSnapshot, ignoreImage: boolean): Promise<void>
}
