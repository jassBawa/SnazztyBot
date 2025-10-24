# DCA (Dollar Cost Averaging) Module

This module handles automated DCA trading strategies for Telegram bot users.

## 📁 File Structure

```
dca/
├── README.md                 # This file - module documentation
├── index.ts                  # Main entry point - exports registerDcaCommands()
├── types.ts                  # TypeScript types and interfaces
├── session.ts                # Session state management
├── utils.ts                  # Utility helper functions
├── messages.ts               # Message and keyboard builders
├── flows.ts                  # High-level flow orchestration
└── handlers/
    ├── setup.ts              # Setup flow handlers (Steps 2-5)
    └── management.ts         # Strategy management handlers
```

## 🎯 User Flow

### Setup Flow (Creating a New DCA Strategy)

1. **Entry Point** → `/dca` command or "📊 Setup DCA" button
2. **Step 1: Select Token Pair** → User chooses trading pair (e.g., SOL → IMG)
3. **Step 2: Enter Amount** → User inputs amount per interval (e.g., "0.1")
4. **Step 3: Select Frequency** → User picks execution frequency
5. **Step 4: Confirm** → User reviews and confirms strategy
6. **Complete** → Strategy saved to database

### Management Flow

1. **Entry Point** → `/dca_list` command or "📋 My DCA" button
2. **View Strategies** → List of user's DCA strategies
3. **Actions** → Pause, Resume, or Cancel strategies

## 📝 Module Responsibilities

### `types.ts`
- Defines TypeScript interfaces and types
- `DcaSession` - Session state structure
- `DcaFrequency` - Frequency options
- `DcaStatus` - Strategy status

### `session.ts`
- Manages in-memory session storage
- CRUD operations for sessions
- Session key generation

### `utils.ts`
- `calculateNextExecutionTime()` - Calculate next DCA run
- `getFrequencyDisplay()` - Human-readable frequency
- `safeEditOrReply()` - Telegram message fallback
- `getStatusEmoji()` - Status emoji mapping

### `messages.ts`
- All message formatting logic
- Keyboard builders for user interactions
- Separated presentation from business logic

### `flows.ts`
- `setupDcaFlow()` - Initiates setup process
- `showDcaList()` - Shows strategy management
- High-level orchestration functions

### `handlers/setup.ts`
- Token pair selection handler
- Amount input validation
- Frequency selection handler
- Strategy confirmation and creation

### `handlers/management.ts`
- Pause/Resume strategy handlers
- Cancel strategy with confirmation
- Strategy list management

## 🔧 Adding New Features

### To add a new DCA frequency:
1. Update `DcaFrequency` type in `types.ts`
2. Add interval calculation in `utils.ts` → `calculateNextExecutionTime()`
3. Add display text in `utils.ts` → `getFrequencyDisplay()`
4. Add button in `messages.ts` → `buildFrequencyKeyboard()`

### To add a new management action:
1. Add action handler in `handlers/management.ts`
2. Add button in `messages.ts` → `buildStrategyManagementKeyboard()`
3. Create database function in `services/db.ts` if needed

## 🧪 Testing

To test the complete flow:

```bash
# Start the bot
pnpm run dev

# In Telegram:
1. /dca - Start setup
2. Select token pair
3. Enter amount (e.g., 0.1)
4. Select frequency
5. Confirm
6. /dca_list - View created strategy
```

## 🛠️ Best Practices

- **Separation of Concerns**: Each file has a single responsibility
- **Type Safety**: Strong typing throughout the module
- **Error Handling**: Graceful error handling in all handlers
- **Testability**: Pure functions in utils.ts and messages.ts
- **Maintainability**: Clear structure makes updates easy
- **Documentation**: JSDoc comments on all public functions

## 📊 Benefits of This Structure

✅ **Easy to Navigate** - Logical file organization
✅ **Easy to Test** - Pure functions can be unit tested
✅ **Easy to Extend** - Add features without modifying existing code
✅ **Easy to Debug** - Clear separation makes issues easier to locate
✅ **Team Friendly** - New developers can understand the flow quickly
✅ **Production Ready** - Professional structure for scaling
