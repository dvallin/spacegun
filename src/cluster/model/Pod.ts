import { Image } from "./Image"

export interface Pod {
    name: string
    ready: boolean
    image?: Image
    restarts?: number
}
