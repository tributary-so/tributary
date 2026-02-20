#!/usr/bin/env node

import "dotenv/config";
/**
 * Test database connection and queries
 * Usage: npx tsx src/test-db.ts
 */

import { getDb, closeDb } from "./db";
import { getUniqueEventNames, getEventCount, searchEvents } from "./db/queries";

async function testDatabase() {
  try {
    console.log("Testing database connection...");

    // Test 1: Get unique event names
    console.log("\n1. Testing getUniqueEventNames()...");
    const names = await getUniqueEventNames();
    console.log(
      `   Found ${names.length} unique event types:`,
      names.slice(0, 5)
    );

    // Test 2: Count all events
    console.log("\n2. Testing getEventCount()...");
    const count = await getEventCount();
    console.log(`   Total events in database: ${count}`);

    // Test 3: Query by event name (if any exist)
    if (names.length > 0) {
      console.log(
        `\n3. Testing getEventCount({ eventName: "${names[0]}" })...`
      );
      const typeCount = await getEventCount({ eventName: names[0] });
      console.log(`   Events of type "${names[0]}": ${typeCount}`);

      // Test 4: Get first event
      if (typeCount > 0) {
        console.log(
          `\n4. Testing searchEvents({ eventName: "${names[0]}" }, { limit: 1 })...`
        );
        const events = await searchEvents(
          { eventName: names[0] },
          { limit: 1 }
        );
        if (events.length > 0) {
          const event = events[0];
          console.log(
            `   First event signature: ${event.signature.substring(0, 16)}...`
          );
          console.log(`   First event slot: ${event.slot}`);
          console.log(
            `   First event timestamp: ${event.timestamp.toISOString()}`
          );
        }
      }
    }

    console.log("\n✅ All database tests passed!");
  } catch (error) {
    console.error("\n❌ Database test failed:", error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

testDatabase();
