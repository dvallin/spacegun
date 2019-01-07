import { Layers } from '../../src/dispatcher/model/Layers'
process.env.LAYER = Layers.Standalone

import { call } from '../../src/dispatcher'

import { init, log } from '../../src/events/EventModule'
import { EventRepository } from '../../src/events/EventRepository'
import { Event } from '../../src/events/model/Event'

const logMock = jest.fn()
const repo: EventRepository = {
    log: logMock,
}

init([repo])

describe('event module', () => {
    it('calls log', async () => {
        // given
        logMock.mockReturnValueOnce({})
        const event: Event = {
            message: 'testMessage',
            timestamp: Date.now(),
            topics: ['someTopic'],
            description: 'text',
            fields: [{ title: 'titleText', value: 'valueText' }],
        }

        // when
        await call(log)(event)

        // then
        expect(logMock).toHaveBeenCalledTimes(1)
        expect(logMock).toHaveBeenCalledWith(event)
    })
})
