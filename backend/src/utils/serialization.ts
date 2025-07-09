
/**
 * Utility functions to handle BigInt serialization
 */

export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

export function jsonStringifyWithBigInt(obj: any): string {
  return JSON.stringify(obj, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
}

// Setup global BigInt serialization for JSON.stringify
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Add toJSON method to BigInt prototype
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};