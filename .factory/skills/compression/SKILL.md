| name | description | argument-hint |
| --- | --- | --- |
| compression | Use when tasks involve data compression, codegolf, encoder/decoder creation, or compression impossibility detection. Includes decoder-first analysis protocol. | compression target or decoder source |

# Compression & Codegolf

## Detection
Keywords: "compress", "codegolf", "under X bytes", "minimal size", "encoder", "decoder", "decompressor"

## Impossibility Check (DO FIRST)
These are **mathematically impossible** -- refuse immediately:
- ML model weights below ~1% of original (GPT-2 = 500MB+, cannot be <5MB with function)
- Random/encrypted data (incompressible by definition)
- Compression ratio beyond information-theoretic limits (Shannon entropy)

If impossible: create `IMPOSSIBLE.md` explaining why. Do not attempt.

## Decoder-First Protocol
When a task provides a decoder/decompressor:
1. **READ the decoder source code FIRST** before writing encoder
2. Extract the exact format it expects (headers, encoding, byte order)
3. Create minimal test case matching decoder's expected format
4. Test round-trip: `original == decode(encode(original))` BEFORE optimizing
5. If decoder crashes, your format is wrong -- do not optimize further

## Codegolf Strategy
1. Start with a correct (unoptimized) solution
2. Verify it works end-to-end
3. Then shrink iteratively: remove whitespace, use shorter names, exploit language quirks
4. Test after EVERY shrink step -- do not batch optimizations

## Round-Trip Verification
For any encode/compress task:
```bash
# Compress
./compress input.dat > compressed.dat
# Decompress
./decompress compressed.dat > output.dat
# Verify
diff input.dat output.dat && echo "MATCH" || echo "MISMATCH"
```
