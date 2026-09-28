## Arachnidium

Data-optimizing HTTP(S) proxy, powered by [mitmproxy](https://www.mitmproxy.org/).

## Setup

0. Find a home server - this can be any internet-connected computer, like an old laptop. Currently, pre-built releases exist for x64 Windows and Linux. If you need ARM or Mac support, clone the repository and run it from source.
1. On your home server, download the portable archive for your system in [Releases](https://github.com/p2r3/Arachnidium/releases/tag/latest).
2. Extract the archive and run `Arachnidium.exe` (or `Arachnidium` on Linux).
3. Install the WireGuard client on your device: [Android](https://play.google.com/store/apps/details?id=com.wireguard.android&pli=1) | [iOS](https://apps.apple.com/us/app/wireguard/id1441195209)
4. Add the VPN preset using the QR code displayed in Arachnidium. Alternatively, use the automatically generated `wireguard.cfg` file.
5. This is where things get a little hairy - if you want to actually use this outside of your home WiFi, you'll have to configure your network to listen for incoming VPN connections. To do this, you will have to forward **UDP** port **51820** from your home server to your router. The exact process for this is vastly different for every network and router, and it would be impossible to give a universal guide in this document, so please research this yourself. Searching for "port forward udp \<router model\>" should be enough to get you on the right track. Alternatively, call your internet service provider and ask if they can help.
6. Connect to the VPN and visit `mitm.it` on your phone's browser. Follow the instructions there to set up the certificate authority. ***Make sure to read all of the instructions.***

## Configuration

There are two ways to configure Arachnidium: via the graphical interface, or by editing `defaults.json`. Changes made in the GUI are not saved between restarts - for that, use the JSON file. If you want to run Arachnidium without the GUI, set `ENABLE_GUI` to `false` in `defaults.json`.

## Running from source

To run this project from source code without building it (for development purposes, or to run on unsupported platforms):

1. Install Python and [uv](https://docs.astral.sh/uv/).
2. Install [Bun](https://bun.sh/).
3. Clone this repository.
4. Run `uv run main.py`
5. In another terminal, change directory to `bun-api` and run `bun i`, then `bun run index.ts`

## Acknowledgements

- https://www.mitmproxy.org/
- https://github.com/rdbende/Azure-ttk-theme
