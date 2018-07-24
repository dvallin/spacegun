import { Deployment } from "@/cluster/model/Deployment"
import { Image } from "@/cluster/model/Image"

export interface DeploymentPlan {
    deployment: Deployment
    image: Image
    cluster: string
}
