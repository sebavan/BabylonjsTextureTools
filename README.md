# Babylon.js Texture Tools

[![Twitter](https://img.shields.io/twitter/follow/babylonjs.svg?style=social&label=Follow)](https://twitter.com/intent/follow?screen_name=babylonjs)

**Any questions?** Here is our official [forum](https://forum.babylonjs.com/).

## Running locally

After cloning the repo, running locally during development is all the simplest:
```
npm install
npm start
```

For VSCode users, if you have installed the Chrome Debugging extension, you can start debugging within VSCode by using the appropriate launch menu.

## To generate WASM for LTCGenerator

In order to compile C++ to WASM you must fist install Emscripten (see [Install instruction](https://emscripten.org/docs/getting_started/downloads.html)). After completing the installation and configuration of Emscripten run the following commands: 

```
cd native/LTCGenerator
cmake --preset wasm
cmake --build --preset wasm
```

The ```LTCGenerator.js``` and ```LTCGenerator.wasm``` will be copied into ```www/wasm``` folder.

## Special thanks
To Filament and its team for the code and support :-)

