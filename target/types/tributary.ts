/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/tributary.json`.
 */
export type Tributary = {
  "address": "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ",
  "metadata": {
    "name": "tributary",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "changeGatewayFeeRecipient",
      "discriminator": [
        73,
        254,
        67,
        5,
        32,
        147,
        202,
        101
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
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
          "name": "newFeeRecipient",
          "docs": [
            "be used to derive the associated token account from. So we don't have to check anything",
            "really, FIXME: do we?"
          ]
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
        }
      ],
      "args": []
    },
    {
      "name": "changeGatewaySigner",
      "discriminator": [
        212,
        253,
        96,
        169,
        171,
        244,
        137,
        144
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
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
          "name": "newSigner"
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
        }
      ],
      "args": []
    },
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
          "name": "recipient",
          "docs": [
            "corresponding tokenAccount/ata will be derived during execution."
          ]
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
          "name": "paymentPolicy",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
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
      "name": "createReferralAccount",
      "discriminator": [
        235,
        55,
        82,
        230,
        52,
        35,
        56,
        210
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "referralAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  102,
                  101,
                  114,
                  114,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "gateway"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "gateway",
          "docs": [
            "The gateway this referral account belongs to"
          ]
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
      "args": [
        {
          "name": "referralCode",
          "type": {
            "array": [
              "u8",
              6
            ]
          }
        },
        {
          "name": "referrer",
          "type": {
            "option": "pubkey"
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
      "name": "deletePaymentGateway",
      "discriminator": [
        222,
        101,
        255,
        134,
        63,
        41,
        248,
        139
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
          "name": "feePayer",
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
      "args": [
        {
          "name": "paymentAmount",
          "type": {
            "option": "u64"
          }
        }
      ]
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
    },
    {
      "name": "updateGatewayReferralSettings",
      "discriminator": [
        243,
        85,
        199,
        210,
        27,
        35,
        250,
        84
      ],
      "accounts": [
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
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "updateGatewayReferralSettingsArgs"
            }
          }
        }
      ]
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
      "name": "referralAccount",
      "discriminator": [
        237,
        162,
        80,
        78,
        196,
        233,
        91,
        2
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
      "name": "gatewayFeeRecipientChanged",
      "discriminator": [
        105,
        68,
        6,
        243,
        153,
        138,
        169,
        146
      ]
    },
    {
      "name": "gatewaySignerChanged",
      "discriminator": [
        123,
        161,
        22,
        153,
        186,
        125,
        49,
        187
      ]
    },
    {
      "name": "paymentGatewayCreated",
      "discriminator": [
        117,
        71,
        161,
        238,
        28,
        132,
        111,
        238
      ]
    },
    {
      "name": "paymentGatewayDeleted",
      "discriminator": [
        159,
        159,
        169,
        53,
        140,
        91,
        101,
        217
      ]
    },
    {
      "name": "paymentPolicyCreated",
      "discriminator": [
        183,
        14,
        150,
        236,
        3,
        166,
        91,
        44
      ]
    },
    {
      "name": "paymentPolicyDeleted",
      "discriminator": [
        164,
        228,
        135,
        36,
        87,
        156,
        237,
        126
      ]
    },
    {
      "name": "paymentPolicyStatusChanged",
      "discriminator": [
        66,
        140,
        136,
        203,
        34,
        132,
        190,
        93
      ]
    },
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
    },
    {
      "name": "programConfigCreated",
      "discriminator": [
        96,
        218,
        177,
        136,
        188,
        157,
        105,
        177
      ]
    },
    {
      "name": "referralRewardDistributedRecord",
      "discriminator": [
        91,
        128,
        157,
        110,
        236,
        68,
        237,
        14
      ]
    },
    {
      "name": "userPaymentCreated",
      "discriminator": [
        112,
        162,
        36,
        73,
        210,
        62,
        34,
        21
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
    },
    {
      "code": 6013,
      "name": "invalidFeeBps",
      "msg": "Invalid fee basis points"
    },
    {
      "code": 6014,
      "name": "invalidPaymentDueDate",
      "msg": "Invalid payment due date"
    },
    {
      "code": 6015,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6016,
      "name": "referralFeatureNotEnabled",
      "msg": "Referral program feature is not enabled"
    },
    {
      "code": 6017,
      "name": "invalidReferralAllocation",
      "msg": "Invalid referral allocation - must be <= 2500 bps"
    },
    {
      "code": 6018,
      "name": "invalidReferralTiers",
      "msg": "Invalid referral tiers - must sum to 10000 bps"
    },
    {
      "code": 6019,
      "name": "couldNotDeserializeReferrer",
      "msg": "Could not deserialize referrer account"
    },
    {
      "code": 6020,
      "name": "referrerMustBeWritable",
      "msg": "Referrer account must be writable"
    },
    {
      "code": 6021,
      "name": "circularReferralChain",
      "msg": "Circular referral chain detected"
    },
    {
      "code": 6022,
      "name": "maxReferralDepthExceeded",
      "msg": "Maximum referral chain depth exceeded"
    },
    {
      "code": 6023,
      "name": "invalidReferralAccountDiscriminator",
      "msg": "Invalid referral account discriminator"
    },
    {
      "code": 6024,
      "name": "referralAccountSizeMismatch",
      "msg": "Referral account size mismatch"
    },
    {
      "code": 6025,
      "name": "invalidReferralCode",
      "msg": "Invalid referral code - must be alphanumeric"
    }
  ],
  "types": [
    {
      "name": "gatewayFeeRecipientChanged",
      "docs": [
        "An event that is thrown when a gateway fee recipient is changed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gateway",
            "type": "pubkey"
          },
          {
            "name": "oldFeeRecipient",
            "type": "pubkey"
          },
          {
            "name": "newFeeRecipient",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "gatewaySignerChanged",
      "docs": [
        "An event that is thrown when a gateway signer is changed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gateway",
            "type": "pubkey"
          },
          {
            "name": "oldSigner",
            "type": "pubkey"
          },
          {
            "name": "newSigner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "paymentFrequency",
      "docs": [
        "Defines frequency at which recurring payments should occur.",
        "Predefined intervals are provided for common use cases, with Custom",
        "allowing arbitrary intervals defined in seconds."
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
        "A payment gateway operated by a service provider that executes recurring payments.",
        "Gateway operators can charge fees for their service and are responsible for",
        "triggering payment execution. Each gateway has an authority (owner), fee recipient,",
        "and signer key used to execute payments on behalf of users."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Authority key that owns this gateway. Cannot be changed after creation."
            ],
            "type": "pubkey"
          },
          {
            "name": "feeRecipient",
            "docs": [
              "Key that receives gateway fees from processed payments"
            ],
            "type": "pubkey"
          },
          {
            "name": "gatewayFeeBps",
            "docs": [
              "Gateway fee in basis points (bps). Max 10,000 (100%)"
            ],
            "type": "u16"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether this gateway is active and can process payments"
            ],
            "type": "bool"
          },
          {
            "name": "padding1",
            "docs": [
              "No-longer-used, take care of tumbstone"
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp when gateway was created"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed for address derivation"
            ],
            "type": "u8"
          },
          {
            "name": "name",
            "docs": [
              "Human-readable gateway name (32 bytes max)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "url",
            "docs": [
              "Gateway service URL (64 bytes max)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "signer",
            "docs": [
              "Signer key authorized to execute payments for this gateway"
            ],
            "type": "pubkey"
          },
          {
            "name": "featureFlags",
            "docs": [
              "Gateway-scoped feature flags (bit-vector)",
              "Bit 0: Referral program enabled (1 = enabled, 0 = disabled)"
            ],
            "type": "u8"
          },
          {
            "name": "referralAllocationBps",
            "docs": [
              "Gateway-scoped referral program allocation (in basis points)",
              "0 = no referral program, 2500 = 25% of gateway fee can be used for referrals"
            ],
            "type": "u16"
          },
          {
            "name": "referralTiersBps",
            "docs": [
              "Gateway-scoped referral tier distribution as [level1, level2, level3]",
              "Values are in basis points (e.g., 6000 = 60%). Must sum to 10000 = 100%"
            ],
            "type": {
              "array": [
                "u16",
                3
              ]
            }
          },
          {
            "name": "padding",
            "docs": [
              "Padding for future fields"
            ],
            "type": {
              "array": [
                "u8",
                119
              ]
            }
          }
        ]
      }
    },
    {
      "name": "paymentGatewayCreated",
      "docs": [
        "An event that is thrown when a payment gateway is created"
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
      }
    },
    {
      "name": "paymentGatewayDeleted",
      "docs": [
        "An event that is thrown when a payment gateway is deleted"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gateway",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
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
        "This is structure that actually specifies subscription payment as you would",
        "expect from an invoice. The SDK would setup these PaymentPolicy"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userPayment",
            "docs": [
              "Reference to the UserPayment account this policy belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "docs": [
              "Recipient who receives payments"
            ],
            "type": "pubkey"
          },
          {
            "name": "gateway",
            "docs": [
              "Payment gateway responsible for executing this policy"
            ],
            "type": "pubkey"
          },
          {
            "name": "policyType",
            "docs": [
              "Type and parameters of this payment policy"
            ],
            "type": {
              "defined": {
                "name": "policyType"
              }
            }
          },
          {
            "name": "status",
            "docs": [
              "Current status of this payment policy"
            ],
            "type": {
              "defined": {
                "name": "paymentStatus"
              }
            }
          },
          {
            "name": "memo",
            "docs": [
              "Human-readable memo/description (64 bytes max)"
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
            "docs": [
              "Total amount paid out under this policy (cumulative)"
            ],
            "type": "u64"
          },
          {
            "name": "paymentCount",
            "docs": [
              "Number of payments executed under this policy"
            ],
            "type": "u32"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp when policy was created"
            ],
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "docs": [
              "Unix timestamp when policy was last updated"
            ],
            "type": "i64"
          },
          {
            "name": "policyId",
            "docs": [
              "Unique identifier for this policy within user_payment scope"
            ],
            "type": "u32"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed for address derivation"
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "docs": [
              "Reserved space for future extensions"
            ],
            "type": {
              "array": [
                "u8",
                255
              ]
            }
          }
        ]
      }
    },
    {
      "name": "paymentPolicyCreated",
      "docs": [
        "An event that is thrown when a payment policy is created"
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
          },
          {
            "name": "createdPoliciesCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "paymentPolicyDeleted",
      "docs": [
        "An event that is thrown when a payment policy is deleted"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentPolicy",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "policyId",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "paymentPolicyStatusChanged",
      "docs": [
        "An event that is thrown when a payment policy status is changed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentPolicy",
            "type": "pubkey"
          },
          {
            "name": "oldStatus",
            "type": {
              "defined": {
                "name": "paymentStatus"
              }
            }
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
        "Status enum for payment policies indicating whether payments can be executed.",
        "Active policies allow payment execution, while Paused policies prevent",
        "automatic payment processing until reactivated."
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
        "The PolicyType enum implements different payment schemes. The initial policy",
        "will be a subscription payment that enables regular payment according to",
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
          },
          {
            "name": "milestone",
            "fields": [
              {
                "name": "milestoneAmounts",
                "type": {
                  "array": [
                    "u64",
                    4
                  ]
                }
              },
              {
                "name": "milestoneTimestamps",
                "type": {
                  "array": [
                    "i64",
                    4
                  ]
                }
              },
              {
                "name": "currentMilestone",
                "type": "u8"
              },
              {
                "name": "releaseCondition",
                "type": "u8"
              },
              {
                "name": "totalMilestones",
                "type": "u8"
              },
              {
                "name": "escrowAmount",
                "type": "u64"
              },
              {
                "name": "padding",
                "type": {
                  "array": [
                    "u8",
                    53
                  ]
                }
              }
            ]
          },
          {
            "name": "payAsYouGo",
            "fields": [
              {
                "name": "maxAmountPerPeriod",
                "type": "u64"
              },
              {
                "name": "maxChunkAmount",
                "type": "u64"
              },
              {
                "name": "periodLengthSeconds",
                "type": "u64"
              },
              {
                "name": "currentPeriodStart",
                "type": "i64"
              },
              {
                "name": "currentPeriodTotal",
                "type": "u64"
              },
              {
                "name": "padding",
                "type": {
                  "array": [
                    "u8",
                    88
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
        "defines protocol fees and potentially more."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Admin authority that can update protocol configuration"
            ],
            "type": "pubkey"
          },
          {
            "name": "feeRecipient",
            "docs": [
              "Key that receives protocol fees from all payments"
            ],
            "type": "pubkey"
          },
          {
            "name": "protocolFeeBps",
            "docs": [
              "Protocol fee in basis points (bps). Max 10,000 (100%)"
            ],
            "type": "u16"
          },
          {
            "name": "maxPoliciesPerUser",
            "docs": [
              "Maximum number of active policies allowed per user"
            ],
            "type": "u32"
          },
          {
            "name": "emergencyPause",
            "docs": [
              "Emergency pause flag - when true, all payments are blocked"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed for address derivation"
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "docs": [
              "Reserved space for future extensions"
            ],
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
      "name": "programConfigCreated",
      "docs": [
        "An event that is thrown when program is initialized"
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
          }
        ]
      }
    },
    {
      "name": "referralAccount",
      "docs": [
        "A referral account that tracks referral codes and chain relationships for reward distribution.",
        "Each referral account is scoped to a specific gateway to enable gateway-specific referral ecosystems.",
        "",
        "The PDA derivation uses gateway pubkey to ensure uniqueness per gateway:",
        "PDA seeds: [\"referral\", gateway_pubkey, owner_pubkey]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gateway",
            "docs": [
              "The gateway this referral account belongs to (for PDA derivation and scoping)"
            ],
            "type": "pubkey"
          },
          {
            "name": "owner",
            "docs": [
              "Authority who owns this referral code and can earn rewards"
            ],
            "type": "pubkey"
          },
          {
            "name": "referralCode",
            "docs": [
              "6-character alphanumeric referral code"
            ],
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "referrer",
            "docs": [
              "Referrer who brought this user (for chain traversal), None if no referrer"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp when account was created"
            ],
            "type": "i64"
          },
          {
            "name": "totalEarned",
            "docs": [
              "Total rewards earned by this referrer (in smallest token units)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "referralReward",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "reward",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "referralRewardDistributedRecord",
      "docs": [
        "An event that is thrown when referral rewards are distributed"
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
            "name": "paymentAmount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "rewards",
            "type": {
              "array": [
                {
                  "option": {
                    "defined": {
                      "name": "referralReward"
                    }
                  }
                },
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "updateGatewayReferralSettingsArgs",
      "docs": [
        "Arguments for updating gateway referral settings"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "featureFlags",
            "docs": [
              "Optional feature flags to update (bit 0 = referral program enabled)"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "referralAllocationBps",
            "docs": [
              "Optional referral allocation in basis points (0-2500)"
            ],
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "referralTiersBps",
            "docs": [
              "Optional referral tier distribution [level1, level2, level3] in bps (must sum to 10000)"
            ],
            "type": {
              "option": {
                "array": [
                  "u16",
                  3
                ]
              }
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
            "docs": [
              "Owner of this payment account (the user)"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenAccount",
            "docs": [
              "Associated token account for payment token"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "docs": [
              "Mint address of token used for payments"
            ],
            "type": "pubkey"
          },
          {
            "name": "activePoliciesCount",
            "docs": [
              "Number of active payment policies for this user/mint combination"
            ],
            "type": "u32"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp when account was created"
            ],
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "docs": [
              "Unix timestamp when account was last updated"
            ],
            "type": "i64"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether this payment account is active"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed for address derivation"
            ],
            "type": "u8"
          },
          {
            "name": "createdPoliciesCount",
            "docs": [
              "Total number of policies ever created for this user/mint combination",
              "This field only increases and is used to prevent policy ID reuse"
            ],
            "type": "u32"
          },
          {
            "name": "padding",
            "docs": [
              "Reserved space for future extensions"
            ],
            "type": {
              "array": [
                "u8",
                252
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userPaymentCreated",
      "docs": [
        "An event that is thrown when a user payment account is created"
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
