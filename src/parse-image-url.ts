export function parseImageUrl(url: string): { host: string; tag: string | undefined; name: string | undefined; hash: string | undefined } {
    const endOfHost = url.lastIndexOf('/')
    const imageWithoutHost = url.substring(endOfHost + 1, url.length)
    const imageAndHash = imageWithoutHost.split('@')
    const imageAndTag = imageAndHash[0].split(':')
    return { name: imageAndTag[0], tag: imageAndTag[1], hash: imageAndHash[1], host: url.substring(0, endOfHost) }
}
