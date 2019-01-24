import axios, { AxiosRequestConfig } from 'axios'

import { EventRepository } from '../EventRepository'
import { Event } from '../model/Event'
import { EventField } from '../model/EventField'

const axiosConfig: AxiosRequestConfig = { timeout: 20000 }

export class SlackEventRepository implements EventRepository {
    public static fromConfig(slack?: string, slackIcon?: string): SlackEventRepository | undefined {
        if (slack) {
            return new SlackEventRepository(slack, slackIcon)
        }
        return undefined
    }

    public constructor(private readonly slack: string, private readonly slackIcon?: string) {}

    public async log(event: Event): Promise<void> {
        if (event.topics.find(v => v === 'slack') !== undefined) {
            const slackMessage = this.serializeEvent(event)
            await axios.post(this.slack, slackMessage, axiosConfig)
        }
    }

    private serializeEvent(event: Event): object {
        const fields = this.serializeFields(event.fields)

        let icon_emoji = this.slackIcon
        if (icon_emoji === undefined) {
            const emojis = [
                ':space_invader:',
                ':milky_way:',
                ':rocket:',
                ':satellite:',
                ':comet:',
                ':alien:',
                ':robot_face:',
                ':gun:',
                ':beer:',
            ]
            icon_emoji = emojis[Math.floor(Math.random() * emojis.length)]
        }

        return {
            icon_emoji,
            attachments: [
                {
                    fallback: `Spacegun says: ${event.message} ${event.description}`,
                    color: '#36a64f',
                    title: event.message,
                    text: event.description,
                    fields,
                    footer: 'Spacegun',
                    footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
                    ts: Math.floor(Date.now() / 1000),
                },
            ],
        }
    }

    private serializeFields(fields: EventField[]): object[] {
        return fields.map(field => ({ title: field.title, value: field.value }))
    }
}
