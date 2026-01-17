# google-flights-tfs

Decoder for Google Flights `?tfs=` URL parameter. This parameter contains protobuf-encoded flight search data including flight segments, passengers, and seat class.

## Installation

```bash
npm install github:mrdzen/google-flights-tfs
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "google-flights-tfs": "github:mrdzen/google-flights-tfs"
  }
}
```

## Usage

```typescript
import { decodeTfs } from 'google-flights-tfs';

// Extract tfs parameter from Google Flights URL
const url = new URL('https://www.google.com/travel/flights?tfs=CjYKDDIwMjUtMDEtMjNS...');
const tfsParam = url.searchParams.get('tfs');

const result = decodeTfs(tfsParam);
if (result) {
  console.log(result);
  // {
  //   flights: [
  //     {
  //       date: '2025-01-23',
  //       origin: '/m/081m_',        // Warsaw
  //       destination: '/g/11f646ch27_yssj',  // Chisinau
  //       maxStops: null,
  //       airlines: []
  //     }
  //   ],
  //   seat: 'economy',
  //   passengers: { adults: 1, children: 0, infantsInSeat: 0, infantsOnLap: 0 },
  //   trip: 'one-way'
  // }
}
```

## API

### `decodeTfs(tfsString: string): TfsData | null`

Decodes the Google Flights `?tfs=` URL parameter.

**Parameters:**
- `tfsString` - The tfs parameter value from the URL (URL-safe base64 encoded protobuf)

**Returns:**
- `TfsData` object with decoded flight information, or `null` if decoding fails

### Types

```typescript
interface TfsFlightSegment {
  date: string;           // Flight date in YYYY-MM-DD format
  origin: string;         // Origin location ID (Knowledge Graph ID like /m/081m_)
  destination: string;    // Destination location ID
  maxStops: number | null; // Maximum number of stops, null if not specified
  airlines: string[];     // List of airline IDs
}

type TfsSeatClass = 'economy' | 'premium-economy' | 'business' | 'first' | 'unknown';
type TfsTripType = 'round-trip' | 'one-way' | 'multi-city' | 'unknown';

interface TfsPassengers {
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
}

interface TfsData {
  flights: TfsFlightSegment[];
  seat: TfsSeatClass;
  passengers: TfsPassengers;
  trip: TfsTripType;
}
```

## Location IDs

Google Flights uses Knowledge Graph IDs for locations. Common formats:
- `/m/081m_` - City/airport (e.g., Warsaw)
- `/g/11f646ch27_yssj` - Geographic location

To convert these IDs to airport codes or city names, you would need to use the Google Knowledge Graph API or maintain your own mapping.

## Seat Classes

| Value | Class |
|-------|-------|
| 1 | Economy |
| 2 | Premium Economy |
| 3 | Business |
| 4 | First |

## Passenger Types

| Value | Type |
|-------|------|
| 1 | Adult |
| 2 | Child |
| 3 | Infant in seat |
| 4 | Infant on lap |

## License

MIT
