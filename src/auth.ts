import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { db } from "./database.ts";

// Register user function
export async function registerUser(
  username: string,
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    // Validate input
    if (!username || username.length < 3 || username.length > 20) {
      return { success: false, error: "Username must be 3-20 characters" };
    }
    if (!email || !email.includes("@")) {
      return { success: false, error: "Valid email required" };
    }
    if (!password || password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert into database
    const stmt = db.prepare(
      "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
    );

    const userId = randomUUID();
    stmt.run(userId, username, email, passwordHash);

    return { success: true, userId };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return { success: false, error: "Username or email already exists" };
    }
    return { success: false, error: "Registration failed" };
  }
}

// Login user function
export async function loginUser(
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    // Find user in database
    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    const user = stmt.get(username) as any;

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return { success: false, error: "Invalid password" };
    }

    // Return user data without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    return { success: false, error: "Login failed" };
  }
}

// Logout user function
export async function logoutUser(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // In a simple implementation, logout just invalidates the session
    // This could be extended to manage sessions in a database or cache
    return { success: true };
  } catch (error) {
    return { success: false, error: "Logout failed" };
  }
}
