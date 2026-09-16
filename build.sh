#!/bin/bash
source .venv/bin/activate
pyinstaller main.py addon.py
mv dist/main dist/Arachnidium
cp addon.py dist/Arachnidium/
cp azure.tcl dist/Arachnidium/
cp -r theme dist/Arachnidium/
cd dist/Arachnidium
tar -cJf ../Arachnidium.tar.xz .
