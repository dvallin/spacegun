import { DeploymentPlan } from './DeploymentPlan'
import { Deployment } from 'src/cluster/model/Deployment'
import { Batch } from 'src/cluster/model/Batch'

export interface JobPlan {
    name: string
    deployments: DeploymentPlan<Deployment>[]
    batches: DeploymentPlan<Batch>[]
}
