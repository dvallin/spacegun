import { ClusterProbe } from "../../../src/jobs/steps/ClusterProbe"

import axios from "axios"
import { axiosResponse } from "../../test-utils/axios"

describe(ClusterProbe.name, () => {

    it("resolves to input cluster probe returns status 200", async () => {
        // given
        axios.get = axiosResponse(200)

        // when
        const result = await new ClusterProbe().apply({ input: "" }, "hookurl")

        // then
        expect(result).toEqual({ input: "" })
    })

    it("rejects if cluster probe return status not 200", async () => {
        axios.get = axiosResponse(201)
        await expect(new ClusterProbe().apply({ input: "" }, "hookurl")).rejects.toThrowErrorMatchingSnapshot()
    })

    it("rejects if cluster probe rejects", async () => {
        axios.get = jest.fn().mockReturnValue(Promise.reject("timeout"))
        await expect(new ClusterProbe().apply({ input: "" }, "hookurl")).rejects.toEqual("timeout")
    })

    it("calls axios with optional timeout", async () => {
        axios.get = axiosResponse(200)
        await new ClusterProbe().apply({ input: "" }, "hookurl", 1234)
        expect(axios.get).toHaveBeenCalledWith("hookurl", { timeout: 1234 })
    })
})
