import { EventField } from "@/events/model/EventField"

export interface Event {

    readonly message: string
    readonly timestamp: number
    readonly topics: string[]

    readonly description: string
    readonly fields: EventField[]
}
