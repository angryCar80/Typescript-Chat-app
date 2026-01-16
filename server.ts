import chalk from "chalk";
import { registerUser, loginUser } from "./src/auth";
import * as net from "node:net";
import { password } from "bun";

enum State {
  Online,
  Away,
  Busy,
}

type Room = {
  id: string;
  name: string;
  owner: string;
  members: string[];
  isPrivate: boolean;
  createdAt: Date;
  invitedUsers: string[];
};

type Client = {
  socket: net.Socket;
  username: string;
  status: State;
  blockedUsers: string[];
  currentRooms: string[];
  invitedRooms: string[];
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
};

const clients: Client[] = [];
const rooms: Room[] = [];
function createRoom(owner: string, name: string): Room {
  const room: Room = {
    id: generateRoomId(),
    name,
    owner,
    members: [owner],
    isPrivate: true,
    createdAt: new Date(),
    invitedUsers: [],
  };
  return room;
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8);
}

function getRoomById(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}
function getRoomByName(name: string): Room | undefined {
  return rooms.find((r) => r.name === name);
}

function addUserToRoom(roomId: string, username: string): boolean {
  const room = getRoomById(roomId);
  if (!room) return false;

  if (!room.members.includes(username)) {
    room.members.push(username);
    room.invitedUsers = room.invitedUsers.filter((u) => u !== username);
    return true;
  }
  return false;
}

function removeUserFromRoom(roomId: string, username: string): boolean {
  const room = getRoomById(roomId);
  if (!room) return false;

  room.members = room.members.filter((u) => u !== username);
  return true;
}

function getStatusEmoji(status: State): string {
  switch (status) {
    case State.Online:
      return chalk.green.bold("●");
    case State.Away:
      return chalk.yellow.bold("●");
    case State.Busy:
      return chalk.red.bold("●");
  }
}

