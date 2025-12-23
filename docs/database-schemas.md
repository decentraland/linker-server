# Database Schema Documentation

This service does not use a traditional database. Authorization data is stored externally and fetched periodically.

## External Data Sources

### Authorization Data

Authorization data is fetched from:
`https://decentraland.github.io/linker-server-authorizations/authorizations.json`

### Authorization Schema

```typescript
interface LinkerAuthorization {
  addresses: string[]      // Ethereum addresses (lowercased)
  plots: string[]          // Parcel coordinates (e.g., "0,0", "-10,5")
  startDate?: string       // ISO date string - authorization start
  endDate?: string         // ISO date string - authorization end
  onlyDev?: boolean        // If true, only valid in dev/staging environments
}
```

## In-Memory Data Structure

### AuthorizationsList

The fetched authorizations are converted to a lookup table for efficient access:

```typescript
type AuthorizationsList = {
  [address: string]: string[]  // address -> list of authorized parcels
}
```

### Business Rules

- **Address normalization**: All addresses are stored in lowercase
- **Plot validation**: Plots must be valid coordinates within -200 to 200 range
- **Time-based filtering**: Authorizations with startDate/endDate are filtered based on current time
- **Environment filtering**: `onlyDev` authorizations are excluded in production


