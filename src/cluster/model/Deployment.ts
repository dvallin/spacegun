import { Image } from "@/cluster/model/Image"

export interface Deployment {
    name: string
    image?: Image
}
