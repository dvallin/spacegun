export function extractImageName(url: string): string {
    const endOfHost = url.lastIndexOf('/')
    const imageWithoutHost = url.substring(endOfHost + 1, url.length)
    const imageWithoutHash = imageWithoutHost.split('@')[0]
    const imageAndTag = imageWithoutHash.split(':')
    return imageAndTag[0]
}
