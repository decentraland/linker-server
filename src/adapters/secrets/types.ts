export interface ISecretsComponent {
  /**
   * Gets a secret value from AWS Secrets Manager
   * Results are cached for 1 hour per secretId
   *
   * @param secretId - The AWS Secrets Manager secret ID to retrieve
   * @returns The secret string value
   */
  getSecret: (secretId: string) => Promise<string>
}
