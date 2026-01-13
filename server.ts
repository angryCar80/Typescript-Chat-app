import chalk from "chalk";
import net from "node:net";

enum State {
  Online,
  Away,
  Busy,
}

type Client = {
  socket: net.Socket;
  username: string;
  status: State;
};

const clients: Client[] = [];

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

  socket.on("data", (data) => {
    const message = data.toString().trim();

    if (!username) {
      username = message;
      clients.push({ socket, username, status });

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
      if (clientIndex !== -1) {
        clients[clientIndex].status = status;
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
          "│ " + chalk.yellow("/clear") + "             Clear screen\n",
        ),
      );
      socket.write(
        chalk.cyan("│ " + chalk.yellow("/exit") + "              Exit chat\n"),
      );
      socket.write(chalk.cyan("│\n"));
      // socket.write(chalk.cyan.bold("╰─────────────────────────╯\n"));
      return;
    }
    if (message.startsWith("/dm")) {
      const parts = message.slice(3).trim().split(" ");
      const targetUser = parts[0];
      const dmMessage = parts.slice(1).join(" ");

      const recipient = clients.find((c) => c.username === targetUser);
      if (recipient) {
        recipient.socket.write(
          chalk.magenta(`[DM from ${chalk.bold(username)}]: ${dmMessage}\n`),
        );
        socket.write(
          chalk.magenta(`[DM to ${chalk.bold(targetUser)}]: ${dmMessage}\n`),
        );
      } else {
        socket.write(chalk.red(`X User "${targetUser}" not found\n`));
      }
      return;
    }

    broadcast(chalk.white(`${chalk.cyan(username)}: ${message}\n`), socket);
  });
  socket.on("end", () => {
    const index = clients.findLastIndex((c) => c.socket === socket);
    if (index != -1) {
      const user = clients[index];
      clients.splice(index, 1);
      broadcast(
        chalk.red(
          `← ${user?.username} ${getStatusEmoji(State.Online)} left the chat\n`,
        ),
        socket,
      );
    }
  });
});

function broadcast(message: string, sender: net.Socket) {
  for (const client of clients) {
    if (client.socket != sender) {
      client.socket.write(message);
    }
  }
}

server.listen(3000, () => {
  console.log("Chat server running on port 3000");
});
