import { Image } from "./Image"

export interface Pod {
    name: string
    creationTimeMS: number
    ready: boolean
    image?: Image
    restarts?: number
}
