"""
  This file is just the entrypoint. All application code is in `addon.py`.

  I'm not proud of this layout, but I frankly do not care enough. It seems
  like mitmproxy creates a separate Python environment for the addons(?),
  and communicating between those seems like hell.
"""

from mitmproxy.tools.main import mitmdump

def main():
  mitmdump(args=[
    "-s", "addon.py",
    "--mode", "regular",
        "--listen-host", "0.0.0.0",
        "--listen-port", "8080",
        "--set", "http3=false",
  ])

if __name__ == "__main__":
  main()
