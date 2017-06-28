class Aggregate {
  get roomName() { return 'websocket-aggregate'; }
  get appColor() { return { connected: 'green accent-4', notConnected: 'light-green darken-1'}; }
  get host() {
    const defaultHost = location.origin.replace(/^http/, 'ws') + '/socket';
    // 
    // github page has no websoket server. so set other running server address by default.
    //
    if (location.host === 'tatsuowatanabe.github.io') {
      const otherHost = 'wss://websocket-planning-porker.herokuapp.com/socket';
      return otherHost;
    }
    return defaultHost;
  }

  start() {
    this.el = {
      $appColor     : $('.app-color'),
      $btnConnect   : $('#btn-connect'),
      $btnDisconnect: $('#btn-disconnect'),
      $selfStateArea: $('.self-state-area'),
      $connectedArea: $('.connected-area'),
      $remarkTable  : $('#remark-table')  
    };

    const ctx = document.getElementById('myChart').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
          ]
        }]
      }
    });

    this.connect();
  }

  connect() {
    this.el.$btnConnect.hide();
    this.el.$btnDisconnect.show();
    this.socket = io.connect(this.host);
    this.socket.on('connect', () => this.onConnect());
    this.socket.on('connect_error', (() => {
      let count = 0;
      return (err) => {
        count += 1;
        console.log(`${count} times connect_error`, err.description, err.message);
        if (count >= 3) {
          this.toast(`connection failed. ${err.message}`);
          this.disconnect();
        }
      };
    })());
  }

  disconnect() {
    this.applyConnected(false);
    if (!this.socket) { return; }

    this.socket.close();
    this.socket   = undefined;
    this.socketId = undefined;
  }

  joinRoom(roomName, dispName) {
    var data = { dispName };
    this.socket.emit('join', { data, src: this.socketId, roomName });
  }

  onConnect() {
    this.socketId = String(this.socket.id).replace(/^\/\w+?#/, '');
    this.joinRoom(this.roomName, this.dispName);
    this.socket.on('roomOpen'  , (obj) => this.onRoomOpen(obj));
    this.socket.on('disconnect', ()    => this.onRoomClose());
    this.socket.on('aggregate' , (obj) => this.onReceiveAggregate(obj));
  }

  onRoomOpen(obj) {
    console.log(obj);
    this.toast('connected.');
    this.applyConnected(true);
    this.socket.emit('requestAggregate', { data: {}, src: this.socketId, roomName: this.roomName });
  }

  onRoomClose() {
    this.toast('closed.');
    this.disconnect();
  }

  onReceiveAggregate(obj) {
    console.log(obj);
    this.chart.data.datasets[0].data = obj.map((record) => record.count);
    this.chart.data.labels = obj.map((record) => record._id);
    this.chart.update();

    this.el.$remarkTable.find('tbody').html((() => {
      const arr = obj.map((record, index) => {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${record._id}</td>
            <td>${record.count}</td>
          </tr>
        `;
      });

      return arr.join('');
    })());
  }

  toast(message = '', displayLength = 3000) {
    Materialize.toast(message, displayLength);
  }

  applyConnected(isConnected = false) {
    const nc = 'Not connected.';
    this.setAppColor(isConnected ? this.appColor.connected : this.appColor.notConnected);
    this.el.$selfStateArea.text(isConnected ? `Your socket id is ${this.socketId}` : nc);
    this.el.$connectedArea.text(isConnected ? 'Connected.' : nc);
    this.el.$btnConnect.toggle(!isConnected);
    this.el.$btnDisconnect.toggle(isConnected);
  }

  setAppColor(colorName) {
    const ac = 'app-color';
    const oldColor = this.el.$appColor.data(ac);
    this.el.$appColor.removeClass(oldColor);
    this.el.$appColor.addClass(colorName);
    // remeber current color className.
    this.el.$appColor.data(ac, colorName);
  }
}