const server = net.createServer((socket) => {
  socket.write(chalk.cyan.bold("\n╔════════════════════════════════════╗\n"));
  socket.write(chalk.cyan.bold("║        Welcome to Chat Room        ║\n"));
  socket.write(chalk.cyan.bold("╚════════════════════════════════════╝\n\n"));
  socket.write(chalk.yellow.bold("Enter username: "));

  let username = "";
  let status = State.Online;

  socket.on("data", async (data) => {
    const message = data.toString().trim();

    if (!username) {
      username = message;
      clients.push({
        socket,
        username,
        status,
        blockedUsers: [],
        currentRooms: [],
        invitedRooms: [],
        isAuthenticated: false,
      });

      socket.write(
        chalk.bgGreen.black(
          ` ✓ Welcome ${username}! Type /help for commands. \n\n`,
        ),
      );
      broadcast(
        chalk.green(
          `→ ${username} ${getStatusEmoji(State.Online)} joined the chat\n`,
        ),
        socket,
      );
      return;
    }
    if (message.startsWith("/createroom")) {
      const roomName = message.slice(11).trim();
      if (!roomName) {
        socket.write(chalk.red("✗ Usage: /createroom <room-name>\n"));
        return;
      }

      const existingRoom = getRoomByName(roomName);
      if (existingRoom) {
        socket.write(chalk.red(`✗ Room "${roomName}" already exists\n`));
        return;
      }

      const room = createRoom(username, roomName);
      rooms.push(room);

      const clientIndex = clients.findIndex((c) => c.socket === socket);
      if (clientIndex !== -1) {
        clients[clientIndex]!.currentRooms.push(room.id);
      }

      socket.write(
        chalk.green(
          `✓ Created room "${chalk.bold(roomName)}" (ID: ${room.id})\n`,
        ),
      );
      return;
    }

    if (message.startsWith("/invite")) {
      const parts = message.slice(7).trim().split(" ");
      const targetUser = parts[0];
      const roomIdentifier = parts[1];

      if (!targetUser || !roomIdentifier) {
        socket.write(chalk.red("✗ Usage: /invite <user> <room-name-or-id>\n"));
        return;
      }

      const room = getRoomByName(roomIdentifier) || getRoomById(roomIdentifier);
      if (!room) {
        socket.write(chalk.red(`✗ Room "${roomIdentifier}" not found\n`));
        return;
      }

      if (room.owner !== username) {
        socket.write(chalk.red(`✗ Only room owner can invite users\n`));
        return;
      }

      const targetClient = clients.find((c) => c.username === targetUser);
      if (!targetClient) {
        socket.write(chalk.red(`✗ User "${targetUser}" not found\n`));
        return;
      }

      if (room.members.includes(targetUser)) {
        socket.write(chalk.red(`✗ ${targetUser} is already in the room\n`));
        return;
      }

      room.invitedUsers.push(targetUser);
      const targetClientIndex = clients.findIndex(
        (c) => c.socket === targetClient.socket,
      );
      if (targetClientIndex !== -1) {
        clients[targetClientIndex]!.invitedRooms.push(room.id);
      }

      targetClient.socket.write(
        chalk.yellow(
          `→ You've been invited to room "${chalk.bold(room.name)}" by ${username}\n`,
        ),
      );
      targetClient.socket.write(
        chalk.cyan(`  Type "/join ${room.id}" to accept\n`),
      );
      socket.write(
        chalk.green(`✓ Invited ${targetUser} to room "${room.name}"\n`),
      );
      return;
    }

    if (message.startsWith("/join")) {
      const roomId = message.slice(5).trim();
      if (!roomId) {
        socket.write(chalk.red("✗ Usage: /join <room-id>\n"));
        return;
      }

      const room = getRoomById(roomId);
      if (!room) {
        socket.write(chalk.red(`✗ Room with ID "${roomId}" not found\n`));
        return;
      }

      const clientIndex = clients.findIndex((c) => c.socket === socket);
      if (clientIndex === -1) return;

      const client = clients[clientIndex];
      if (!client) return;

      if (!room.invitedUsers.includes(username) && room.owner !== username) {
        socket.write(chalk.red(`✗ You haven't been invited to this room\n`));
        return;
      }

      if (addUserToRoom(roomId, username)) {
        client.currentRooms.push(roomId);
        client.invitedRooms = client.invitedRooms.filter((id) => id !== roomId);

        socket.write(chalk.green(`✓ Joined room "${chalk.bold(room.name)}"\n`));
        roomBroadcast(
          chalk.cyan(`→ ${username} joined the room\n`),
          roomId,
          socket,
        );
      }
      return;
    }

    if (message.startsWith("/leave")) {
      const roomId = message.slice(6).trim();
      if (!roomId) {
        socket.write(chalk.red("✗ Usage: /leave <room-id>\n"));
        return;
      }

      const room = getRoomById(roomId);
      if (!room) {
        socket.write(chalk.red(`✗ Room with ID "${roomId}" not found\n`));
        return;
      }

      const clientIndex = clients.findIndex((c) => c.socket === socket);
      if (clientIndex === -1) return;

      const client = clients[clientIndex];
      if (!client) return;

      if (!client.currentRooms.includes(roomId)) {
        socket.write(chalk.red(`✗ You're not in room "${room.name}"\n`));
        return;
      }

      if (removeUserFromRoom(roomId, username)) {
        client.currentRooms = client.currentRooms.filter((id) => id !== roomId);

        socket.write(chalk.green(`✓ Left room "${chalk.bold(room.name)}"\n`));
        roomBroadcast(
          chalk.cyan(`← ${username} left the room\n`),
          roomId,
          socket,
        );

        if (room.members.length === 0) {
          const roomIndex = rooms.findIndex((r) => r.id === roomId);
          if (roomIndex !== -1) {
            rooms.splice(roomIndex, 1);
          }
        }
      }
      return;
    }

    if (message === "/roomlist") {
      const clientIndex = clients.findIndex((c) => c.socket === socket);
      if (clientIndex === -1) return;

      const client = clients[clientIndex];
      if (!client) return;

      const userRooms = rooms.filter((r) => client.currentRooms.includes(r.id));
      const invitedRooms = rooms.filter((r) =>
        client.invitedRooms.includes(r.id),
      );

      let output = chalk.cyan.bold("\n╭─ Your Rooms ─╮\n");

      if (userRooms.length > 0) {
        output += chalk.green("\n  Joined Rooms:\n");
        userRooms.forEach((room) => {
          const memberCount = room.members.length;
          output += chalk.cyan(
            `    • ${chalk.bold(room.name)} (${room.id}) - ${memberCount} members\n`,
          );
        });
      }

      if (invitedRooms.length > 0) {
        output += chalk.yellow("\n  Pending Invitations:\n");
        invitedRooms.forEach((room) => {
          output += chalk.cyan(
            `    • ${chalk.bold(room.name)} (${room.id}) - from ${room.owner}\n`,
          );
        });
      }

      if (userRooms.length === 0 && invitedRooms.length === 0) {
        output += chalk.gray("  No rooms found\n");
      }

      output += chalk.cyan("╰─────────────╯\n");
      socket.write(output);
      return;
    }

    if (message.startsWith("/roommsg")) {
      const parts = message.slice(8).trim().split(" ");
      const roomIdentifier = parts[0];
      const roomMessage = parts.slice(1).join(" ");

      if (!roomIdentifier || !roomMessage) {
        socket.write(
          chalk.red("✗ Usage: /roommsg <room-name-or-id> <message>\n"),
        );
        return;
      }

      const room = getRoomByName(roomIdentifier) || getRoomById(roomIdentifier);
      if (!room) {
        socket.write(chalk.red(`✗ Room "${roomIdentifier}" not found\n`));
        return;
      }

      const clientIndex = clients.findIndex((c) => c.socket === socket);
      if (clientIndex === -1) return;

      const client = clients[clientIndex];
      if (!client) return;

      if (!client.currentRooms.includes(room.id)) {
        socket.write(chalk.red(`✗ You're not in room "${room.name}"\n`));
        return;
      }

      roomBroadcast(
        chalk.white(
          `[${chalk.cyan(room.name)}] ${chalk.bold(username)}: ${roomMessage}\n`,
        ),
        room.id,
        socket,
      );
      return;
    }

    if (message.startsWith("/setstatus")) {
      const parts: string[] = message.slice(11).trim().split(" ");
      const newStatus = parts[0]?.toLowerCase();

      if (newStatus === "online") {
        status = State.Online;
      } else if (newStatus === "away") {
        status = State.Away;
      } else if (newStatus === "busy") {
        status = State.Busy;
      } else {
        socket.write(chalk.red("Invalid status. Use: online, away, or busy\n"));
        return;
      }
      const clientIndex: number = clients.findIndex((c) => c.socket === socket);

      let clientsStatus = clients[clientIndex];
      if (clientIndex !== -1) {
        clientsStatus!.status = status;
        socket.write(
          chalk.yellow(
            `✓ Status changed to: ${newStatus} ${getStatusEmoji(status)}\n`,
          ),
        );
        broadcast(
          chalk.yellow(
            `→ ${username} is now ${newStatus} ${getStatusEmoji(status)}\n`,
          ),
          socket,
        );
      } else {
        socket.write(chalk.red("✗ Error updating status\n"));
      }
      return;
    }
    if (message === "/users") {
      const userList = clients
        .map(
          (c) =>
            `  ${getStatusEmoji(c.status)} ${chalk.bold(c.username)} (${State[c.status]})`,
        )
        .join("\n");
      socket.write(
        chalk.cyan(
          `\n╭─ Online Users (${clients.length}) ─╮\n${userList}\n╰──────────────────╯\n`,
        ),
      );
      return;
    }
    if (message === "/help") {
      socket.write(chalk.cyan.bold("\n╭── Available Commands ──╮\n"));
      socket.write(chalk.cyan("│\n"));
      socket.write(
        chalk.cyan(
          "│ " +
            chalk.yellow("/users") +
            "              See all online users with status\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " +
            chalk.yellow("/dm <user> <msg>") +
            "     Send private message\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " +
            chalk.yellow("/setstatus <status>") +
            " Set status (online/away/busy)\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " + chalk.yellow("/block <user>") + "        Block a user\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " + chalk.yellow("/unblock <user>") + "      Unblock a user\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " + chalk.yellow("/clear") + "             Clear screen\n",
        ),
      );
      socket.write(
        chalk.cyan("│ " + chalk.yellow("/exit") + "              Exit chat\n"),
      );
      socket.write(chalk.cyan("│\n"));
      socket.write(chalk.cyan.bold("│ Auth Commands:\n"));
      socket.write(chalk.cyan("│\n"));
      socket.write(
        chalk.cyan(
          "│ " +
            chalk.yellow("/register <user> <email> <pass>") +
            " Create account\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " + chalk.yellow("/login <user> <pass>") + "      Authenticate\n",
        ),
      );
      socket.write(chalk.cyan("│\n"));
      socket.write(chalk.cyan.bold("│ Room Commands:\n"));
      socket.write(chalk.cyan("│\n"));
      socket.write(
        chalk.cyan(
          "│ " + chalk.yellow("/createroom <name>") + "  Create private room\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " +
            chalk.yellow("/invite <user> <room>") +
            " Invite user to room\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " +
            chalk.yellow("/join <room-id>") +
            "      Accept room invitation\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " + chalk.yellow("/leave <room-id>") + "     Leave room\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " + chalk.yellow("/roomlist") + "           Show your rooms\n",
        ),
      );
      socket.write(
        chalk.cyan(
          "│ " +
            chalk.yellow("/roommsg <room> <msg>") +
            " Send message to room\n",
        ),
      );
      socket.write(chalk.cyan("│\n"));
      socket.write(chalk.cyan.bold("╰─────────────────────────╯\n"));
      return;
    }
    if (message.startsWith("/dm")) {
      const parts = message.slice(3).trim().split(" ");
      const targetUser = parts[0];
      const dmMessage = parts.slice(1).join(" ");

      const recipient = clients.find((c) => c.username === targetUser);
      if (!recipient) {
        socket.write(chalk.red(`✗ User "${targetUser}" not found\n`));
        return;
      }

      if (recipient.blockedUsers.includes(username)) {
        socket.write(chalk.red(`✗ ${targetUser} has blocked you\n`));
        return;
      }

      recipient.socket.write(
        chalk.magenta(`[DM from ${chalk.bold(username)}]: ${dmMessage}\n`),
      );
      socket.write(
        chalk.magenta(`[DM to ${chalk.bold(targetUser)}]: ${dmMessage}\n`),
      );
      return;
    }
    if (message.startsWith("/register")) {
      const parts = message.slice(9).trim().split(" ");
      const regUsername = parts[0];
      const email = parts[1];
      const password = parts[2];

      if (!regUsername || !email || !password) {
        socket.write(
          chalk.red("✗ Usage: /register <username> <email> <password>\n"),
        );
        return;
      }

      // Check if user is already authenticated
      const clientIndex = clients.findIndex((c) => c.socket === socket);
      if (clientIndex !== -1 && clients[clientIndex]?.isAuthenticated) {
        socket.write(chalk.red("✗ You are already registered and logged in\n"));
        return;
      }

      // Attempt registration
      const result = await registerUser(regUsername, email, password);

      if (result.success) {
        socket.write(
          chalk.green(`✓ Registration successful! Welcome ${regUsername}!\n`),
        );
        socket.write(chalk.cyan("You can now use /login to authenticate\n"));
      } else {
        socket.write(chalk.red(`✗ Registration failed: ${result.error}\n`));
      }
      return;
    }
    if (message.startsWith("/login")) {
      const parts = message.slice(9).trim().split(" ");
      const loginUsername = parts[0];
      const password = parts[1];

      if (!loginUsername || !password) {
        socket.write(chalk.red("✗ Usage: /login <username> <password>\n"));
        return;
      }

      // Check if user is already authenticated
      const clientIndex = clients.findIndex((c) => c.socket === socket);
      if (clientIndex !== -1 && clients[clientIndex]?.isAuthenticated) {
        socket.write(chalk.red("✗ You are already logged in\n"));
        return;
      }

      // Attempt login
      const result = await loginUser(loginUsername, password);

      if (result.success) {
        // Update client with authenticated user data
        if (clientIndex !== -1) {
          const currentClient = clients[clientIndex];
          if (currentClient) {
            currentClient.isAuthenticated = true;
            currentClient.userId = result.user?.id;
            currentClient.email = result.user?.email;
            currentClient.username = result.user?.username || loginUsername;
          }
        }

        socket.write(
          chalk.green(`✓ Login successful! Welcome back ${loginUsername}!\n`),
        );
        broadcast(
          chalk.green(
            `→ ${loginUsername} ${getStatusEmoji(State.Online)} authenticated and joined the chat\n`,
          ),
          socket,
        );
      } else {
        socket.write(chalk.red(`✗ Login failed: ${result.error}\n`));
      }
      return;
    }
    if (message === "/logout") {
    }
    if (message.startsWith("/block")) {
      const targetUser = message.slice(6).trim();
      const clientIndex = clients.findIndex((c) => c.socket === socket);

      if (clientIndex === -1) {
        socket.write(chalk.red("✗ Error: User not found\n"));
        return;
      }

      if (targetUser === username) {
        socket.write(chalk.red("✗ You can't block yourself\n"));
        return;
      }

      const userExists = clients.some((c) => c.username === targetUser);
      if (!userExists) {
        socket.write(chalk.red(`✗ User "${targetUser}" not found\n`));
        return;
      }

      if (clients[clientIndex]!.blockedUsers.includes(targetUser)) {
        socket.write(chalk.yellow(`You already blocked ${targetUser}\n`));
        return;
      }

      clients[clientIndex]!.blockedUsers.push(targetUser);
      socket.write(chalk.green(`✓ You blocked ${chalk.bold(targetUser)}\n`));
      return;
    }
    if (message.startsWith("/unblock")) {
      const targetUser = message.slice(8).trim();
      const clientIndex = clients.findIndex((c) => c.socket === socket);

      if (clientIndex === -1) {
        socket.write(chalk.red("✗ Error: User not found\n"));
        return;
      }

      const blockedIndex =
        clients[clientIndex]!.blockedUsers.indexOf(targetUser);
      if (blockedIndex === -1) {
        socket.write(chalk.red(`✗ User "${targetUser}" is not blocked\n`));
        return;
      }

      clients[clientIndex]!.blockedUsers.splice(blockedIndex, 1);
      socket.write(chalk.green(`✓ You unblocked ${chalk.bold(targetUser)}\n`));
      return;
    }
    if (message === "/whoami") {
      socket.write(`You are: username:${username}, password:${password}`);
    }

    broadcast(chalk.white(`${chalk.cyan(username)}: ${message}\n`), socket);
  });
  socket.on("end", () => {
    const index = clients
      .slice()
      .reverse()
      .findIndex((c) => c.socket === socket);
    if (index != -1) {
      const actualIndex = clients.length - 1 - index;
      const user = clients[actualIndex];

      // Remove user from all rooms
      if (user) {
        user.currentRooms.forEach((roomId) => {
          const room = getRoomById(roomId);
          if (room) {
            removeUserFromRoom(roomId, user.username);
            roomBroadcast(
              chalk.red(`← ${user.username} left the room\n`),
              roomId,
              socket,
            );

            // Clean up empty rooms
            if (room.members.length === 0) {
              const roomIndex = rooms.findIndex((r) => r.id === roomId);
              if (roomIndex !== -1) {
                rooms.splice(roomIndex, 1);
              }
            }
          }
        });
      }

      clients.splice(actualIndex, 1);
      broadcast(
        chalk.red(
          `← ${user?.username} ${getStatusEmoji(State.Online)} left the chat\n`,
        ),
        socket,
      );
    }
  });
});

function broadcast(message: string, sender: net.Socket, roomId?: string) {
  const senderClient = clients.find((c) => c.socket === sender);

  for (const client of clients) {
    // Skip sender and blocked users
    if (
      client.socket === sender ||
      client.blockedUsers.includes(senderClient?.username || "")
    ) {
      continue;
    }

    // If roomId specified, only send to room members
    if (roomId) {
      if (client.currentRooms.includes(roomId)) {
        client.socket.write(message);
      }
    } else {
      // Regular broadcast to all non-blocked users
      client.socket.write(message);
    }
  }
}
function roomBroadcast(message: string, roomId: string, sender: net.Socket) {
  broadcast(message, sender, roomId);
}

server.listen(3000, () => {
  console.log(chalk.green("Chat server running on port 3000"));
});

server.on("error", (err) => {
  console.error("Server error:", err);
});
