import type {
  Inspection,
  Configuration,
  Generation,
  SavedSheetOrder,
} from "../types";
export function inspectWorkbook(bytes: Uint8Array): Promise<Inspection>;
export function generateWorkbook(
  order: SavedSheetOrder,
  template: { bytes: string; configuration: Configuration } | null,
  absence?: string,
): Promise<Generation>;
