import { AxiosResponse } from "axios"

function success<T>(data: T, headers: object = {}): AxiosResponse<T> {
    return {
        config: {},
        data,
        headers,
        request: undefined,
        status: 200,
        statusText: "Ok",
    }
}

function failure(): AxiosResponse<undefined> {
    return {
        config: {},
        data: undefined,
        headers: {},
        request: undefined,
        status: 418,
        statusText: "Teapot",
    }
}

export function axiosSuccess(...data: object[]): jest.Mock<{}> {
    let mock = jest.fn()
    data.forEach(d => mock.mockReturnValue(Promise.resolve(success(d))))
    return mock
}

export function axiosSuccessHeader(headers: object): jest.Mock<{}> {
    let mock = jest.fn()
    mock.mockReturnValue(Promise.resolve(success({}, headers)))
    return mock
}

export function axiosFailure(): jest.Mock<{}> {
    return jest.fn().mockReturnValue(Promise.reject(failure()))
}
