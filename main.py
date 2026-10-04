"""
  This file is just the entrypoint. All application code is in `addon.py`.

  I'm not proud of this layout, but I frankly do not care enough. It seems
  like mitmproxy creates a separate Python environment for the addons(?),
  and communicating between those seems like hell.
"""

import asyncio

from mitmproxy.options import Options
from mitmproxy.tools.dump import DumpMaster

import addon


async def start_proxy():
    opts = Options(
        mode=["regular"],
        listen_host="0.0.0.0",
        listen_port=8080,
        http3=False,
    )

    master = DumpMaster(opts)

    master.addons.add(addon)

    try:
        await master.run()
    except KeyboardInterrupt:
        master.shutdown()

def main():
    asyncio.run(start_proxy())

if __name__ == "__main__":
  try:
    main()
  except Exception as e:
    print(e)
  finally:
    input("Press enter to exit...")