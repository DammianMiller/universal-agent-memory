| name | description | argument-hint |
| --- | --- | --- |
| chess-engine | Use when tasks involve chess analysis, best-move finding, FEN/PGN parsing, or checkmate puzzles. Chess tasks require external engines -- reasoning alone cannot find optimal moves. | FEN string or chess position description |

# Chess Engine Integration

## Detection
Keywords: "chess", "best move", "FEN", "PGN", "checkmate", "Stockfish"

## Protocol
1. Check for Stockfish: `which stockfish || apt-get install -y stockfish`
2. Parse board state to FEN format
3. Use Stockfish for analysis:
   ```bash
   echo -e "position fen <FEN>\ngo depth 20\nquit" | stockfish
   ```
4. Extract best move from engine output (`bestmove` line)

## Rules
- **NEVER** try to calculate chess moves through reasoning -- use the engine
- Use `python-chess` library for FEN validation and move legality checks
- For multi-move analysis, use `go depth 20` minimum
- Parse UCI output format: `bestmove e2e4 ponder d7d5`
