import { DeploymentSnapshot } from "@/cluster/model/DeploymentSnapshot"

export interface ClusterSnapshot {

    deployments: DeploymentSnapshot[]
}
