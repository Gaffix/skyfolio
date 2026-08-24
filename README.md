# Skyfolio

A dark, responsive Hypixel SkyBlock profile-viewer concept with an interactive Minecraft skin and a persistent personal quest board.

## Run

1. Copy `.env.example` to `.env` and put your Hypixel API key in it:

```powershell
Copy-Item .env.example .env
```

2. Start the app (Node 18 or newer):

```powershell
npm start
```

3. Visit `http://localhost:5173` and search a Minecraft username.

The API key is read only by the server configuration; `.env` is gitignored and is never sent to the browser. Profile responses are cached for five minutes to respect Hypixel's rate limits. Live modules include progression, storage, collections, activity, Slayers, Dungeons, pets, mining, Garden, Bestiary, accessories, Mayor data, and an estimated net worth. Minecraft skins are resolved through Mojang's session service and proxied locally.

## Project structure

```text
public/
  index.html       Browser entry point
  css/             Component and theme styles
  js/app.js        Client-side application
src/
  server.js        Small process entry point
  app.js           HTTP routes, API proxy, and profile normalization
  config.js        Environment variables and shared paths
  data-store.js    Goals and notebook persistence
  items.js         Minecraft NBT and SkyBlock item parsing
data/              Local goals and notebook data (gitignored)
.env               Private local configuration (gitignored)
```
