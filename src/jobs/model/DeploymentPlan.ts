import { Deployment } from "@/cluster/model/Deployment"
import { Image } from "@/cluster/model/Image"
import { ServerGroup } from "@/cluster/model/ServerGroup"

export interface DeploymentPlan {
    deployment: Deployment
    image: Image
    group: ServerGroup
}
