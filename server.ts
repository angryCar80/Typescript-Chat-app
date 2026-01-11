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
    broadcast(`${username}: ${message}\n`, socket);
  });
  socket.on("end", () => {
    const index = clients.findLastIndex((c) => c.socket === socket);
    if (index != -1) {
      const user = clients[index];
      clients.slice(index, 1);
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
