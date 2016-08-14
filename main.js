'use strict'

const request = require('axios')
const throttle = require('lodash.throttle')

const groupUrl = 'http://10.0.1.2/api/UDFYuTwbCfOgWUifr60MaAEBTDMmGAjxEzWkaRyA/groups/0'

function requestMIDI () {
  return navigator.requestMIDIAccess()
    .then(midi => {
      let first
      for (let input of midi.inputs.values()) {
        first = input
      }

      return first
    })
}

const colors = [
  [0.3698, 0.3725], // concentrate
  [0.4448, 0.4066], // read
]


Promise.all([requestMIDI(), request.get(groupUrl)]).then(([midi, res]) => {
  console.log(res.data)

  let colorIndex = 0
  let state = {
    bri: res.data.action.bri
  }

  const sync = throttle(() => {
    console.log(state)
    request.put(`${groupUrl}/action`, state).then((res) => {
      console.log(res.data)
    }).catch(err => console.error(err))
  }, 500)

  const updateBrightness = value => {
    state.bri = Math.max(0, Math.min(255, value))
    state.on = state.bri !== 0
  }

  midi.onmidimessage = e => {
    console.log(e.timeStamp, e.data)
    if (e.data[0] === 0xb0 && e.data[1] == 0x02) {
      const clockwise = e.data[2] === 0x01
      const delta = 5 * (clockwise ? 1 : -1)

      updateBrightness(state.bri + delta)
      sync()
    } else if (e.data[0] === 0xb0 && e.data[1] === 0x45) {
      updateBrightness(e.data[2] * 2)
      sync()
    } else if (e.data[0] === 0xb0 && e.data[1] === 0x15) {
      colorIndex += e.data[2] === 0x01 ? 1 : -1
      colorIndex %= colors.length
      if (colorIndex < 0) {
        colorIndex = colors.length - colorIndex
      }

      state.xy = colors[colorIndex]
      sync()
    }
  }
}).catch(err => console.error(err))
