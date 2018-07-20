import { Image } from "@/cluster/model/Image"

export interface Pod {
    name: string
    ready: boolean
    image?: Image
    restarts?: number
}
