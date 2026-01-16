#!/usr/bin/env node
import { registerUser, loginUser } from "./src/auth.js";

async function testAuth() {
  console.log("🧪 Testing Registration & Login...\n");

  // Test 1: Register a new user
  console.log("1️⃣ Testing registration:");
  const regResult = await registerUser("testuser", "test@example.com", "password123");
  console.log("   Result:", regResult);
  console.log("");

  // Test 2: Try to register same user again
  console.log("2️⃣ Testing duplicate registration:");
  const dupResult = await registerUser("testuser", "test2@example.com", "password123");
  console.log("   Result:", dupResult);
  console.log("");

  // Test 3: Login with correct credentials
  console.log("3️⃣ Testing successful login:");
  const loginResult = await loginUser("testuser", "password123");
  console.log("   Result:", loginResult);
  console.log("");

  // Test 4: Login with wrong password
  console.log("4️⃣ Testing failed login:");
  const failLoginResult = await loginUser("testuser", "wrongpassword");
  console.log("   Result:", failLoginResult);
  console.log("");

  console.log("✅ Auth system test complete!");
}

testAuth().catch(console.error);