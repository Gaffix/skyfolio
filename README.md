# Skyfolio

Skyfolio is a responsive Hypixel SkyBlock profile viewer built around live profile data, a movable 3D Minecraft skin, detailed progression modules, and personal planning tools.

**Live site:** [skyfolio.onrender.com](https://skyfolio.onrender.com)

Search for a Minecraft username or open a shareable profile URL such as `/gffx`. The root route stays neutral and does not automatically request a player profile.

## Highlights

- Interactive 3D Minecraft skin with real player heads
- Skills, Dungeons, Slayers, Bestiary, collections, minions, pets, Garden, Mining, Crimson Isle, Rift, Museum, and Essence Shops
- Armor, equipment, wardrobe, inventory, Ender Chest, backpacks, bags, sacks, and item search
- Accessory Bag analysis, net-worth estimates, Mayor information, and an in-game event timeline
- Profile identity details including Hypixel rank, game mode, co-op members, guild, socials, and API availability
- IronPath forge goals and material planning for Ironman profiles
- Personal Quest Board and Notebook
- Customizable dashboard widgets, module order, hidden sections, favorites, themes, and performance mode
- Minecraft-style item lore, colors, formatting, and cached item textures
- Shareable profile routes and downloadable profile cards

## Run locally

### Requirements

- Node.js 18 or newer
- A [Hypixel developer API key](https://developer.hypixel.net/)

### Setup

1. Clone the repository and enter it:

```powershell
git clone https://github.com/Gaffix/skyfolio.git
Set-Location skyfolio
```

2. Copy the environment template:

```powershell
Copy-Item .env.example .env
```

3. Add your API key to `.env`:

```dotenv
HYPIXEL_API_KEY=your_hypixel_api_key_here
PORT=5173
```

4. Start Skyfolio:

```powershell
npm start
```

5. Open [http://localhost:5173](http://localhost:5173).

No dependency installation is currently required. You can validate the server and browser JavaScript with:

```powershell
npm run check
```

### Populate the item texture cache

Download every item render discoverable from the current Hypixel and NotEnoughUpdates item catalogs:

```powershell
npm run cache:textures
```

The downloader resumes by default, skipping textures already present in `cache/textures`. Run `node scripts/download-item-textures.js --force` to replace existing files, or `node scripts/download-item-textures.js --limit 20` for a small test run. Optional `--concurrency 2` and `--delay 250` arguments control request pressure. Failed item IDs are written to `cache/texture-download-failures.json` and can be retried by running the command again.

SkyCrypt can protect the public endpoint with a Cloudflare browser challenge. The script detects that response and stops instead of attempting to bypass it. If you operate an authorized SkyCrypt backend, set `SKYCRYPT_ITEM_API` to its `/api/item` URL before running the command.

## Configuration and API safety

The Hypixel API key is read exclusively by the Node server. It is never included in browser responses or client-side JavaScript. The `.env` file is ignored by Git, so never remove it from `.gitignore` or commit a real key.

Profile responses are cached for five minutes to reduce Hypixel API usage. Minecraft identities and skins are resolved through Mojang services, while item metadata and textures are normalized and proxied by the server.

For hosted deployments, configure `HYPIXEL_API_KEY` as a private environment variable in the host's dashboard. Do not place it in repository files or public environment settings.

## Routes and hosting

- `/` — profile search without an automatic API request
- `/:player` — a player's selected SkyBlock profile
- `/:player/:module` — a directly shareable module, such as `/gffx/inventory`
- `/api/health` — lightweight uptime check that does not contact Hypixel or Mojang

For Render or another uptime monitor, ping `/api/health` instead of a player URL.

The Quest Board, Notebook, and IronPath goals use browser `localStorage`, so they survive server deployments but remain specific to the current browser and device. Dashboard customization, themes, favorites, and active tabs also use browser `localStorage`.

## Project structure

```text
public/
  index.html          Browser entry point
  css/                Component, responsive, and theme styles
  js/
    app.js            Main client application and routing
    profile-depth.js  Detailed skills, Dungeons, and net worth
    profile-progress.js
                       Accessories, Bestiary, and minions
    world-depth.js    Rift, Crimson Isle, and miscellaneous stats
    customization.js Themes, favorites, module layout, and profile cards
src/
  server.js           Server process entry point
  app.js              HTTP routes, API clients, and profile normalization
  config.js           Environment variables and shared paths
  items.js            Minecraft NBT and SkyBlock item parsing
  forge-recipes.js    Forge recipes and durations
scripts/              Repository maintenance scripts
cache/                Seeded item textures used by the image proxy
.env.example          Safe environment-variable template
```

## Privacy and limitations

Skyfolio only displays information exposed by Mojang and the Hypixel APIs. Some sections may be incomplete when a player disables an API category. Net worth and some progress values are estimates derived from the available profile and market data.

## License

No license has been added yet. All rights are reserved unless a license is provided later.
