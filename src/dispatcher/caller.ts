import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { stringify } from 'querystring'

import { RequestInput } from './model/RequestInput'
import { serverHost, serverPort } from './api'

export async function get<T>(procedureName: string, input: RequestInput = {}): Promise<T | number> {
    let config = buildConfig(input)
    const response = (await axios.get(procedureName, config)) as AxiosResponse<T>
    return response.data
}

export async function post<T>(procedureName: string, input: RequestInput = {}): Promise<T> {
    let config = buildConfig(input)
    const response = (await axios.post(procedureName, input.data, config)) as AxiosResponse<T>
    return response.data
}

export async function put<T>(procedureName: string, input: RequestInput = {}): Promise<T> {
    let config = buildConfig(input)
    const response = (await axios.put(procedureName, input.data, config)) as AxiosResponse<T>
    return response.data
}

function buildConfig(input: RequestInput): AxiosRequestConfig {
    return {
        baseURL: `${serverHost}:${serverPort}/api/`,
        params: input.params,
        paramsSerializer: (params: any) => stringify(params),
    }
}
