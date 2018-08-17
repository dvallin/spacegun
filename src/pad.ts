export function pad(text: string, columns: number = 12): string {
    const additionalColumns = 8 * columns - text.length
    if (additionalColumns > 0) {
        text += " ".repeat(additionalColumns)
    }
    return text
}
