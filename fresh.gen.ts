// DO NOT EDIT. This file is generated by fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import config from "./deno.json" assert { type: "json" };
import * as $0 from "./routes/[room].tsx";
import * as $1 from "./routes/api/login.ts";
import * as $2 from "./routes/api/logout.ts";
import * as $3 from "./routes/index.tsx";
import * as $4 from "./routes/new.tsx";
import * as $$0 from "./islands/AddRoom.tsx";
import * as $$1 from "./islands/Chat.tsx";
import * as $$2 from "./islands/Rooms.tsx";

const manifest = {
  routes: {
    "./routes/[room].tsx": $0,
    "./routes/api/login.ts": $1,
    "./routes/api/logout.ts": $2,
    "./routes/index.tsx": $3,
    "./routes/new.tsx": $4,
  },
  islands: {
    "./islands/AddRoom.tsx": $$0,
    "./islands/Chat.tsx": $$1,
    "./islands/Rooms.tsx": $$2,
  },
  baseUrl: import.meta.url,
  config,
};

export default manifest;