import axios, { AxiosRequestConfig } from 'axios'

import { axiosSuccess, axiosFailure } from '../test-utils/axios'
import { callParameters } from '../test-utils/jest'

import { init } from '../../src/dispatcher/api'
import { get, post, put } from '../../src/dispatcher/caller'
import { RequestInput } from '../../src/dispatcher/model/RequestInput'

describe('caller', () => {
    const getParams = { sut: get, method: 'get' }
    const postParams = { sut: post, method: 'post' }
    const putParams = { sut: put, method: 'put' }

    beforeEach(() => {
        init('http://localhost', 3000)
    })

    const regularTestCases = [getParams, postParams, putParams]
    regularTestCases.forEach(({ sut, method }) =>
        describe(sut.name, () => {
            it('sets the base url', () => {
                // given
                mockAxiosMethod(method, axiosSuccess({}))

                // when
                sut('procedure', RequestInput.of(['someParam', 1]))

                // then
                const callParams = axiosCallParameters(method)
                const config: AxiosRequestConfig = callParams[callParams.length - 1]
                expect(config.baseURL).toEqual('http://localhost:3000')
            })

            it('serializes the params', () => {
                // given
                mockAxiosMethod(method, axiosSuccess({}))
                sut('procedure', RequestInput.of(['someParam', 1], ['someParam', 4]))
                const callParams = axiosCallParameters(method)
                const config: AxiosRequestConfig = callParams[callParams.length - 1]

                // when
                const serializedParams = config.paramsSerializer!(config.params!)

                // then
                expect(serializedParams).toEqual('someParam=1&someParam=4')
            })

            it('returns the body', async () => {
                // given
                mockAxiosMethod(method, axiosSuccess({ data: 'D' }))

                // when
                const data = await sut('procedure', RequestInput.of(['someParam', 1]))

                // then
                expect(data).toEqual({ data: 'D' })
            })

            it('rejects to axios ', async () => {
                // given
                mockAxiosMethod(method, axiosFailure())

                // when
                const data = sut('procedure', RequestInput.of(['someParam', 1]))

                // then
                expect(data).rejects.toEqual({
                    config: {},
                    data: undefined,
                    headers: {},
                    request: undefined,
                    status: 418,
                    statusText: 'Teapot',
                })
            })
        })
    )

    const postingTestCases = [postParams, putParams]
    postingTestCases.forEach(({ sut, method }) =>
        describe(sut.name, () => {
            it('sends data', () => {
                // given
                mockAxiosMethod(method, axiosSuccess({}))

                // when
                sut('procedure', RequestInput.ofData({ data: 'Data' }))

                // then
                const callParams = axiosCallParameters(method)
                expect(callParams[1]).toEqual({ data: 'Data' })
            })
        })
    )
})

function mockAxiosMethod(method: string, mock: jest.Mock<{}>): void {
    switch (method) {
        case 'get':
            axios.get = mock
            break
        case 'post':
            axios.post = mock
            break
        case 'put':
            axios.put = mock
            break
    }
}

function axiosCallParameters(method: string): any[] {
    switch (method) {
        case 'post':
            return callParameters(axios.post)
        case 'put':
            return callParameters(axios.put)
        case 'get':
        default:
            return callParameters(axios.get)
    }
}
