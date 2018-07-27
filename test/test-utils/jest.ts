export function callParameters(o: any, call: number = 0): any[] {
    const mock = o as jest.Mock<{}>
    return mock.mock.calls[call]
}
