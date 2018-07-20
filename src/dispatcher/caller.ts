import axios, { AxiosRequestConfig, AxiosResponse } from "axios"
import { stringify } from "querystring"

import { RequestInput } from "@/dispatcher/model/RequestInput"

export async function get<T>(procedureName: string, input: RequestInput = {}): Promise<T> {
    let config = buildConfig(input)
    const response = await axios.get(procedureName, config) as AxiosResponse<T>
    return handleResponse(procedureName, response)
}

export async function post<T>(procedureName: string, input: RequestInput = {}): Promise<T> {
    let config = buildConfig(input)
    const response = await axios.post(procedureName, input.data, config) as AxiosResponse<T>
    return handleResponse(procedureName, response)
}

export async function put<T>(procedureName: string, input: RequestInput = {}): Promise<T> {
    let config = buildConfig(input)
    const response = await axios.put(procedureName, input.data, config) as AxiosResponse<T>
    return handleResponse(procedureName, response)
}

function buildConfig(input: RequestInput): AxiosRequestConfig {
    return {
        baseURL: `http://${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`,
        params: input.params,
        paramsSerializer: (params: any) => stringify(params)
    }
}

function handleResponse<T>(procedureName: string, response: AxiosResponse<T>): T {
    if (response.status < 200 || response.status > 200) {
        throw Error(`Received status code ${response.status} on endpoint ${procedureName}`)
    }
    return response.data
}
