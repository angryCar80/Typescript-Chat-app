import net from "node:net";
import readline from "node:readline";
import chalk from "chalk";

const PORT: number = 3000;

const socket = net.createConnection({ port: PORT });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

socket.on("data", (data) => {
  console.log("\n" + data.toString());
  rl.setPrompt(chalk.cyan.bold("> "));
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
        console.log(chalk.yellow("\n✓ Goodbye!\n"));
        process.exit(0);
      case "dm":
        if (args.length >= 2) {
          const username = args[0];
          const message = args.slice(1).join(" ");
          socket.write(`/dm ${username} ${message}`);
        } else {
          console.log(chalk.red("✗ Usage: /dm <username> <message>"));
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
          console.log(chalk.red("✗ Usage: /setstatus <online|away|busy>"));
        }
        break;
      case "block":
        if (args.length >= 1) {
          const targetUser = args[0];
          socket.write(`/block ${targetUser}`);
        } else {
          console.log(chalk.red("✗ Usage: /block <username>"));
        }
        break;
      case "unblock":
        if (args.length >= 1) {
          const targetUser = args[0];
          socket.write(`/unblock ${targetUser}`);
        } else {
          console.log(chalk.red("✗ Usage: /unblock <username>"));
        }
        break;
      default:
        console.log(chalk.yellow(`✗ Unknown command: ${command}`));
        console.log(chalk.gray("   Type '/help' for available commands\n"));
    }
  } else {
    socket.write(input);
  }
});

socket.on("end", () => {
  console.log(chalk.red("\n✗ Disconnected from server"));
  process.exit(0);
});
