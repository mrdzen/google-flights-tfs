// === Types ===

export interface TfsFlightSegment {
  date: string;
  origin: string;
  destination: string;
  maxStops: number | null;
  airlines: string[];
}

export type TfsSeatClass = 'economy' | 'premium-economy' | 'business' | 'first' | 'unknown';
export type TfsTripType = 'round-trip' | 'one-way' | 'multi-city' | 'unknown';

export interface TfsPassengers {
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
}

export interface TfsData {
  flights: TfsFlightSegment[];
  seat: TfsSeatClass;
  passengers: TfsPassengers;
  trip: TfsTripType;
}

// === ByteReader class for binary data parsing ===

class ByteReader {
  private data: Uint8Array;
  private pos: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  hasMore(): boolean {
    return this.pos < this.data.length;
  }

  readByte(): number {
    if (this.pos >= this.data.length) {
      throw new Error('Unexpected end of data');
    }
    return this.data[this.pos++];
  }

  readVarInt(): number {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = this.readByte();
      result |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);

    return result;
  }

  readBytes(length: number): Uint8Array {
    if (this.pos + length > this.data.length) {
      throw new Error('Unexpected end of data');
    }
    const result = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return result;
  }

  readString(length: number): string {
    const bytes = this.readBytes(length);
    return new TextDecoder().decode(bytes);
  }

  skip(length: number): void {
    this.pos += length;
  }

  getPosition(): number {
    return this.pos;
  }
}

// === Mapping functions ===

function mapSeatClass(value: number): TfsSeatClass {
  switch (value) {
    case 1: return 'economy';
    case 2: return 'premium-economy';
    case 3: return 'business';
    case 4: return 'first';
    default: return 'unknown';
  }
}

function mapTripType(flightCount: number): TfsTripType {
  switch (flightCount) {
    case 1: return 'one-way';
    case 2: return 'round-trip';
    default: return flightCount > 2 ? 'multi-city' : 'unknown';
  }
}

function countPassengers(passengerTypes: number[]): TfsPassengers {
  const counts: TfsPassengers = {
    adults: 0,
    children: 0,
    infantsInSeat: 0,
    infantsOnLap: 0
  };

  for (const type of passengerTypes) {
    switch (type) {
      case 1: counts.adults++; break;
      case 2: counts.children++; break;
      case 3: counts.infantsInSeat++; break;
      case 4: counts.infantsOnLap++; break;
    }
  }

  // Default to 1 adult if no passengers specified
  if (counts.adults === 0 && counts.children === 0 &&
      counts.infantsInSeat === 0 && counts.infantsOnLap === 0) {
    counts.adults = 1;
  }

  return counts;
}

// === Parsing functions ===

function skipField(reader: ByteReader, wireType: number): void {
  switch (wireType) {
    case 0: // Varint
      reader.readVarInt();
      break;
    case 1: // 64-bit
      reader.skip(8);
      break;
    case 2: // Length-delimited
      const len = reader.readVarInt();
      reader.skip(len);
      break;
    case 5: // 32-bit
      reader.skip(4);
      break;
    default:
      throw new Error(`Unknown wire type: ${wireType}`);
  }
}

// Extract location ID from nested message (field 2 contains the ID string like "/m/081m_")
function parseLocationId(data: Uint8Array): string {
  const reader = new ByteReader(data);

  while (reader.hasMore()) {
    const tag = reader.readVarInt();
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;

    if (fieldNum === 2 && wireType === 2) {
      const len = reader.readVarInt();
      return reader.readString(len);
    } else {
      skipField(reader, wireType);
    }
  }

  return '';
}

function parseFlightSegment(data: Uint8Array): TfsFlightSegment {
  const reader = new ByteReader(data);
  const segment: TfsFlightSegment = {
    date: '',
    origin: '',
    destination: '',
    maxStops: null,
    airlines: []
  };

  while (reader.hasMore()) {
    const tag = reader.readVarInt();
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;

    if (fieldNum === 2 && wireType === 2) {
      // Date field
      const len = reader.readVarInt();
      segment.date = reader.readString(len);
    } else if (fieldNum === 13 && wireType === 2) {
      // Origin location (field 13)
      const len = reader.readVarInt();
      const nestedData = reader.readBytes(len);
      segment.origin = parseLocationId(nestedData);
    } else if (fieldNum === 14 && wireType === 2) {
      // Destination location (field 14)
      const len = reader.readVarInt();
      const nestedData = reader.readBytes(len);
      segment.destination = parseLocationId(nestedData);
    } else if (fieldNum === 9 && wireType === 0) {
      // Max stops
      segment.maxStops = reader.readVarInt();
    } else if (fieldNum === 12 && wireType === 2) {
      // Airlines
      const len = reader.readVarInt();
      const airlineData = reader.readBytes(len);
      const airlineCode = parseLocationId(airlineData);
      if (airlineCode) {
        segment.airlines.push(airlineCode);
      }
    } else {
      skipField(reader, wireType);
    }
  }

  return segment;
}

// === Main decoder function ===

/**
 * Decodes the Google Flights ?tfs= URL parameter
 * @param tfsString - The tfs parameter value from the URL
 * @returns Decoded flight data or null if decoding fails
 */
export function decodeTfs(tfsString: string): TfsData | null {
  if (!tfsString) {
    return null;
  }

  try {
    // URL decode first
    const decoded = decodeURIComponent(tfsString);

    // Convert URL-safe Base64 to standard Base64
    let standardBase64 = decoded.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    const pad = standardBase64.length % 4;
    if (pad) {
      standardBase64 += '='.repeat(4 - pad);
    }

    // Base64 decode
    const binaryString = atob(standardBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const reader = new ByteReader(bytes);
    const flights: TfsFlightSegment[] = [];
    const passengers: number[] = [];
    let seatClass = 1;

    while (reader.hasMore()) {
      const tag = reader.readVarInt();
      const fieldNum = tag >> 3;
      const wireType = tag & 0x07;

      if (fieldNum === 3 && wireType === 2) {
        // Flight segment data
        const len = reader.readVarInt();
        const flightData = reader.readBytes(len);
        flights.push(parseFlightSegment(flightData));
      } else if (fieldNum === 8 && wireType === 0) {
        // Passengers (repeated varint at top level)
        passengers.push(reader.readVarInt());
      } else if (fieldNum === 9 && wireType === 0) {
        // Seat class
        seatClass = reader.readVarInt();
      } else {
        skipField(reader, wireType);
      }
    }

    return {
      flights,
      seat: mapSeatClass(seatClass),
      passengers: countPassengers(passengers),
      trip: mapTripType(flights.length)
    };
  } catch {
    return null;
  }
}
