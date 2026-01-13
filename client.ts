import net from "node:net";
import readline from "node:readline";

const PORT: number = 3000;

const socket = net.createConnection({ port: PORT });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

socket.on("data", (data) => {
  console.log("\n" + data.toString());
  rl.setPrompt("> ");
  rl.prompt();
});

rl.on("line", (input) => {
  if (input.startsWith("/")) {
    const [command, ...args] = input.slice(1).split(" ");

    switch (command) {
      case "clear":
        console.clear();
        break;
      case "exit":
        process.exit(0);
      case "dm":
        if (args.length >= 2) {
          const username = args[0];
          const message = args.slice(1).join(" ");
          socket.write(`/dm ${username} ${message}`);
        } else {
          console.log("Usage: /dm <username> <message>");
        }
        break;
      case "users":
        socket.write("/users");
        break;
      case "help":
        socket.write("/help");
        break;
      case "setstatus":
        if (args.length >= 1) {
          const newStatus = args[0];
          socket.write(`/setstatus ${newStatus}`);
        } else {
          console.log("Usage: /setstatus <online|away|busy>");
        }
        break;
      default:
        console.log(`Unknown command: ${command}, try '/help' command`);
    }
  } else {
    socket.write(input);
  }
});

socket.on("end", () => {
  console.log("Disconnected from server");
  process.exit(0);
});
