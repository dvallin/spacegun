import { DeploymentPlan } from './DeploymentPlan'

export interface JobPlan {
    name: string
    deployments: DeploymentPlan[]
}
