import { Response } from "express";

interface Client {
  response: Response;
  userId: string;
  gameId?: string;
}

const clients = new Map<string, Client>();
let nextClientId = 0;

function addClient(resp: Response, userId: string): string {
  const id = nextClientId++;

  resp.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  // xxx
  resp.write("\n\n");
}

function broadcast(data: object, pred?: (client: Client) => boolean): void {
  if (!pred) {
    pred = () => true;
  }

  const msg = `data: ${JSON.stringify(data)}\n\n`;

  for (const [, client] of clients) {
    if (pred(client)) {
      client.response.write(msg);
    }
  }
}
