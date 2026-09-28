#!/bin/bash
source .venv/bin/activate
pyinstaller main.py addon.py
mv dist/main dist/Arachnidium
cp addon.py dist/Arachnidium/
cp -r theme dist/Arachnidium/
cd bun-api
bun run build
mkdir ../dist/Arachnidium/bun-api
cp Arachnidium-api ../dist/Arachnidium/bun-api/
cd ../dist/Arachnidium
tar -cJf ../Arachnidium.tar.xz .
