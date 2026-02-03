// Test script to generate a subscription URL
const testData = {
  tm: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
  r: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", // Test recipient
  g: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", // Test gateway
  a: "5.5",
  ar: true,
  mr: "12",
  pf: "monthly",
  st: "null",
  tid: "test_trk_12345",
  li: JSON.stringify([
    { description: "API Access - Tier 1", quantity: 1, unitPrice: 5.5 }
  ])
};

// Encode as Base64URL
const jsonString = JSON.stringify(testData);
const base64 = Buffer.from(jsonString).toString("base64");
const urlSafe = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

console.log("Encoded data:", urlSafe);
console.log("\nFull URL:");
console.log(`http://localhost:5173/subscribe/${urlSafe}`);

// Also verify decoding
const padding = urlSafe.length % 4;
const padded = urlSafe + "=".repeat(padding === 0 ? 0 : 4 - padding);
const standardBase64 = padded.replace(/-/g, "+").replace(/_/g, "/");
const decodedJson = Buffer.from(standardBase64, "base64").toString("utf8");
const decoded = JSON.parse(decodedJson);

console.log("\nDecoded data:");
console.log(JSON.stringify(decoded, null, 2));
