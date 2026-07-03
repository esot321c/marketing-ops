type Client = { id: number; send: (event: string, data: unknown) => void };
const clients = new Set<Client>();
let nextId = 1;
export function addClient(send: Client["send"]): Client {
  const client: Client = { id: nextId++, send };
  clients.add(client);
  return client;
}
export function removeClient(client: Client) { clients.delete(client); }
export function broadcast(event: string, data: unknown) {
  for (const c of clients) c.send(event, data);
}
