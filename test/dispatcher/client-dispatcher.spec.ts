import axios, { AxiosRequestConfig } from 'axios'

import { axiosSuccess } from '../test-utils/axios'
import { callParameters } from '../test-utils/jest'

import { get } from '../../src/dispatcher'

process.env.LAYER = 'client'
import { moduleName, functions, globalFunction, localFunction } from './TestModule'

describe('client dispatcher', () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    it('calls standalone functions locally', () => {
        // when
        get(moduleName, functions.standalone)()

        // then
        expect(globalFunction).toHaveBeenCalledTimes(1)
    })

    it('calls local functions locally', () => {
        // when
        get(moduleName, functions.local)()

        // then
        expect(localFunction).toHaveBeenCalledTimes(1)
    })

    it('calls void remote functions via axios', () => {
        // given
        axios.get = axiosSuccess()

        // when
        get(moduleName, functions.remoteVoid)()

        // then
        expect(axios.get).toHaveBeenCalledTimes(1)
        expect(callParameters(axios.get)[0]).toEqual('clientModule/remoteVoid')
        const config: AxiosRequestConfig = callParameters(axios.get)[1]
        expect(config.params).toBeUndefined()
    })

    it('calls parameterized remote functions via axios', () => {
        // given
        axios.get = axiosSuccess()
        const params = { param: 'p' }

        // when
        get(moduleName, functions.remoteParams)({ params })

        // then
        expect(axios.get).toHaveBeenCalledTimes(1)
        expect(callParameters(axios.get)[0]).toEqual('clientModule/remoteParams')
        const config: AxiosRequestConfig = callParameters(axios.get)[1]
        expect(config.params).toEqual(params)
    })
})
