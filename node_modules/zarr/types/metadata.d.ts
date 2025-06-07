import { ZarrMetadataType, UserAttributes } from './types';
import { ValidStoreType } from './storage/types';
export declare function parseMetadata(s: ValidStoreType | ZarrMetadataType): ZarrMetadataType | UserAttributes;
