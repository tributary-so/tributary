/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/recurring_payments.json`.
 */
export type RecurringPayments = {
  "address": "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ",
  "metadata": {
    "name": "recurringPayments",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "changePaymentPolicyStatus",
      "discriminator": [
        250,
        83,
        53,
        119,
        200,
        114,
        9,
        132
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "userPayment",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "paymentPolicy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "userPayment"
              },
              {
                "kind": "arg",
                "path": "policyId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "policyId",
          "type": "u32"
        },
        {
          "name": "newStatus",
          "type": {
            "defined": {
              "name": "paymentStatus"
            }
          }
        }
      ]
    },
    {
      "name": "createPaymentGateway",
      "discriminator": [
        186,
        227,
        210,
        95,
        154,
        36,
        146,
        9
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority"
        },
        {
          "name": "gateway",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  116,
                  101,
                  119,
                  97,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "feeRecipient"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gatewayFeeBps",
          "type": "u16"
        },
        {
          "name": "name",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "url",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        }
      ]
    },
    {
      "name": "createPaymentPolicy",
      "discriminator": [
        32,
        50,
        29,
        251,
        174,
        23,
        112,
        121
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userPayment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "recipient"
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "gateway",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  116,
                  101,
                  119,
                  97,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "gateway.authority",
                "account": "paymentGateway"
              }
            ]
          }
        },
        {
          "name": "paymentPolicy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "userPayment"
              },
              {
                "kind": "arg",
                "path": "policyId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "policyId",
          "type": "u32"
        },
        {
          "name": "policyType",
          "type": {
            "defined": {
              "name": "policyType"
            }
          }
        },
        {
          "name": "memo",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        }
      ]
    },
    {
      "name": "createUserPayment",
      "discriminator": [
        115,
        54,
        209,
        72,
        127,
        194,
        206,
        49
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "userPayment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "tokenAccount"
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "deletePaymentPolicy",
      "discriminator": [
        146,
        180,
        143,
        169,
        50,
        40,
        146,
        86
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "userPayment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "paymentPolicy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "userPayment"
              },
              {
                "kind": "arg",
                "path": "policyId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "policyId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "executePayment",
      "discriminator": [
        86,
        4,
        7,
        7,
        120,
        139,
        232,
        139
      ],
      "accounts": [
        {
          "name": "gatewayAuthority",
          "signer": true
        },
        {
          "name": "paymentsDelegate",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "paymentPolicy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "payment_policy.user_payment",
                "account": "paymentPolicy"
              },
              {
                "kind": "account",
                "path": "payment_policy.policy_id",
                "account": "paymentPolicy"
              }
            ]
          }
        },
        {
          "name": "userPayment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user_payment.owner",
                "account": "userPayment"
              },
              {
                "kind": "account",
                "path": "user_payment.token_mint",
                "account": "userPayment"
              }
            ]
          }
        },
        {
          "name": "gateway",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  116,
                  101,
                  119,
                  97,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "gateway.authority",
                "account": "paymentGateway"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "recipientTokenAccount",
          "writable": true
        },
        {
          "name": "gatewayFeeAccount",
          "writable": true
        },
        {
          "name": "protocolFeeAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "paymentGateway",
      "discriminator": [
        200,
        101,
        8,
        23,
        141,
        157,
        106,
        112
      ]
    },
    {
      "name": "paymentPolicy",
      "discriminator": [
        48,
        74,
        183,
        94,
        41,
        92,
        52,
        44
      ]
    },
    {
      "name": "programConfig",
      "discriminator": [
        196,
        210,
        90,
        231,
        144,
        149,
        140,
        63
      ]
    },
    {
      "name": "userPayment",
      "discriminator": [
        115,
        161,
        14,
        69,
        223,
        123,
        210,
        9
      ]
    }
  ],
  "events": [
    {
      "name": "paymentRecord",
      "discriminator": [
        42,
        100,
        253,
        124,
        170,
        186,
        231,
        186
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "programPaused",
      "msg": "Program is paused"
    },
    {
      "code": 6001,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6002,
      "name": "invalidFrequency",
      "msg": "Invalid payment frequency"
    },
    {
      "code": 6003,
      "name": "maxPoliciesReached",
      "msg": "Maximum policies per user reached"
    },
    {
      "code": 6004,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6005,
      "name": "invalidPolicyStatusTransition",
      "msg": "Invalid policy status transition"
    },
    {
      "code": 6006,
      "name": "policyNotFound",
      "msg": "Payment policy not found"
    },
    {
      "code": 6007,
      "name": "insufficientDelegatedAmount",
      "msg": "Insufficient delegated amount"
    },
    {
      "code": 6008,
      "name": "paymentNotDue",
      "msg": "Payment is not yet due"
    },
    {
      "code": 6009,
      "name": "insufficientBalance",
      "msg": "Insufficient balance for payment"
    },
    {
      "code": 6010,
      "name": "noDelegateSet",
      "msg": "No or incorrect delegate set in ata"
    },
    {
      "code": 6011,
      "name": "policyPaused",
      "msg": "Payment policy is paused"
    },
    {
      "code": 6012,
      "name": "invalidInterval",
      "msg": "Invalid Interval"
    }
  ],
  "types": [
    {
      "name": "paymentFrequency",
      "docs": [
        "Simplify the payment frequency while also allowing a custom period as well,",
        "defined in seconds."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "daily"
          },
          {
            "name": "weekly"
          },
          {
            "name": "monthly"
          },
          {
            "name": "quarterly"
          },
          {
            "name": "semiAnnually"
          },
          {
            "name": "annually"
          },
          {
            "name": "custom",
            "fields": [
              "u64"
            ]
          }
        ]
      }
    },
    {
      "name": "paymentGateway",
      "docs": [
        "A gateway operator runs the service that triggers payment.",
        "Hence, the gateway can take a cut of the fees payed by the users"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "feeRecipient",
            "type": "pubkey"
          },
          {
            "name": "gatewayFeeBps",
            "type": "u16"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "totalProcessed",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "url",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                160
              ]
            }
          }
        ]
      }
    },
    {
      "name": "paymentPolicy",
      "docs": [
        "This structure connects a UserPayment (user/mint) with a Policy, a Gateway.",
        "This is the structure that actually specifies the subscription payment as you would",
        "expect from an invoice. The SDK would setup these PaymentPolicy"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userPayment",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "gateway",
            "type": "pubkey"
          },
          {
            "name": "policyType",
            "type": {
              "defined": {
                "name": "policyType"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "paymentStatus"
              }
            }
          },
          {
            "name": "memo",
            "docs": [
              "specified by the serice provider when installed (e.g. via sdk). Helps identify the payer"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "totalPaid",
            "type": "u64"
          },
          {
            "name": "paymentCount",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "policyId",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    },
    {
      "name": "paymentRecord",
      "docs": [
        "An event that is thrown when a payment takes place"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentPolicy",
            "type": "pubkey"
          },
          {
            "name": "gateway",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "memo",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "recordId",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "paymentStatus",
      "docs": [
        "A status enum for installed payment policies indicating if payment can be made"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "paused"
          }
        ]
      }
    },
    {
      "name": "policyType",
      "docs": [
        "The PolicyType enum implements the payment schemes. The initial policy",
        "will be a subscription payment that enables the regular payment according to",
        "a schedule.",
        "",
        "IMPORTANT: All variants MUST be exactly 128 bytes to ensure consistent account sizing",
        "and enable future enum variant additions without breaking existing accounts."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "subscription",
            "fields": [
              {
                "name": "amount",
                "type": "u64"
              },
              {
                "name": "autoRenew",
                "type": "bool"
              },
              {
                "name": "maxRenewals",
                "type": {
                  "option": "u32"
                }
              },
              {
                "name": "paymentFrequency",
                "type": {
                  "defined": {
                    "name": "paymentFrequency"
                  }
                }
              },
              {
                "name": "nextPaymentDue",
                "type": "i64"
              },
              {
                "name": "padding",
                "type": {
                  "array": [
                    "u8",
                    97
                  ]
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "programConfig",
      "docs": [
        "This is a unique global program configuration managed by an admin that",
        "defines the protocol fees and potentially more."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "feeRecipient",
            "type": "pubkey"
          },
          {
            "name": "protocolFeeBps",
            "type": "u16"
          },
          {
            "name": "maxPoliciesPerUser",
            "type": "u32"
          },
          {
            "name": "emergencyPause",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userPayment",
      "docs": [
        "Each owner/authority+mint has a unique UserPayment account.",
        "The purpose of this account is to be able to identify quickly",
        "some statistics that are valid across *all* payment policies",
        "for an authority across a mint."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "tokenAccount",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "activePoliciesCount",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seed",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
};
