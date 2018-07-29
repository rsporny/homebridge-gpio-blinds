# Homebridge GPIO Blinds
Homebridge plugin to control blinds via Raspberry Pi GPIO pins.

## Motivation
I've got 16 windows with blinds in my house. Controlling them manually would be simply annoying. See how it works -> https://youtu.be/jc-fZn0_fBA

## Installation
1. install homebridge
   `npm install -g homebridge`
2. install this plugin
   `npm install -g homebridge-gpio-blinds`
3. update your `~/.homebridge/config.json` file (use `sample-config.json` as a reference)

## Configuration
Sample accessory:
```
"accessories": [
  {
    "accessory": "Blinds",
    "name": "Garage",
    "pinUp": 5,
    "pinDown": 11,
    "durationUp": 13000,
    "durationDown": 13000,
    "durationOffset": 1000,
    "pinClosed": 17,
    "pinOpen": 18,
    "activeLow": false,
    "reedSwitchActiveLow": false
  }
]
```

Fields:

- `accessory` must always be *Blinds*
- `name` room with blinds, e.g. *Garage*
- `pinUp` pin for moving up (use *gpio numbering*, not *physical*)
- `pinDown` pin for moving down
- `durationUp` milliseconds to open blinds completely
- `durationDown` milliseconds to close blinds completely
- `durationOffset` [optional, default: *0*] milliseconds added to durationUp and durationDown to make sure that blinds are completely open or closed
- `pinClosed` [optional] pin connected to reed switch which is active when blind is closed, see *reedActiveLow*
- `pinOpen` [optional] pin connected to reed switch which is active when blind is open, see *reedActiveLow*
- `activeLow` [optional, default: *true*] true: relay activated by low state (0), false: relay activated by high state (1), affects *pinUp*, *pinDown*
- `reedSwitchActiveLow` [optional, default: *true*] true: reed switch activated by low state (0), false: reed switch activated by high state (1), affects *pinClosed*, *pinOpen*

## Raspberry Pi setup
- Raspberry Pi 3 (should work with all versions)
- [GPIO expander](https://botland.com.pl/raspberry-pi-hat-ekspandery-wyprowadzen/7149-ekspander-wyprowadzen-gpio-hat-nakladka-dla-raspberry-pi-32b.html?search_query=MOD-07149&results=1) - because I have more blinds than pins on raspberry pi (each blind takes 2 pins - singal up and down)
- [Relay module](https://botland.com.pl/przekazniki/6941-szesnastokanalowy-modul-przekaznikow-rm13-12v-z-izolacja-optoelektroniczna-10a125vac.html?search_query=MOD-06941&results=1)
- [Power supply](https://botland.com.pl/zasilacze-sieciowe-12-v/6707-zasilacz-impulsowy-12v-2a-z-przewodami.html) for relay module
- Some [wires](https://botland.com.pl/przewody-polaczeniowe/1021-przewody-polaczeniowe-zensko-zenskie-20cm-40szt.html?search_query=KAB-01021&results=1)

## Troubleshooting
- check platform: [Homebridge](https://github.com/nfarina/homebridge)
- check plugin dependency: [rpio](https://www.npmjs.com/package/rpio)
- or create issue
