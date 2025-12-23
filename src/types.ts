import type {
  IBaseComponent,
  IConfigComponent,
  IFetchComponent,
  IHttpServerComponent,
  ILoggerComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'
import type { FormDataContext } from '@well-known-components/multipart-wrapper'
import type { ICacheStorageComponent } from '@dcl/core-commons'
import type { IJobComponent } from '@dcl/job-component'
import type { ISecretsComponent } from './adapters/secrets'
import type { IAuthorizationsComponent } from './logic/authorizations'
import type { ILinkerComponent } from './logic/linker'
import type { metricDeclarations } from './metrics'

export interface GlobalContext {
  components: BaseComponents
}

// components used in every environment
export interface BaseComponents {
  config: IConfigComponent
  logs: ILoggerComponent
  server: IHttpServerComponent<GlobalContext>
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  fetcher: IFetchComponent
  cache: ICacheStorageComponent
  secrets: ISecretsComponent
  authorizations: IAuthorizationsComponent
  linker: ILinkerComponent
  authorizationsUpdaterJob: IJobComponent
}

// components used in runtime
export type AppComponents = BaseComponents & {
  statusChecks: IBaseComponent
}

// components used in tests
export type TestComponents = BaseComponents & {
  // A fetch component that only hits the test server
  localFetch: IFetchComponent
}

// this type simplifies the typings of http handlers
export type HandlerContextWithPath<
  ComponentNames extends keyof AppComponents,
  Path extends string = string
> = IHttpServerComponent.PathAwareContext<
  IHttpServerComponent.DefaultContext<{
    components: Pick<AppComponents, ComponentNames>
  }>,
  Path
>

// this type is for handlers that receive multipart form data
export type FormHandlerContextWithPath<
  ComponentNames extends keyof AppComponents,
  Path extends string = string
> = IHttpServerComponent.PathAwareContext<
  FormDataContext<{
    components: Pick<AppComponents, ComponentNames>
  }>,
  Path
>

export type Context<Path extends string = string> = IHttpServerComponent.PathAwareContext<GlobalContext, Path>
