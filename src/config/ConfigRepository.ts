export interface ConfigRepository {
    hasNewConfig(): Promise<boolean>
    fetchNewConfig(): Promise<void>
}
