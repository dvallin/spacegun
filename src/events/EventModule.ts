import { RequestInput } from '../dispatcher/model/RequestInput'
import { Request } from '../dispatcher/model/Request'
import { Component } from '../dispatcher/component'
import { Layers } from '../dispatcher/model/Layers'

import { Event } from './model/Event'
import { EventRepository } from './EventRepository'

let repos: EventRepository[] = []
export function init(repositories: (EventRepository | undefined)[]) {
    repos = repositories.filter(r => r !== undefined) as EventRepository[]
}

function paramToTopics(topics: string | string[] | undefined): string[] {
    if (topics === undefined) {
        return []
    }
    if (typeof topics === 'string') {
        return [topics]
    }
    return topics
}

export const log: Request<Event, void> = {
    module: 'events',
    procedure: 'log',
    input: (input: Event | undefined) =>
        RequestInput.ofData(
            { message: input!.message, description: input!.description, fields: input!.fields },
            ['timestamp', input!.timestamp],
            ['topics', input!.topics]
        ),
    mapper: (input: RequestInput) => ({
        message: input.data.message,
        timestamp: Number.parseInt(input.params!['timestamp'] as string),
        topics: paramToTopics(input.params!['topics']),
        description: input.data.description,
        fields: input.data.fields,
    }),
}

export class Module {
    @Component({
        moduleName: log.module,
        layer: Layers.Server,
        mapper: log.mapper,
    })
    async [log.procedure](event: Event): Promise<void> {
        for (const repo of repos) {
            await repo.log(event)
        }
    }
}
