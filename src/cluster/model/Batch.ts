import { Image } from './Image'

export interface Batch {
    name: string
    image?: Image
    schedule: string
    concurrencyPolicy: string
}
