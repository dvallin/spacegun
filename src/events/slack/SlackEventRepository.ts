import axios, { AxiosRequestConfig } from "axios"

import { EventRepository } from "@/events/EventRepository"
import { Event } from "@/events/model/Event"
import { EventField } from "@/events/model/EventField";

const axiosConfig: AxiosRequestConfig = { timeout: 20000 }

export class SlackEventRepository implements EventRepository {

    public static fromConfig(slack?: string): SlackEventRepository | undefined {
        if (slack) {
            return new SlackEventRepository(slack)
        }
        return undefined
    }

    public constructor(
        private readonly slack: string
    ) { }

    public async log(event: Event): Promise<void> {
        if (event.topics.find(v => v === "slack") !== undefined) {
            const slackMessage = this.serializeEvent(event)
            await axios.post(
                this.slack,
                slackMessage,
                axiosConfig
            )
        }
    }

    private serializeEvent(event: Event): object {
        const fields = this.serializeFields(event.fields)

        return {
            attachments: [
                {
                    fallback: `Spacegun says: ${event.message} ${event.description}`,
                    color: "#36a64f",
                    title: event.message,
                    text: event.description,
                    fields,
                    footer: "Spacegun",
                    footer_icon: "https://platform.slack-edge.com/img/default_application_icon.png",
                    ts: Math.floor(Date.now() / 1000)
                }
            ]
        }
    }

    private serializeFields(fields: EventField[]): object[] {
        return fields.map(field => ({ title: field.title, value: field.value }))
    }
}
