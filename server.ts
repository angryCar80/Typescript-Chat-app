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
const server = net.createServer((socket) => {
  socket.write(chalk.yellow.bold("Enter username: "));

  let username = "";
  let status = State.Online;

  socket.on("data", (data) => {
    const message = data.toString().trim();

    if (!username) {
      username = message;
      clients.push({ socket, username, status });

      socket.write(
        chalk.bgWhite.black(` Welcome ${username}! You can start chatting. \n`),
      );
      broadcast(chalk.green.bold(`→ ${username} joined the chat\n`), socket);
      return;
    }
    if (message.startsWith("/setstatus")) {
      const parts: string[] = message.slice(10).trim().split(" ");
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
        socket.write(chalk.yellow(`Status changed to: ${newStatus}\n`));
        broadcast(chalk.yellow(`→ ${username} is now ${newStatus}\n`), socket);
      } else {
        socket.write(chalk.red("Error updating status\n"));
      }
      return;
    }
    if (message === "/users") {
      const userList = clients
        .map((c) => `${c.username} (${State[c.status]})`)
        .join("\n");
      socket.write(chalk.cyan(`Online users: \n${userList}\n`));
      return;
    }
    if (message === "/help") {
      socket.write(chalk.blue("\nHow To Use Commandes: \n"));
      socket.write(
        chalk.blue("Every Chat Command Starts With '/' character   "),
      );
      socket.write(chalk.blue(" so you can say /clear: to clear the screen"));
      socket.write(chalk.blue(" you can say /users: to see online users"));
      socket.write(
        chalk.blue(
          "you can say /dm <username> <message>: to send private message to a users",
        ),
      );
      socket.write(chalk.whiteBright("\n/help: current screen"));
      return;
    }
    if (message.startsWith("/dm")) {
      const parts = message.slice(4).trim().split(" ");
      const targetUser = parts[0];
      const dmMessage = parts.slice(1).join(" ");

      const recipient = clients.find((c) => c.username === targetUser);
      if (recipient) {
        recipient.socket.write(
          chalk.blue(`[DM from ${username}]: ${dmMessage}\n`),
        );
        socket.write(chalk.blue(`[DM to ${targetUser}]: ${dmMessage}\n`));
      } else {
        socket.write(chalk.red(`User "${targetUser}" not found\n`));
      }
      return;
    }

    broadcast(`${username}: ${message}\n`, socket);
  });
  socket.on("end", () => {
    const index = clients.findLastIndex((c) => c.socket === socket);
    if (index != -1) {
      const user = clients[index];
      clients.splice(index, 1);
      broadcast(chalk.red.bold(`← ${user?.username} left the chat\n`), socket);
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
