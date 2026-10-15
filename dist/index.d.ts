export interface TfsSelectedLeg {
    origin: string;
    destination: string;
    date: string;
    carrier: string;
    flightNumber: string;
}
export interface TfsFlightSegment {
    date: string;
    origin: string;
    destination: string;
    maxStops: number | null;
    airlines: string[];
    selected?: TfsSelectedLeg[];
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
/**
 * Decodes the Google Flights ?tfs= URL parameter
 * @param tfsString - The tfs parameter value from the URL
 * @returns Decoded flight data or null if decoding fails
 */
export declare function decodeTfs(tfsString: string): TfsData | null;
//# sourceMappingURL=index.d.ts.map