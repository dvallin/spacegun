import { Image } from './Image'

export interface Pod {
    name: string
    createdAt: number
    ready: boolean
    image?: Image
    restarts?: number
}
