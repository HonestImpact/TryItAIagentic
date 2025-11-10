# Tests Directory

Organization of test files for TryItAI/Noah project.

## Directory Structure

- **async-work/** - Tests for async work orchestration (Phases 1-9)
- **learning-cache/** - Tests for learning service and transparency messaging
- **fixtures/** - Test data files (JSON requests, responses)
- **logs/** - Test execution logs from various test runs
- **Root test scripts** - Integration and feature tests (agentic routing, quality, security, etc.)

## Test Scripts in Root

The root `tests/` directory contains comprehensive integration tests:

- `test-agentic-*.sh` - Agentic routing and agent coordination tests
- `test-analytics-db.ts` - Analytics database integration tests
- `test-learning-*.sh` - Learning service and memory persistence tests
- `test-noah-*.sh` - Noah agent quality and conversational tests
- `test-pattern-library*.sh` - Pattern library integration tests
- `test-performance-optimization.sh` - Performance tracking tests
- `test-quality-improvements.sh` - Quality evaluation tests
- `test-security-depth.sh` - Security service validation tests
- `test-trust-scores.sh` - Trust recovery protocol tests

## Running Tests

Most test scripts are bash scripts that make HTTP requests to the local dev server:

```bash
# Start dev server first
npm run dev

# Run a specific test
./tests/test-agentic-routing.sh

# Run async work tests
./tests/async-work/test-async.sh

# Run learning cache tests
./tests/learning-cache/test-transparency.sh
```

## Test Fixtures

The `fixtures/` directory contains:
- Sample request payloads (`simple-request.json`, `test-request.json`)
- Response examples for verification
- API response fixtures

## Test Logs

The `logs/` directory contains execution logs from test runs. These are useful for debugging test failures and understanding system behavior during testing.
