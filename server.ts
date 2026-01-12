import chalk from "chalk";
import net from "node:net";

type Client = {
  socket: net.Socket;
  username: string;
};
const clients: Client[] = [];
const server = net.createServer((socket) => {
  socket.write(chalk.yellow.bold("Enter username: "));

  let username = "";

  socket.on("data", (data) => {
    const message = data.toString().trim();

    if (!username) {
      username = message;
      clients.push({ socket, username });

      socket.write(
        chalk.bgWhite.black(` Welcome ${username}! You can start chatting. \n`),
      );
      broadcast(chalk.green.bold(`→ ${username} joined the chat\n`), socket);
      return;
    }

    if (message === "/users") {
      const userList = clients.map((c) => c.username).join("\n");
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
