
import { unzipSync } from 'fflate';

export interface TavernCardV2 {
  spec: 'chara_card_v2' | 'chara_card_v3';
  spec_version: string;
  data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    tags: string[];
    creator: string;
    character_version: string;
    alternate_greetings: string[];
    extensions: Record<string, any>;
    character_book?: {
      entries: Array<{
        keys: string[];
        content: string;
        extensions: Record<string, any>;
        enabled: boolean;
        insertion_order: number;
        case_sensitive?: boolean;
        name?: string;
        priority?: number;
        id?: number;
        comment?: string;
        selective?: boolean;
        secondary_keys?: string[];
        constant?: boolean;
        position?: string;
      }>;
    };
  };
}

export function b64_decode_unicode(str: string): string {
  return decodeURIComponent(Array.prototype.map.call(atob(str), function(c: string) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

function strToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

function indexOfSequence(haystack: Uint8Array, needle: Uint8Array): number {
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

function lastIndexOfSequence(haystack: Uint8Array, needle: Uint8Array): number {
  for (let i = haystack.length - needle.length; i >= 0; i--) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

export function load_tavern_wi(obj: any): any[] {
  console.log("Append Tavern WI");
  const loadedwi: any[] = [];
  if (!obj || !obj.entries) return loadedwi;

  for (const key in obj.entries) {
    const itm = obj.entries[key];
    let karr = itm.key;
    if (!karr) {
      karr = itm.keys;
    }
    let ksarr = itm.keysecondary;
    if (!ksarr) {
      ksarr = itm.secondary_keys;
    }
    const nwi = {
      "key": Array.isArray(karr) ? karr.join(",") : karr,
      "keysecondary": ((ksarr && ksarr.length) > 0 ? (Array.isArray(ksarr) ? ksarr.join(",") : ksarr) : ""),
      "keyanti": "",
      "content": itm.content,
      "comment": itm.comment,
      "folder": null,
      "selective": itm.selective,
      "constant": itm.constant,
      "probability": 100,
      "wigroup": "",
      "widisabled": false
    };
    loadedwi.push(nwi);
  }
  return loadedwi;
}

export function readTavernPngFromBlob(blob: Blob): Promise<TavernCardV2 | null> {

  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
      if (!event.target?.result) {
        resolve(null);
        return;
      }
      const data = event.target.result as ArrayBuffer;
      const arr = new Uint8Array(data);
      let result = convertTavernPng(arr);
      if (!result) {
        // attempt to read as WEBP
        result = getTavernExifJSON(arr);
      }
      resolve(result);
    };
    fileReader.onerror = (e) => reject(e);
    fileReader.readAsArrayBuffer(blob);
  });
}

function convertTavernPng(data: Uint8Array): TavernCardV2 | null {
  // accepts png input data, and returns the extracted JSON
  console.log("Attempting PNG import...");
  
  // Attempt RISU import first
  const charCardFinderSig = strToBytes("chara_card_v");
  const charcardpos = indexOfSequence(data, charCardFinderSig);
  if (charcardpos !== -1) {
    console.log("Attempting RISU import...");
    const zipStartSig = strToBytes("PK\x03\x04");
    const zipEndSig = strToBytes("PK\x05\x06");
    const start = indexOfSequence(data, zipStartSig);
    const end = lastIndexOfSequence(data, zipEndSig);

    if (start !== -1 && end !== -1 && end > start && charcardpos > start && charcardpos < end) {
      try {
        const zipData = data.slice(start, end + 22); // Add 22 bytes for EOCD record
        const unzipped = unzipSync(zipData);
        const cardJsonFile = Object.keys(unzipped).find(name => name === "card.json");
        
        if (cardJsonFile) {
          const plainfile = unzipped[cardJsonFile];
          const decoder = new TextDecoder('utf-8');
          const readtxt = decoder.decode(plainfile);
          const decoded = JSON.parse(readtxt);
          console.log(decoded);
          return decoded;
        }
        console.log("RISU card missing card.json.");
      } catch (e) {
        console.log("Error decoding RISU card: " + e);
      }
    } else {
      console.log("Not a valid RISU card.");
    }
  }

  const uint8 = new Uint8Array(4);
  const int32 = new Int32Array(uint8.buffer);
  const uint32 = new Uint32Array(uint8.buffer);

  // check if png header is valid
  if (!data || data[0] !== 0x89 || data[1] !== 0x50 || data[2] !== 0x4E || data[3] !== 0x47 || data[4] !== 0x0D || data[5] !== 0x0A || data[6] !== 0x1A || data[7] !== 0x0A) {
    console.log("PNG header invalid");
    return null;
  }

  let ended = false;
  const chunks: { name: string; data: Uint8Array }[] = [];
  let idx = 8;

  while (idx < data.length) {
    // Read the length of the current chunk
    uint8[3] = data[idx++];
    uint8[2] = data[idx++];
    uint8[1] = data[idx++];
    uint8[0] = data[idx++];

    // Chunk includes name/type for CRC check
    const length = uint32[0] + 4;
    const chunk = new Uint8Array(length);
    chunk[0] = data[idx++];
    chunk[1] = data[idx++];
    chunk[2] = data[idx++];
    chunk[3] = data[idx++];

    // Get the name in ASCII for identification
    const name = (
      String.fromCharCode(chunk[0]) +
      String.fromCharCode(chunk[1]) +
      String.fromCharCode(chunk[2]) +
      String.fromCharCode(chunk[3])
    );

    // The IHDR header MUST come first
    if (!chunks.length && name !== 'IHDR') {
      console.log('Warning: IHDR header missing');
    }

    // The IEND header marks the end of the file
    if (name === 'IEND') {
      ended = true;
      chunks.push({
        name: name,
        data: new Uint8Array(0)
      });
      break;
    }

    // Read the contents of the chunk out of the main buffer
    for (let i = 4; i < length; i++) {
      chunk[i] = data[idx++];
    }

    // Read out the CRC value for comparison (skipping validation for now)
    idx += 4;

    // The chunk data is now copied to remove the 4 preceding bytes used for the chunk name/type
    const chunkData = new Uint8Array(chunk.buffer.slice(4));

    chunks.push({
      name: name,
      data: chunkData
    });
  }

  if (!ended) {
    console.log('.png file ended prematurely: no IEND header was found');
  }

  // find the chunk with the 'chara' name
  let found = chunks.filter(x => (
    x.name === "tEXt" &&
    x.data.length > 6 &&
    String.fromCharCode(x.data[0]) === 'c' &&
    String.fromCharCode(x.data[4]) === 'a'
  ));

  if (!found || found.length === 0) {
    const found2 = chunks.filter(x => (
      x.name === "tEXt" &&
      x.data.length > 6 &&
      String.fromCharCode(x.data[0]) === 'c' &&
      String.fromCharCode(x.data[1]) === 'c' &&
      String.fromCharCode(x.data[2]) === 'v' &&
      String.fromCharCode(x.data[3]) === '3'
    )); // its a stupid new v3 card

    if (found2 && found2.length > 0) {
      try {
        let b64buf = "";
        const bytes = found2[0].data; // skip the chara
        for (let i = 5; i < bytes.length; i++) {
          b64buf += String.fromCharCode(bytes[i]);
        }
        const decoded = JSON.parse(b64_decode_unicode(b64buf));
        console.log(decoded);
        return decoded;
      } catch (e) {
        console.log("Error decoding b64 in image: " + e);
        return null;
      }
    }
  }

  // remove ext asset
  found = found.filter(x => (
    x.data.length > 12 &&
    !(String.fromCharCode(x.data[6]) === 'e' &&
      String.fromCharCode(x.data[7]) === 'x' &&
      String.fromCharCode(x.data[8]) === 't' &&
      String.fromCharCode(x.data[9]) === '-')
  ));

  if (found.length === 0) {
    console.log('PNG Image contains no story data');
    return null;
  } else {
    try {
      let b64buf = "";
      const bytes = found[0].data; // skip the chara
      for (let i = 6; i < bytes.length; i++) {
        b64buf += String.fromCharCode(bytes[i]);
      }
      const decoded = JSON.parse(b64_decode_unicode(b64buf));
      console.log(decoded);
      return decoded;
    } catch (e) {
      console.log("Error decoding b64 in image: " + e);
      return null;
    }
  }
}

function getTavernExifJSON(data: Uint8Array): TavernCardV2 | null {
  // a hacky exif reader for new tavernai format
  console.log("Attempting WEBP import...");

  // check if webp header is valid
  if (!data || data[0] !== 0x52 || data[1] !== 0x49 || data[2] !== 0x46 || data[3] !== 0x46 || data[8] !== 0x57 || data[9] !== 0x45 || data[10] !== 0x42 || data[11] !== 0x50) {
    console.log("WEBP header invalid");
    return null;
  }

  // scan for the EXIF....Exif tag
  let offset = 0;
  const datlen = data.length;
  while (offset < datlen - 12) {
    ++offset;
    if (data[offset] === 0x45 && data[offset + 1] === 0x58 && data[offset + 2] === 0x49 && data[offset + 3] === 0x46 &&
      data[offset + 8] === 0x45 && data[offset + 9] === 0x78 && data[offset + 10] === 0x69 && data[offset + 11] === 0x66) {
      offset += 12;

      // look for UserSummary tag. Also helps determine endianness
      let bigendian = false;
      let foundsize = false;
      let datasize = 0;

      while (offset < datlen - 12) {
        ++offset;
        if (!foundsize) {
          if (data[offset] === 0x86 && data[offset + 1] === 0x92) {
            foundsize = true;
            bigendian = false;
            datasize = data[offset + 4] + 256 * data[offset + 5] + 65536 * data[offset + 6] + 16777216 * data[offset + 7];
            datasize -= 8;
          } else if (data[offset] === 0x92 && data[offset + 1] === 0x86) {
            foundsize = true;
            bigendian = true;
            datasize = data[offset + 7] + 256 * data[offset + 6] + 65536 * data[offset + 5] + 16777216 * data[offset + 4];
            datasize -= 8;
          }
        }

        if (foundsize && data[offset] === 0x41 && data[offset + 1] === 0x53 && data[offset + 2] === 0x43 && data[offset + 3] === 0x49 &&
          data[offset + 4] === 0x49 && data[offset + 5] === 0x00 && data[offset + 6] === 0x00 && data[offset + 7] === 0x00) {
          // found. start reading json
          let idx = offset + 8;
          const endidx = idx + datasize;
          let readtxt = "";
          while (idx < endidx && idx < datlen) {
            readtxt += String.fromCharCode(data[idx]);
            ++idx;
          }
          try {
            const decoded = JSON.parse(readtxt);
            console.log(decoded);
            return decoded;
          } catch (e) {
            console.log("Error decoding webp txt: " + e);
            return null;
          }
        }
      }
    }
  }
  return null;
}
