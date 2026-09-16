# opentradenet-companion

Browser-based companion webapp for [`opentradenet_bot`](../opentradenet_bot), a single-user Telegram bot that monitors prices and manages positions on Hyperliquid. The bot has no UI beyond Telegram commands; this app gives the same user a friendlier way to look at charts and quotes built from the bot's data.

Built with [Next.js](https://nextjs.org) (App Router, TypeScript) and [`lightweight-charts`](https://www.tradingview.com/lightweight-charts/).

## Relationship to opentradenet_bot

- Reads the bot's `data/` directory **read-only**, from a path configured via `OPENTRADENET_DATA_DIR` (see `.env`). It never touches `data/wallet/`, `data/conditional_orders/`, or `data/journal/`, never places orders, and has no access to the bot's Hyperliquid API keys.
- Runs as its own process, deployed alongside the bot on the same host.
- No application-level auth — access is controlled at the network level (VPN to a fixed IP), by design for a single trusted user.

## Features

- **Sidebar navigation** with room for future sections (Segnali, Analisi are placeholders for work not started yet).
- **Charts** (`/charts`): candlestick + volume chart per symbol, powered by 15-minute OHLCV candles from `data/candles/{SYMBOL}/{SYMBOL}_15m.csv`.
  - Timeframe selector (15m/1h/1d/1w) — coarser timeframes are aggregated on the fly from the 15m data (no extra files on disk).
  - EMA9/21/50 overlays always on; an optional, bar-count-configurable linear regression channel (mirrors `candle_chart.py`'s math, including the shaded blue/red band).
  - A second synced pane with MACD/Signal/histogram, same colors and logic as the bot's own chart.
  - "Esporta JPEG" button to download the chart (including the legend overlays) as an image.
- **Symbol list**, sorted by daily % change (derived from `data/prices/{SYMBOL}.csv`), colored green/red for gains/losses.
  - Search box to filter by ticker or company/asset name on the fly.
  - Star a symbol to mark it as favorite; toggle the list between "Tutti" and "Preferiti". Favorites are companion-app state, stored locally in this project's own `data/favorites.json` (gitignored) — not written to the bot's data directory.
- **Symbol info panel** below the chart, showing what the instrument is, market/exchange, currency, leverage, session hours, etc., from `data/symbols_info.json`.

## Data this project reads

- `data/candles/{SYMBOL}/{SYMBOL}_15m.csv` — 15m OHLCV candles.
- `data/prices/{SYMBOL}.csv` — daily price snapshots, used for % change.
- `data/symbols_info.json` — market metadata (description, exchange, leverage, session hours).

## Getting started

```bash
npm install
cp .env.local.example .env.local   # set OPENTRADENET_DATA_DIR to the bot's data/ directory
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

No test suite or lint config beyond the Next.js defaults exists yet.

## Deployment

Runs as a systemd service on the same host as the bot, same pattern as `opentradenet_bot.service` / `opentradenet_flask.service`. The unit file is checked in at [`opentradenet-companion.service`](./opentradenet-companion.service).

```bash
# on the server, as the deploy user (e.g. solana)
cd /home/solana/opentradenet-companion   # sibling of opentradenet_bot
git pull
npm install
cp .env.local.example .env.local   # first deploy only; set OPENTRADENET_DATA_DIR
npm run build

# first deploy only:
which node                          # confirm the path, adjust ExecStart in the unit if it's not /usr/bin/node
sudo cp opentradenet-companion.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now opentradenet-companion

# subsequent deploys, after git pull + npm install + npm run build:
sudo systemctl restart opentradenet-companion

# check it's healthy / see logs:
systemctl status opentradenet-companion
journalctl -u opentradenet-companion -f
```

`Restart=on-failure` and `WantedBy=multi-user.target` mean the service restarts on crash and comes back up automatically after a reboot.

## Roadmap

- Indicator panes still missing vs. `candle_chart.py`: Bollinger Bands, RSI, Ichimoku.
- A live signals feed once the bot's scanner persists detected opportunities to disk.
- An ML/algo "probability of success" ranking page — deferred until the underlying model is retrained and reviewed.
