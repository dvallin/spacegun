import { SlackEventRepository } from "../../../src/events/slack/SlackEventRepository"
import { Event } from "../../../src/events/model/Event"
import { EventField } from "../../../src/events/model/EventField"
import axios from "axios"

import { axiosSuccess } from "../../test-utils/axios"


describe("SlackEventRepository", () => {

    let repo
    beforeEach(() => {
        repo = SlackEventRepository.fromConfig("http://slack")
    })

    describe("log", () => {

        beforeEach(() => {
            axios.post = axiosSuccess()
        })

        it("does not send events of other topics", async () => {
            await repo.log(createEvent([]))
            await repo.log(createEvent(["some", "other", "topics"]))
            expect(axios.post).not.toHaveBeenCalled()
        })

        it("sends events of slack topics", async () => {
            await repo.log(createEvent(["slack"]))
            await repo.log(createEvent(["some", "other", "slack"]))
            expect(axios.post).toHaveBeenCalledTimes(2)
        })

        it("serializes to slack formatted json", async () => {
            await repo.log(createEvent(["some", "other", "slack"], [{ title: "titleText", value: "valueText" }]))
            expect(axios.post).toHaveBeenCalledWith(
                "http://slack",
                {
                    attachments: [{
                        color: "#36a64f",
                        fallback: "Spacegun says: messageText descriptionText",
                        fields: [{ title: "titleText", value: "valueText" }],
                        footer: "Spacegun",
                        footer_icon: "https://platform.slack-edge.com/img/default_application_icon.png",
                        text: "descriptionText",
                        title: "messageText",
                        ts: 1520899200000
                    }]
                },
                { timeout: 20000 }
            )
        })
    })
})

function createEvent(topics: string[], fields: EventField[] = []): Event {
    return {
        message: "messageText",
        timestamp: Date.now(),
        topics,
        description: "descriptionText",
        fields
    }
}
