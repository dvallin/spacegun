import axios, { AxiosRequestConfig } from "axios"

import { axiosSuccess, axiosFailure } from "../test-utils/axios"
import { callParameters } from "../test-utils/jest"

import { init } from "../../src/dispatcher/api"
import { get, post, put } from "../../src/dispatcher/caller"
import { RequestInput } from "../../src/dispatcher/model/RequestInput"

describe("caller", () => {

    const getParams = { sut: get, backend: "get" }
    const postParams = { sut: post, backend: "post" }
    const putParams = { sut: put, backend: "put" }

    beforeEach(() => {
        init("localhost", 3000)
    })

    const regularTestCases = [getParams, postParams, putParams]
    regularTestCases.forEach(({ sut, backend }) =>

        describe(sut.name, () => {

            it("sets the base url", () => {
                // given
                axios[backend] = axiosSuccess({})

                // when
                sut("procedure", RequestInput.of(["someParam", 1]))

                // then
                const callParams = callParameters(axios[backend])
                const config: AxiosRequestConfig = callParams[callParams.length - 1]
                expect(config.baseURL).toEqual("http://localhost:3000")
            })

            it("serializes the params", () => {
                // given
                axios[backend] = axiosSuccess({})
                sut("procedure", RequestInput.of(["someParam", 1], ["someParam", 4]))
                const callParams = callParameters(axios[backend])
                const config: AxiosRequestConfig = callParams[callParams.length - 1]

                // when
                const serializedParams = config.paramsSerializer(config.params)

                // then
                expect(serializedParams).toEqual("someParam=1&someParam=4")
            })

            it("returns the body", async () => {
                // given
                axios[backend] = axiosSuccess({ data: "D" })

                // when
                const data = await sut("procedure", RequestInput.of(["someParam", 1]))

                // then
                expect(data).toEqual({ data: "D" })
            })

            it("rejects to axios ", async () => {
                // given
                axios[backend] = axiosFailure()

                // when
                const data = sut("procedure", RequestInput.of(["someParam", 1]))

                // then
                expect(data).rejects.toEqual({
                    config: {},
                    data: undefined,
                    headers: {},
                    request: undefined,
                    status: 418,
                    statusText: "Teapot"
                })
            })
        })
    )

    const postingTestCases = [postParams, putParams]
    postingTestCases.forEach(({ sut, backend }) =>

        describe(sut.name, () => {

            it("sends data", () => {
                // given
                axios[backend] = axiosSuccess({})

                // when
                sut("procedure", RequestInput.ofData({ data: "Data" }))

                // then
                const callParams = callParameters(axios[backend])
                expect(callParams[1]).toEqual({ data: "Data" })
            })
        })
    )

})
