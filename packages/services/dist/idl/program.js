// src/idl/program.json
var address = "3fWbxmqbqFzvewGqJ9iNqyC22RuFhJ8Yof1nEWbgHimF";
var metadata = {
  name: "token_launchpad",
  version: "0.1.0",
  spec: "0.1.0",
  description: "Created with Anchor"
};
var instructions = [
  {
    name: "buy_tokens",
    discriminator: [
      189,
      21,
      230,
      133,
      247,
      2,
      110,
      42
    ],
    accounts: [
      {
        name: "buyer",
        writable: true,
        signer: true
      },
      {
        name: "creator",
        writable: true,
        signer: true
      },
      {
        name: "creator_token_account",
        writable: true
      },
      {
        name: "global_config",
        writable: true,
        pda: {
          seeds: [
            {
              kind: "const",
              value: [
                103,
                108,
                111,
                98,
                97,
                108,
                45,
                99,
                111,
                110,
                102,
                105,
                103
              ]
            }
          ]
        }
      },
      {
        name: "treasury",
        writable: true
      },
      {
        name: "bonding_curve",
        writable: true,
        pda: {
          seeds: [
            {
              kind: "const",
              value: [
                98,
                111,
                110,
                100,
                105,
                110,
                103,
                45,
                99,
                117,
                114,
                118,
                101
              ]
            },
            {
              kind: "account",
              path: "bonding_curve.creator",
              account: "BondingCurve"
            }
          ]
        }
      },
      {
        name: "bonding_curve_token_account",
        writable: true
      },
      {
        name: "token_mint",
        writable: true
      },
      {
        name: "metadata_account",
        writable: true
      },
      {
        name: "buyer_token_account",
        writable: true
      },
      {
        name: "wsol_temp_token_account",
        writable: true
      },
      {
        name: "liquidity_token_account",
        writable: true
      },
      {
        name: "pool_account",
        writable: true
      },
      {
        name: "wsol_mint_account"
      },
      {
        name: "associated_token_program"
      },
      {
        name: "token_metadata_program"
      },
      {
        name: "system_program",
        address: "11111111111111111111111111111111"
      },
      {
        name: "token_program",
        address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      },
      {
        name: "rent",
        address: "SysvarRent111111111111111111111111111111111"
      }
    ],
    args: [
      {
        name: "sol_amount",
        type: "u64"
      }
    ]
  },
  {
    name: "create_token",
    discriminator: [
      84,
      52,
      204,
      228,
      24,
      140,
      234,
      75
    ],
    accounts: [
      {
        name: "creator",
        writable: true,
        signer: true
      },
      {
        name: "global_config",
        writable: true,
        pda: {
          seeds: [
            {
              kind: "const",
              value: [
                103,
                108,
                111,
                98,
                97,
                108,
                45,
                99,
                111,
                110,
                102,
                105,
                103
              ]
            }
          ]
        }
      },
      {
        name: "treasury",
        writable: true
      },
      {
        name: "bonding_curve",
        writable: true,
        pda: {
          seeds: [
            {
              kind: "const",
              value: [
                98,
                111,
                110,
                100,
                105,
                110,
                103,
                45,
                99,
                117,
                114,
                118,
                101
              ]
            },
            {
              kind: "account",
              path: "creator"
            }
          ]
        }
      },
      {
        name: "token_mint",
        writable: true,
        signer: true
      },
      {
        name: "bonding_curve_token_account",
        writable: true,
        signer: true
      },
      {
        name: "metadata_account",
        writable: true
      },
      {
        name: "token_metadata_program"
      },
      {
        name: "token_program",
        address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      },
      {
        name: "system_program",
        address: "11111111111111111111111111111111"
      },
      {
        name: "rent",
        address: "SysvarRent111111111111111111111111111111111"
      }
    ],
    args: [
      {
        name: "name",
        type: "string"
      },
      {
        name: "symbol",
        type: "string"
      },
      {
        name: "uri",
        type: "string"
      }
    ]
  },
  {
    name: "graduate",
    discriminator: [
      45,
      235,
      225,
      181,
      17,
      218,
      64,
      130
    ],
    accounts: [
      {
        name: "bonding_curve",
        writable: true,
        pda: {
          seeds: [
            {
              kind: "const",
              value: [
                98,
                111,
                110,
                100,
                105,
                110,
                103,
                45,
                99,
                117,
                114,
                118,
                101
              ]
            },
            {
              kind: "account",
              path: "bonding_curve.creator",
              account: "BondingCurve"
            }
          ]
        }
      },
      {
        name: "relayer",
        writable: true,
        signer: true
      },
      {
        name: "token_mint"
      },
      {
        name: "lp_mint",
        writable: true
      },
      {
        name: "lp_token_account",
        writable: true,
        pda: {
          seeds: [
            {
              kind: "account",
              path: "bonding_curve"
            },
            {
              kind: "const",
              value: [
                6,
                221,
                246,
                225,
                215,
                101,
                161,
                147,
                217,
                203,
                225,
                70,
                206,
                235,
                121,
                172,
                28,
                180,
                133,
                237,
                95,
                91,
                55,
                145,
                58,
                140,
                245,
                133,
                126,
                255,
                0,
                169
              ]
            },
            {
              kind: "account",
              path: "lp_mint"
            }
          ],
          program: {
            kind: "const",
            value: [
              140,
              151,
              37,
              143,
              78,
              36,
              137,
              241,
              187,
              61,
              16,
              41,
              20,
              142,
              13,
              131,
              11,
              90,
              19,
              153,
              218,
              255,
              16,
              132,
              4,
              142,
              123,
              216,
              219,
              233,
              248,
              89
            ]
          }
        }
      },
      {
        name: "global_config"
      },
      {
        name: "token_program",
        address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      }
    ],
    args: [
      {
        name: "pool",
        type: "pubkey"
      }
    ]
  },
  {
    name: "sell_tokens",
    discriminator: [
      114,
      242,
      25,
      12,
      62,
      126,
      92,
      2
    ],
    accounts: [
      {
        name: "seller",
        writable: true,
        signer: true
      },
      {
        name: "bonding_curve",
        writable: true,
        pda: {
          seeds: [
            {
              kind: "const",
              value: [
                98,
                111,
                110,
                100,
                105,
                110,
                103,
                45,
                99,
                117,
                114,
                118,
                101
              ]
            },
            {
              kind: "account",
              path: "bonding_curve.creator",
              account: "BondingCurve"
            }
          ]
        }
      },
      {
        name: "global_config",
        writable: true,
        pda: {
          seeds: [
            {
              kind: "const",
              value: [
                103,
                108,
                111,
                98,
                97,
                108,
                45,
                99,
                111,
                110,
                102,
                105,
                103
              ]
            }
          ]
        }
      },
      {
        name: "treasury",
        writable: true
      },
      {
        name: "seller_token_account",
        writable: true
      },
      {
        name: "bonding_curve_token_account",
        writable: true
      },
      {
        name: "token_mint"
      },
      {
        name: "token_program",
        address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      },
      {
        name: "system_program",
        address: "11111111111111111111111111111111"
      }
    ],
    args: [
      {
        name: "tokens_in",
        type: "u64"
      }
    ]
  }
];
var accounts = [
  {
    name: "BondingCurve",
    discriminator: [
      23,
      183,
      248,
      55,
      96,
      216,
      172,
      96
    ]
  },
  {
    name: "GlobalConfig",
    discriminator: [
      149,
      8,
      156,
      202,
      160,
      252,
      176,
      217
    ]
  }
];
var events = [
  {
    name: "CreatePoolRequestEvent",
    discriminator: [
      135,
      209,
      142,
      16,
      198,
      18,
      245,
      45
    ]
  },
  {
    name: "GraduatedEvent",
    discriminator: [
      143,
      52,
      20,
      137,
      64,
      74,
      238,
      0
    ]
  }
];
var types = [
  {
    name: "BondingCurve",
    type: {
      kind: "struct",
      fields: [
        {
          name: "creator",
          type: "pubkey"
        },
        {
          name: "token_mint",
          type: "pubkey"
        },
        {
          name: "pool",
          type: {
            option: "pubkey"
          }
        },
        {
          name: "virtual_sol_reserves",
          type: "u64"
        },
        {
          name: "virtual_token_reserves",
          type: "u64"
        },
        {
          name: "real_sol_reserves",
          type: "u64"
        },
        {
          name: "real_token_reserves",
          type: "u64"
        },
        {
          name: "graduated",
          type: {
            defined: {
              name: "GraduationState"
            }
          }
        },
        {
          name: "bump",
          type: "u8"
        }
      ]
    }
  },
  {
    name: "CreatePoolRequestEvent",
    type: {
      kind: "struct",
      fields: [
        {
          name: "bonding_curve",
          type: "pubkey"
        },
        {
          name: "token_mint",
          type: "pubkey"
        },
        {
          name: "wsol_ata",
          type: "pubkey"
        },
        {
          name: "token_amount",
          type: "u64"
        },
        {
          name: "wsol_amount",
          type: "u64"
        },
        {
          name: "creator",
          type: "pubkey"
        },
        {
          name: "timestamp",
          type: "i64"
        }
      ]
    }
  },
  {
    name: "GlobalConfig",
    type: {
      kind: "struct",
      fields: [
        {
          name: "authority",
          type: "pubkey"
        },
        {
          name: "treasury",
          type: "pubkey"
        },
        {
          name: "buy_fee_bps",
          type: "u16"
        },
        {
          name: "sell_fee_bps",
          type: "u16"
        },
        {
          name: "creation_fee",
          type: "u64"
        },
        {
          name: "graduation_threshold",
          type: "u64"
        },
        {
          name: "total_tokens_created",
          type: "u64"
        },
        {
          name: "total_volume_sol",
          type: "u128"
        },
        {
          name: "allowed_relayer",
          type: "pubkey"
        },
        {
          name: "paused",
          type: "bool"
        },
        {
          name: "bump",
          type: "u8"
        }
      ]
    }
  },
  {
    name: "GraduatedEvent",
    type: {
      kind: "struct",
      fields: [
        {
          name: "mint",
          type: "pubkey"
        },
        {
          name: "pool",
          type: "pubkey"
        },
        {
          name: "authority",
          type: "pubkey"
        },
        {
          name: "timestamp",
          type: "i64"
        }
      ]
    }
  },
  {
    name: "GraduationState",
    type: {
      kind: "enum",
      variants: [
        {
          name: "Active"
        },
        {
          name: "Pending"
        },
        {
          name: "Graduated"
        }
      ]
    }
  }
];
var program_default = {
  address,
  metadata,
  instructions,
  accounts,
  events,
  types
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  accounts,
  address,
  events,
  instructions,
  metadata,
  types
});
