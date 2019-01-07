import { Event } from './model/Event'

export interface EventRepository {
    log(event: Event): Promise<void>
}
