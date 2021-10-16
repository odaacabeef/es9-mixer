import React from 'react';
import Status from './Status';
import Settings from './Settings/Settings';
import MIDI from './MIDI/MIDI';
import Mixes from './Mixes/Mixes';

import {
  createTheme,
  ThemeProvider
} from '@material-ui/core/styles';
import {
  teal,
  purple
} from '@material-ui/core/colors';

const theme = createTheme({
  palette: {
    primary: {
      main: teal['A200'],
    },
    secondary: {
      main: purple['A700'],
    },
  },
});

class App extends React.Component {

  constructor(props) {
    super(props);

    this.es9 = {};

    var settings = JSON.parse(window.localStorage.getItem('settings'));
    if (settings == null) {
      settings = {
        showMixes: Array(16).fill(true) // show all mixes by default
      }
      window.localStorage.setItem('settings', JSON.stringify(settings));
    }
    this.state = {
      settings: settings
    };
  }

  componentDidMount() {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess({
        sysex: true
      }).then(
        this.onMIDISuccess.bind(this),
        this.onMIDIFailure.bind(this)
      );
    } else {
      this.setState({
        midiSupport: false,
        statusMessage: 'Browser does not support MIDI'
      });
    }
  }

  onMIDISuccess(midi) {

    midi.inputs.forEach(function(value, key, map) {
      if (value.name === 'ES-9 MIDI In') {
        this.es9.input = value;
        return;
      }
    }.bind(this));
    midi.outputs.forEach(function(value, key, map) {
      if (value.name === 'ES-9 MIDI Out') {
        this.es9.output = value;
        return;
      }
    }.bind(this));

    if ([this.es9.input, this.es9.output].includes(undefined)) {
      this.setState({
        midiSupport: false,
        statusMessage: 'ES-9 not found'
      });
      return;
    }

    this.setState({
      midiSupport: true,
      statusMessage: 'OK',
      midiInfo: `This version is for ES-9 firmware v1.2.0 and above.

ES-9 MIDI input ID: ${this.es9.input.id}
ES-9 MIDI output ID: ${this.es9.output.id}

`,
      midiRx: ''
    });
  }

  onMIDIFailure(msg) {
    this.setState({
      midiSupport: false,
      statusMessage: msg
    });
  }

  // Settings functions

  showMix(mix, show) {
    var settings = JSON.parse(window.localStorage.getItem('settings'));
    settings.showMixes[mix] = show;
    window.localStorage.setItem('settings', JSON.stringify(settings));
    this.setState({ settings: settings });
  }

  // MIDI functions

  midiInfo(msg) {
    var time = new Date().toLocaleTimeString();
    this.setState({
      midiInfo: `${this.state.midiInfo}${time}: ${msg}\n`
    });
  }

  midiRx(msg) {
    this.setState({
      midiRx: `${this.state.midiRx}${msg}\n`
    });
  }

  setMixes(mixes) {
    this.setState({
      mixes: mixes
    });
  }

  requestVersion() {
    this.midiInfo('Requesting version');
    this.es9.output.send([0xF0, 0x00, 0x21, 0x27, 0x19, 0x22, 0xF7]);
  }

  requestConfig() {
    this.midiInfo('Requesting config');
    this.es9.output.send([0xF0, 0x00, 0x21, 0x27, 0x19, 0x23, 0xF7]);
  }

  requestMix() {
    this.midiInfo('Requesting mix');
    this.es9.output.send([0xF0, 0x00, 0x21, 0x27, 0x19, 0x2A, 0xF7]);
  }

  updateVolume(mix, channel, volume) {
    var mixes = this.state.mixes;
    mixes[mix][channel - 1].volume = volume;
    this.setMixes(mixes);
    this.es9.output.send([0xF0, 0x00, 0x21, 0x27, 0x19, 0x34, mix * 8 + (channel - 1), volume, 0xF7]);
  }

  updatePan(mix, channel, pan) {
    var mixes = this.state.mixes;
    mixes[mix][channel - 1].pan = pan - 1;
    this.setMixes(mixes);
    this.es9.output.send([0xF0, 0x00, 0x21, 0x27, 0x19, 0x34, (mix + 1) * 8 + (channel - 1), pan, 0xF7]);
  }

  setVersion(version) {
    this.setState({
      version: version
    });
  }

  setRouteIn(routeIn) {
    this.setState({
      routeIn: routeIn
    });
  }

  setRouteOut(routeOut) {
    this.setState({
      routeOut: routeOut
    });
  }

  setStereoLinks(stereoLinks) {
    this.setState({
      stereoLinks: stereoLinks
    });
  }

  render() {
    if (this.state === null || this.state.midiSupport === null) {
      return (
        <>Loading...</>
      )
    } else if (!this.state.midiSupport) {
      return (
        <>
          <Status
            midiSupport={this.state.midiSupport}
            message={this.state.statusMessage}
          />
        </>
      )
    } else {
      return (
        <ThemeProvider theme={theme}>
          <Status
            midiSupport={this.state.midiSupport}
            message={this.state.statusMessage}
          />
          <Settings
            version={this.state.version}
            mixes={this.state.mixes}
            settings={this.state.settings}
            showMix={this.showMix.bind(this)}
            stereoLinks={this.state.stereoLinks}
            routeIn={this.state.routeIn}
            routeOut={this.state.routeOut}
            requestConfig={this.requestConfig.bind(this)}
          />
          <MIDI
            es9={this.es9}
            midi={{ info: this.state.midiInfo, rx: this.state.midiRx }}
            midiInfo={this.midiInfo.bind(this)}
            midiRx={this.midiRx.bind(this)}
            setMixes={this.setMixes.bind(this)}
            setVersion={this.setVersion.bind(this)}
            setRouteIn={this.setRouteIn.bind(this)}
            setRouteOut={this.setRouteOut.bind(this)}
            setStereoLinks={this.setStereoLinks.bind(this)}
            requestVersion={this.requestVersion.bind(this)}
            requestConfig={this.requestConfig.bind(this)}
            requestMix={this.requestMix.bind(this)}
          />
          <Mixes
            mixes={this.state.mixes}
            settings={this.state.settings}
            updateVolume={this.updateVolume.bind(this)}
            updatePan={this.updatePan.bind(this)}
            stereoLinks={this.state.stereoLinks}
            routeIn={this.state.routeIn}
            routeOut={this.state.routeOut}
          />
        </ThemeProvider>
      )
    }
  }
}

export default App;
