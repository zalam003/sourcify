import { arrayify, hexlify } from '@ethersproject/bytes';
import bs58 from 'bs58';
import * as CBOR from 'cbor-x';

type CBOR = {
  bytes: string;
  length: number;
};

// eslint-disable-next-line functional/no-mixed-type
type DecodedObject = {
  raw: {
    ipfs?: string;
    bzzr0?: string;
    bzzr1?: string;
    solc?: string;
    [key: string]: string | Uint8Array | undefined | boolean;
  };
  decoded: {
    ipfs?: string;
    bzzr0?: string;
    bzzr1?: string;
    solc?: string;
    [key: string]: string | Uint8Array | undefined | boolean;
  };
  metadataOrigin?: 'ipfs' | 'bzzr0' | 'bzzr1';
};

/**
 * Decode contract's bytecode
 * @param bytecode - hex of the bytecode with 0x prefix
 * @returns Object describing the contract
 */
export const decode = (bytecode: string): DecodedObject => {
  if (bytecode.length === 0) {
    throw Error('Bytecode cannot be null');
  }
  if (bytecode.substring(0, 2) !== '0x') {
    bytecode = '0x' + bytecode;
  }

  // split auxdata
  const [, auxdata] = splitAuxdata(bytecode);

  if (!auxdata) {
    throw Error('Auxdata is not in the execution bytecode');
  }

  // cbor decode the object and get a json
  const cborDecodedObject = CBOR.decode(arrayify(`0x${auxdata}`));

  const result: DecodedObject = {
    raw: {},
    decoded: {},
  };

  // Decode all the parameters from the json
  Object.keys(cborDecodedObject)
    .filter((key) => key != 'cbor')
    .forEach((key: string) => {
      switch (key) {
        case 'ipfs': {
          result.raw.ipfs = hexlify(cborDecodedObject.ipfs);
          const ipfsCID = bs58.encode(cborDecodedObject.ipfs);
          result.decoded.ipfs = ipfsCID;
          result.metadataOrigin = 'ipfs';
          break;
        }
        case 'solc': {
          result.raw.solc = hexlify(cborDecodedObject.solc);
          // nightly builds are string encoded
          if (typeof cborDecodedObject.solc === 'string') {
            result.decoded.solc = cborDecodedObject.solc;
          } else {
            result.decoded.solc = cborDecodedObject.solc.join('.');
          }
          break;
        }
        case 'experimental': {
          result.raw.experimental = cborDecodedObject.experimental;
          result.decoded.experimental = cborDecodedObject.experimental;
          break;
        }
        case 'bzzr0':
        case 'bzzr1': {
          result.metadataOrigin = key;
          result.raw[key] = hexlify(cborDecodedObject[key]);
          result.decoded[key] = hexlify(cborDecodedObject[key]);
          break;
        }
        default: {
          result.raw[key] = hexlify(cborDecodedObject[key]);
          result.decoded[key] = hexlify(cborDecodedObject[key]);
          break;
        }
      }
    });

  return result;
};

/**
 * Splits bytecode into execution bytecode and auxdata
 * If the bytecode has no CBOR encoded part, returns the whole bytecode
 * @param bytecode - hex of the bytecode with 0x prefix
 * @returns string[] - [ executionBytecode, auxdata?, cborBytesLength?] all as hexStrings
 */
export const splitAuxdata = (bytecode: string): string[] => {
  if (bytecode.length === 0) {
    throw Error('Bytecode cannot be null');
  }
  if (bytecode.substring(0, 2) !== '0x') {
    bytecode = '0x' + bytecode;
  }

  const bytesLength = 4;

  // Take latest 2 bytes of the bytecode (length of the cbor object)
  const cborLenghtHex = `${bytecode.slice(-bytesLength)}`;
  const cborLength = parseInt(cborLenghtHex, 16);
  const cborBytesLength = cborLength * 2;

  // If the length of the cbor is more or equal to the length of the execution bytecode, it means there is no cbor
  if (bytecode.length - bytesLength - cborBytesLength <= 0) {
    return [bytecode];
  }
  // Extract the cbor object using the extracted lenght
  const auxdata = bytecode.substring(
    bytecode.length - bytesLength - cborBytesLength,
    bytecode.length - bytesLength
  );

  // Extract exection bytecode
  const executionBytecode = bytecode.substring(
    0,
    bytecode.length - bytesLength - cborBytesLength
  );

  try {
    // return the complete array only if the auxdata is actually cbor encoded
    CBOR.decode(arrayify(`0x${auxdata}`));
    return [executionBytecode, auxdata, cborLenghtHex];
  } catch (e) {
    return [bytecode];
  }
};
