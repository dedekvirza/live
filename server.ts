import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Track connected peers
  const peers: { [id: string]: { id: string; role: 'host' | 'source'; name: string } } = {};

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join", ({ role, name }: { role: 'host' | 'source'; name: string }) => {
      peers[socket.id] = { id: socket.id, role, name };
      
      // Notify everyone about the new peer
      io.emit("peers-update", Object.values(peers));
      
      if (role === 'host') {
        socket.join('host-room');
      } else {
        socket.join('source-room');
        // Tell the host a new source is available
        io.to('host-room').emit("source-joined", { id: socket.id, name });
      }
    });

    socket.on("signal", ({ targetId, signal }: { targetId: string; signal: any }) => {
      io.to(targetId).emit("signal", { senderId: socket.id, signal });
    });

    socket.on("broadcast-status", (status: any) => {
      // Host broadcasts the switcher status to all sources or viewers
      socket.broadcast.emit("switcher-status", status);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      const peer = peers[socket.id];
      delete peers[socket.id];
      io.emit("peers-update", Object.values(peers));
      if (peer?.role === 'source') {
        io.to('host-room').emit("source-left", socket.id);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
