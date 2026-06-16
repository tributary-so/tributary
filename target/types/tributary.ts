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
      "name": "changeComposableStatus",
      "discriminator": [
        131,
        68,
        92,
        37,
        58,
        83,
        46,
        25
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
                "path": "user_payment.token_mint",
                "account": "userPayment"
              }
            ]
          }
        },
        {
          "name": "composablePolicy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  112,
                  111,
                  115,
                  97,
                  98,
                  108,
                  101,
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
          "name": "gateway"
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
              "name": "policyStatus"
            }
          }
        }
      ]
    },
    {
      "name": "changeGatewayFeeBps",
      "discriminator": [
        129,
        65,
        3,
        111,
        65,
        208,
        146,
        255
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
          "name": "newFeeBps",
          "type": "u16"
        }
      ]
    },
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
          "name": "newFeeRecipient"
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
      "name": "createComposablePolicy",
      "discriminator": [
        91,
        126,
        51,
        215,
        160,
        248,
        142,
        144
      ],
      "accounts": [
        {
          "name": "feePayer",
          "docs": [
            "Gateway signer - pays rent and must match gateway.signer"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "composablePolicy",
          "writable": true
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
          "name": "validationPda",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "schedule",
          "type": {
            "defined": {
              "name": "scheduleType"
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
          "name": "forwardConfig",
          "type": {
            "defined": {
              "name": "forwardConfig"
            }
          }
        },
        {
          "name": "validationProgram",
          "type": "pubkey"
        },
        {
          "name": "numValidationAccounts",
          "type": "u8"
        },
        {
          "name": "validationData",
          "type": "bytes"
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
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
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
          "name": "owner"
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
                "kind": "arg",
                "path": "referralCode"
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
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
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
          "name": "owner"
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
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "deleteComposablePolicy",
      "discriminator": [
        215,
        70,
        252,
        65,
        78,
        5,
        226,
        182
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
                "path": "user_payment.token_mint",
                "account": "userPayment"
              }
            ]
          }
        },
        {
          "name": "composablePolicy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  112,
                  111,
                  115,
                  97,
                  98,
                  108,
                  101,
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
        },
        {
          "name": "rentPayer",
          "writable": true
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
        },
        {
          "name": "rentPayer",
          "docs": [
            "Only used when stored rent_payer != Pubkey::default()."
          ],
          "writable": true
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
      "name": "deleteUserPayment",
      "discriminator": [
        208,
        129,
        72,
        168,
        92,
        75,
        82,
        245
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
          "name": "rentPayer",
          "docs": [
            "Only used when stored rent_payer != Pubkey::default()."
          ],
          "writable": true
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
      "name": "executeComposable",
      "discriminator": [
        27,
        168,
        44,
        123,
        153,
        39,
        164,
        38
      ],
      "accounts": [
        {
          "name": "feePayer",
          "docs": [
            "Gateway signer, user, or recipient — whoever triggers execution"
          ],
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
          "name": "composablePolicy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  112,
                  111,
                  115,
                  97,
                  98,
                  108,
                  101,
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
                "path": "composable_policy.user_payment",
                "account": "composablePolicy"
              },
              {
                "kind": "account",
                "path": "composable_policy.policy_id",
                "account": "composablePolicy"
              }
            ]
          }
        },
        {
          "name": "userPayment",
          "docs": [
            "UserPayment PDA — also the SOLE signing authority for every token",
            "op and CPI in this instruction (see COMPOSABLE.md §PDA Seed Summary).",
            "Owns both intermediate ATAs. The user's source token account MUST",
            "delegate to this PDA."
          ],
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
          "docs": [
            "User's source token account. The account MUST have either the",
            "UserPayment PDA (v1) or the global payments_delegate PDA (v0) set",
            "as delegate with `delegated_amount >= input_amount`."
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "Input mint (== forward_config.input_mint)."
          ]
        },
        {
          "name": "outputMint",
          "docs": [
            "Output mint (== forward_config.output_mint). Required for the",
            "`transfer_checked` calls on the output leg (fees + sweep)."
          ]
        },
        {
          "name": "intermediateInputTokenAccount",
          "docs": [
            "(input_mint ATA). Created lazily via `create_idempotent`. Funded",
            "with the full `input_amount`; drained by the forward CPI."
          ],
          "writable": true
        },
        {
          "name": "intermediateOutputTokenAccount",
          "docs": [
            "(output_mint ATA). Created lazily via `create_idempotent`. Receives",
            "the forward program's output tokens; fees and sweep are taken from",
            "here. Must end the instruction at balance 0."
          ],
          "writable": true
        },
        {
          "name": "recipientTokenAccount",
          "docs": [
            "Recipient's destination token account (output_mint ATA). Must",
            "pre-exist. Receives the swept output after fees."
          ],
          "writable": true
        },
        {
          "name": "gatewayFeeAccount",
          "docs": [
            "Gateway fee account (output_mint)."
          ],
          "writable": true
        },
        {
          "name": "protocolFeeAccount",
          "docs": [
            "Protocol fee account (output_mint)."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "instructionData",
          "type": "bytes"
        },
        {
          "name": "forwardAmount",
          "type": {
            "option": "u64"
          }
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
          "name": "mint"
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
          "name": "authority",
          "writable": true,
          "signer": true
        },
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
          "name": "programData",
          "docs": [
            "Enforces that only the upgrade authority can initialize the protocol."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "transfer",
      "discriminator": [
        163,
        52,
        200,
        231,
        140,
        3,
        69,
        186
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
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
          "name": "from",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "to",
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
          "name": "amount",
          "type": "u64"
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
      "name": "updateGatewayFeatureFlags",
      "discriminator": [
        132,
        186,
        249,
        7,
        77,
        97,
        16,
        213
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
              "name": "updateGatewayFeatureFlagsArgs"
            }
          }
        }
      ]
    },
    {
      "name": "updateGatewayProtocolFee",
      "discriminator": [
        64,
        116,
        3,
        107,
        10,
        191,
        237,
        130
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
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "updateGatewayProtocolFeeArgs"
            }
          }
        }
      ]
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
      "name": "composablePolicy",
      "discriminator": [
        221,
        46,
        214,
        155,
        83,
        198,
        252,
        148
      ]
    },
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
      "name": "composableExecuted",
      "discriminator": [
        146,
        55,
        146,
        151,
        90,
        224,
        15,
        186
      ]
    },
    {
      "name": "composablePolicyCreated",
      "discriminator": [
        226,
        211,
        183,
        34,
        49,
        252,
        234,
        138
      ]
    },
    {
      "name": "composablePolicyDeleted",
      "discriminator": [
        169,
        239,
        45,
        185,
        214,
        246,
        249,
        6
      ]
    },
    {
      "name": "composablePolicyStatusChanged",
      "discriminator": [
        60,
        30,
        170,
        131,
        32,
        190,
        81,
        96
      ]
    },
    {
      "name": "gatewayFeeBpsChanged",
      "discriminator": [
        124,
        209,
        135,
        122,
        9,
        238,
        74,
        234
      ]
    },
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
    },
    {
      "name": "userPaymentDeleted",
      "discriminator": [
        208,
        115,
        168,
        26,
        86,
        179,
        246,
        36
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
      "name": "invalidReferralChainOrdering",
      "msg": "Invalid referral chain ordering in remaining_accounts"
    },
    {
      "code": 6024,
      "name": "invalidReferralAccountDiscriminator",
      "msg": "Invalid referral account discriminator"
    },
    {
      "code": 6025,
      "name": "referralAccountSizeMismatch",
      "msg": "Referral account size mismatch"
    },
    {
      "code": 6026,
      "name": "invalidReferralCode",
      "msg": "Invalid referral code - must be alphanumeric"
    },
    {
      "code": 6027,
      "name": "referrerAccountInvalid",
      "msg": "Referrer Account invalid"
    },
    {
      "code": 6028,
      "name": "referrerAtaInvalid",
      "msg": "Referrer ATA invalid"
    },
    {
      "code": 6029,
      "name": "referrerAtaMintInvalid",
      "msg": "Referrer ATA with invalid Mint"
    },
    {
      "code": 6030,
      "name": "missingReferralAta",
      "msg": "Missing ATA for ReferralAccount - each ReferralAccount requires a matching token account"
    },
    {
      "code": 6031,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account - mint mismatch or deserialization failed"
    },
    {
      "code": 6032,
      "name": "mismatchAtaReferralAccountNumbers",
      "msg": "Mismatch between number referrers and atas!"
    },
    {
      "code": 6033,
      "name": "referralAccountAlreadyExists",
      "msg": "Referral account already exists for this code"
    },
    {
      "code": 6034,
      "name": "tokenMintMismatch",
      "msg": "Token mint mismatch between accounts"
    },
    {
      "code": 6035,
      "name": "transferHookNotSupported",
      "msg": "Token-2022 TransferHook mints are not currently supported"
    },
    {
      "code": 6036,
      "name": "distinctPubKeysRequired",
      "msg": "Distinct Pubkeys required!"
    },
    {
      "code": 6037,
      "name": "invalidFeatureFlags",
      "msg": "Invalid feature flags"
    },
    {
      "code": 6038,
      "name": "hasActivePolicies",
      "msg": "Cannot delete user payment with active policies"
    },
    {
      "code": 6039,
      "name": "invalidRentPayer",
      "msg": "Invalid rent payer"
    },
    {
      "code": 6040,
      "name": "invalidForwardProgram",
      "msg": "Forward program not whitelisted"
    },
    {
      "code": 6041,
      "name": "invalidValidationProgram",
      "msg": "Validation program not whitelisted"
    },
    {
      "code": 6042,
      "name": "byteRangeCheckFailed",
      "msg": "Byte range check failed"
    },
    {
      "code": 6043,
      "name": "insufficientOutputAmount",
      "msg": "Insufficient output amount after forward CPI"
    },
    {
      "code": 6044,
      "name": "composableNotEnabled",
      "msg": "Composable policies not enabled for this gateway"
    },
    {
      "code": 6045,
      "name": "insufficientByteRangeChecks",
      "msg": "Must have at least one byte range check"
    },
    {
      "code": 6046,
      "name": "validationPdaMismatch",
      "msg": "Validation PDA does not match derived address"
    },
    {
      "code": 6047,
      "name": "validationDataTooLarge",
      "msg": "Validation data exceeds maximum size"
    },
    {
      "code": 6048,
      "name": "validationDataRequired",
      "msg": "Validation program set but no data provided"
    },
    {
      "code": 6049,
      "name": "validationNotRequired",
      "msg": "Validation not configured but data was provided"
    },
    {
      "code": 6050,
      "name": "composablePolicyNotFound",
      "msg": "Composable policy not found"
    },
    {
      "code": 6051,
      "name": "discriminatorCheckRequired",
      "msg": "At least one ByteRangeCheck must start at offset 0 to pin the instruction selector"
    },
    {
      "code": 6052,
      "name": "unauthorizedInitializer",
      "msg": "Only the upgrade authority can initialize the program"
    },
    {
      "code": 6053,
      "name": "intermediateAccountMismatch",
      "msg": "Intermediate token account address does not match the derived ATA"
    },
    {
      "code": 6054,
      "name": "missingForwardAccounts",
      "msg": "Forward CPI requires at least one remaining account"
    },
    {
      "code": 6055,
      "name": "forwardProducedNoOutput",
      "msg": "Forward CPI produced no output (intermediate output balance is zero)"
    }
  ],
  "types": [
    {
      "name": "byteRangeCheck",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "offset",
            "type": "u8"
          },
          {
            "name": "length",
            "type": "u8"
          },
          {
            "name": "expected",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "composableExecuted",
      "docs": [
        "An event that is thrown when a composable policy is executed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "composablePolicy",
            "type": "pubkey"
          },
          {
            "name": "gateway",
            "type": "pubkey"
          },
          {
            "name": "targetProgram",
            "type": "pubkey"
          },
          {
            "name": "inputAmount",
            "type": "u64"
          },
          {
            "name": "outputAmount",
            "type": "u64"
          },
          {
            "name": "gatewayFee",
            "type": "u64"
          },
          {
            "name": "protocolFee",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "recordId",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "composablePolicy",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "userPayment",
            "type": "pubkey"
          },
          {
            "name": "gateway",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "policyStatus"
              }
            }
          },
          {
            "name": "rentPayer",
            "type": "pubkey"
          },
          {
            "name": "schedule",
            "type": {
              "defined": {
                "name": "scheduleType"
              }
            }
          },
          {
            "name": "forwardConfig",
            "type": {
              "defined": {
                "name": "forwardConfig"
              }
            }
          },
          {
            "name": "validationConfig",
            "type": {
              "defined": {
                "name": "validationConfig"
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
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "totalInput",
            "type": "u64"
          },
          {
            "name": "totalOutput",
            "type": "u64"
          },
          {
            "name": "paymentCount",
            "type": "u32"
          },
          {
            "name": "policyId",
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
            "name": "padding",
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
      "name": "composablePolicyCreated",
      "docs": [
        "An event that is thrown when a composable policy is created"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "composablePolicy",
            "type": "pubkey"
          },
          {
            "name": "userPayment",
            "type": "pubkey"
          },
          {
            "name": "gateway",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "policyId",
            "type": "u32"
          },
          {
            "name": "schedule",
            "type": {
              "defined": {
                "name": "scheduleType"
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
            "name": "forwardConfig",
            "type": {
              "defined": {
                "name": "forwardConfig"
              }
            }
          },
          {
            "name": "validationConfig",
            "type": {
              "defined": {
                "name": "validationConfig"
              }
            }
          },
          {
            "name": "hasValidationPda",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "composablePolicyDeleted",
      "docs": [
        "An event that is thrown when a composable policy is deleted"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "composablePolicy",
            "type": "pubkey"
          },
          {
            "name": "userPayment",
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
      "name": "composablePolicyStatusChanged",
      "docs": [
        "An event that is thrown when a composable policy status is changed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "composablePolicy",
            "type": "pubkey"
          },
          {
            "name": "oldStatus",
            "type": {
              "defined": {
                "name": "policyStatus"
              }
            }
          },
          {
            "name": "newStatus",
            "type": {
              "defined": {
                "name": "policyStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "forwardConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "targetProgram",
            "type": "pubkey"
          },
          {
            "name": "inputMint",
            "type": "pubkey"
          },
          {
            "name": "outputMint",
            "type": "pubkey"
          },
          {
            "name": "minOutputAmount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "forwardFlags",
            "type": "u8"
          },
          {
            "name": "numDataChecks",
            "type": "u8"
          },
          {
            "name": "dataChecks",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "byteRangeCheck"
                  }
                },
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "gatewayFeeBpsChanged",
      "docs": [
        "An event that is thrown when a gateway fee bps is changed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gateway",
            "type": "pubkey"
          },
          {
            "name": "oldFeeBps",
            "type": "u16"
          },
          {
            "name": "newFeeBps",
            "type": "u16"
          }
        ]
      }
    },
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
              "Bit 0: Referral program enabled (1 = enabled, 0 = disabled)",
              "Bit 1: Net amount mode (1 = net, 0 = gross/default)",
              "Bit 2: Custom protocol fee enabled (1 = enabled, 0 = disabled)"
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
            "name": "customProtocolFeeBps",
            "docs": [
              "Custom protocol fee in basis points (bps). Only used if use_custom_protocol_fee flag is set.",
              "When enabled, this overrides the default 100 bps protocol fee."
            ],
            "type": "u16"
          },
          {
            "name": "padding",
            "docs": [
              "Padding for future fields"
            ],
            "type": {
              "array": [
                "u8",
                117
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
            "name": "rentPayer",
            "docs": [
              "Account that paid rent for this account (receives rent on close)"
            ],
            "type": "pubkey"
          },
          {
            "name": "padding",
            "docs": [
              "Reserved space for future extensions"
            ],
            "type": {
              "array": [
                "u8",
                223
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
          },
          {
            "name": "payer",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
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
      "name": "policyStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "paused"
          },
          {
            "name": "completed"
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
            "name": "deprecated",
            "docs": [
              "DEPRECATED: Maximum number of active policies allowed per user. Attention tumbstone!"
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
        "The PDA derivation uses gateway pubkey and referral_code to ensure uniqueness:",
        "PDA seeds: [\"referral\", gateway_pubkey, referral_code]",
        "",
        "Uses zero_copy for efficient mutable access during payment execution."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
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
            "name": "paddingCode",
            "docs": [
              "Padding for alignment (referrer is 32 bytes, needs 8-byte alignment)"
            ],
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "referrer",
            "docs": [
              "Referrer who brought this user (for chain traversal). Might be the default Pubkey"
            ],
            "type": "pubkey"
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
            "name": "paddingBump",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
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
      "name": "scheduleType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "timed",
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
                "name": "maxExecutions",
                "type": {
                  "option": "u32"
                }
              },
              {
                "name": "frequency",
                "type": {
                  "defined": {
                    "name": "paymentFrequency"
                  }
                }
              },
              {
                "name": "nextExecutionDue",
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
                "name": "amounts",
                "type": {
                  "array": [
                    "u64",
                    4
                  ]
                }
              },
              {
                "name": "timestamps",
                "type": {
                  "array": [
                    "i64",
                    4
                  ]
                }
              },
              {
                "name": "current",
                "type": "u8"
              },
              {
                "name": "releaseCondition",
                "type": "u8"
              },
              {
                "name": "total",
                "type": "u8"
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
            "name": "usage",
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
      "name": "updateGatewayFeatureFlagsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "featureFlags",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "updateGatewayProtocolFeeArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "useCustomProtocolFee",
            "docs": [
              "Optional: Enable or disable custom protocol fee feature (bit 2)"
            ],
            "type": "bool"
          },
          {
            "name": "customProtocolFeeBps",
            "docs": [
              "Optional custom protocol fee in basis points (bps). Only used if feature is enabled."
            ],
            "type": "u16"
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
              "Optional feature flags to update (bit 0 = referral program enabled, bit 1 = net mode)",
              "Bit 2 (custom protocol fee) is reserved for protocol admin and cannot be modified here"
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
            "name": "rentPayer",
            "docs": [
              "Account that paid rent for this account (receives rent on close)"
            ],
            "type": "pubkey"
          },
          {
            "name": "activeComposableCount",
            "type": "u32"
          },
          {
            "name": "createdComposableCount",
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
                210
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
    },
    {
      "name": "userPaymentDeleted",
      "docs": [
        "An event that is thrown when a user payment account is deleted"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userPayment",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "rentPayer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "validationConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "validationProgram",
            "type": "pubkey"
          },
          {
            "name": "numValidationAccounts",
            "type": "u8"
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
