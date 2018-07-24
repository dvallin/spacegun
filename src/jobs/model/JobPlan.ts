import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"

export interface JobPlan {
    name: string
    deployments: DeploymentPlan[]
}
