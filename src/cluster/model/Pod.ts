import { Image } from "./Image"

export interface Pod {
    name: string
    age: string
    ready: boolean
    image?: Image
    restarts?: number
}
