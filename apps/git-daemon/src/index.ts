import { Server, Connection, AuthContext, Session } from "ssh2";

// Basic Git SSH server shell configuration
const port = process.env.SSH_PORT ? parseInt(process.env.SSH_PORT) : 2222;

try {
  const server = new Server(
    {
      // Temporary host keys placeholder for initial compilation
      hostKeys: [],
    },
    (client: Connection) => {
      console.log("Incoming Git SSH client connection...");

      client
        .on("authentication", (ctx: AuthContext) => {
          // Authenticating SSH keys via Prisma database will be implemented in subsequent phase
          ctx.accept();
        })
        .on("ready", () => {
          client.on("session", (accept: any) => {
            const session: Session = accept();
            session.on("exec", (accept: any, reject: any, info: any) => {
              console.log(`Executing Git SSH command: ${info.command}`);
              const stream = accept();
              stream.stderr.write(
                "GitForge SSH transport mock interface active.\n",
              );
              stream.exit(0);
              stream.end();
            });
          });
        })
        .on("close", () => {
          console.log("Client SSH connection closed.");
        });
    },
  );

  server.listen(port, "0.0.0.0", () => {
    console.log(`GitForge Git-SSH Daemon listening on port ${port}`);
  });
} catch (err) {
  console.warn(
    "SSH server init deferred until host key certificates are generated:",
    err,
  );
}
