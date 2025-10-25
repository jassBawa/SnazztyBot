┌─────────────────────────────────────────────────────────┐
│                    DCA COMMAND SYSTEM                    │
└─────────────────────────────────────────────────────────┘

ROOT COMMANDS (User Entry Points)
│
│
├── /dca_list (or /dcas) ⭐ MAIN HUB
│   └── List all DCA strategies with PnL
│       ├── [Tap Strategy Button]
│       │   └── Strategy Detail View
│       │       ├── Full analytics & PnL
│       │       ├── [📜 View History] → Execution list for this strategy
│       │       ├── [⏸️ Pause] → Toggle status
│       │       ├── [▶️ Resume] → Toggle status
│       │       ├── [🗑️ Delete] → Confirmation → Delete strategy
│       │       ├── [🔄 Refresh] → Recalculate PnL
│       │       └── [« Back] → Return to /dca_list
│       │
│       ├── [➕ New Strategy] → /dca
│       ├── [📊 Portfolio Stats] → /dca_stats
│       └── [🔄 Refresh All] → Reload all strategies
│
├── /dca_stats
│   └── Portfolio-wide analytics
│       ├── Total invested across all strategies
│       ├── Total current value
│       ├── Overall PnL
│       ├── Success rate
│       ├── [📋 View Strategies] → /dca_list
│       ├── [📜 All Transactions] → /dca_history (all)
│       └── [🔄 Refresh] → Recalculate stats
│
├── /dca_history (or /dca_txns)
│   └── Transaction history selector
│       ├── [Strategy 1 Button] → Show executions for Strategy 1
│       ├── [Strategy 2 Button] → Show executions for Strategy 2
│       ├── [📜 All Transactions] → Combined history (all strategies)
│       │   └── Shows last 10-20 executions
│       │       └── [« Back] → Return to selector
│       └── Individual Strategy History View
│           ├── Shows last 15 executions
│           ├── Execution details (time, amount, price, tx hash)
│           ├── [📊 Strategy Details] → Strategy Detail View
│           └── [« Back] → Return to /dca_list
│