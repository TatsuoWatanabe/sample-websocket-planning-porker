class SampleWebsocketPlanningPorkerApp {
  get cardValues() { return [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]; }
  get appColor() { return { connected: 'green accent-4', notConnected: 'light-green darken-1'}; }
 
  start() {
    this.el = {
      $appColor         : $('.app-color'),
      $selfStateArea    : $('.self-state-area'),
      $selfNameArea     : $('.self-name-area'),
      $disableOnConnect : $('.disable-on-connect'),
      $connectedArea    : $('.connected-area'),
      $hostArea         : $('.host-area'),
      $roomNameArea     : $('.room-name-area'),
      $tboxMsg          : $('#tbox-msg'),
      $tboxDispName     : $('#tbox-disp-name'),
      $tboxHost         : $('#tbox-host'),
      $tboxRoomName     : $('#tbox-room-name'),
      $btnConnect       : $('#btn-connect'),
      $btnDisconnect    : $('#btn-disconnect'),
      $chatArea         : $('#chat-area'),
      $chatAreaContainer: $('#chat-area').closest('.chat-area-container'),
      $cardArea         : $('#card-area'),
      $cardAreaContainer: $('#card-area').closest('.card-area-container'),
      $putCardArea      : $('footer .put-card-area')
    };

    // set default values.
    this.setDefaults();

    // create card buttons.
    this.el.$putCardArea.append(this.cardValues.map((cv) => $(`
      <button class="waves-effect waves-light btn blue block" onclick="app.putCard('${cv}')">
        <i class="material-icons left">publish</i>${cv}
      </button>
    `)));

    /* window resize event */ {
      let timer = false;
      $(window).resize(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.el.$chatAreaContainer
          .add(this.el.$cardAreaContainer)
          .css('max-height', ($(window).height() * 0.75 ));
        }, 200);
      }).resize();
    }
    // Send message on Ctrl + Enter keydown.
    $(window).keydown((e) => {
      const keyCodeEnter = 13;
      if (e.ctrlKey &&
          e.keyCode === keyCodeEnter &&
          $(document.activeElement).is(this.el.$tboxMsg)) {
        // send message if focus is on textarea.
        this.sendMessage();
        e.preventDefault();
      }
    });
  }

  /** create socket connection. */
  connect() {
    this.el.$btnConnect.hide();
    this.el.$btnDisconnect.show();
    this.setDispName(this.el.$tboxDispName.val());
    this.setHost(this.el.$tboxHost.val());
    this.setRoomName(this.el.$tboxRoomName.val());

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

  send(data) {
    var obj = { data, src: this.socketId, roomName: this.roomName };
    this.socket.emit('data', obj);
  }

  onConnect() {
    this.socketId = String(this.socket.id).replace(/^\/\w+?#/, '');
    this.joinRoom(this.roomName, this.dispName);
    this.socket.on('roomOpen'   , (obj)      => this.onRoomOpen(obj));
    this.socket.on('disconnect' , ()         => this.onRoomClose());
    this.socket.on('data'       , (obj)      => this.onReceiveData(obj));
    this.socket.on('memberJoin' , (obj)      => this.onMemberJoin(obj));
    this.socket.on('memberLeave', (socketId) => this.onMemverLeave(socketId));
    // this.room.on('log'       , (logs)     => this.onReceiveLog(logs));

  }

  onRoomOpen(obj) {
    console.log(obj);
    this.toast('connected.');
    this.applyConnected(true);
    // Get room log.
    // this.room.getLog();
  }

  onRoomClose() {
    this.toast('closed.');
    this.disconnect();
  }

  onReceiveData(obj) {
    console.log(obj);
    // pass the data to each functions.
    const id   = obj.src;
    const data = obj.data;
    this.receiveMessage   (id, data);
    this.receivePutCard   (id, data);
    this.receivePullCard  (id, data);
    this.receiveFaceup    (id, data);
    this.receiveFacedown  (id, data);
    // Remember room member's name.
    this.memorizeName(id, data);
  }

  onReceiveLog(logs) {
    if (!Array.isArray(logs)) { return; }

    logs.forEach((raw) => {
      const log = JSON.parse(raw);
      if (log.messageType === 'ROOM_DATA') {
        // Remember room member's name from log.
        this.memorizeName(log.message.src, log.message.data);
      }
    });
  }

  onMemberJoin(obj) {
    const data = obj.data;
    const msg = `${data.dispName} joined.`;
    console.log(msg);
    this.toast(msg);
    this.memorizeName(obj.src, obj.data);
  }

  onMemverLeave(socketId) {
    console.log(socketId, 'leaved.');

    // Popup leaved member's name.
    const members = this.members || {};
    const leaverName = members[socketId] || `Someone(${socketId})`;
    this.toast(`${leaverName} leaved.`);

    // Delete the leaved member's card.
    this.receivePullCard(socketId, { pullCard: true });
  }

  toast(message = '', displayLength = 3000) {
    Materialize.toast(message, displayLength);
  }

  getRandomName() {
    const names = ['Jobs', 'Wozniak', 'Gates', 'Larry', 'Bezos', 'Turing', 'Ritchie', 'Torvalds', 'Kay', 'Neumann', 'Moore'];
    return names[Math.floor(Math.random() * names.length)];
  }

  getClassNameById(id) {
    const numStr = id.replace(/\D/g, '') || '1';
    const index  = parseInt(numStr.slice(-1));
    const classNames = [
      /* 0 */ 'teal',
      /* 1 */ 'teal lighten-3',
      /* 2 */ 'red lighten-3',
      /* 3 */ 'red lighten-5',
      /* 4 */ 'deep-purple accent-1',
      /* 5 */ 'deep-purple accent-2',
      /* 6 */ 'blue lighten-1',
      /* 7 */ 'blue lighten-4',
      /* 8 */ 'purple accent-1',
      /* 9 */ 'purple accent-2'
    ];
    const className = classNames[index] || classNames[0];
    return className;
  }

  applyConnected(isConnected = false) {
    const nc = 'Not connected.';
    this.setAppColor(isConnected ? this.appColor.connected : this.appColor.notConnected);
    this.el.$selfStateArea.text(isConnected ? `Your socket id is ${this.socketId}` : nc);
    this.el.$connectedArea.text(isConnected ? 'Connected.' : nc);
    this.el.$btnConnect.toggle(!isConnected);
    this.el.$btnDisconnect.toggle(isConnected);
    this.el.$cardArea.find('.card-panel').remove();
    this.el.$disableOnConnect.prop('disabled', isConnected).toggleClass('disabled', isConnected);
  }

  setDefaults() {
    this.applyConnected(false);

    /* set dispName */ {
      const defaultName = localStorage.getItem('dispName') || this.getRandomName();
      this.setDispName(defaultName);
      this.el.$tboxDispName.val(defaultName);
    }
    /* set host */ {
      const defaultHost = location.origin.replace(/^http/, 'ws') + '/socket';
      const host = localStorage.getItem('host') || defaultHost;
      this.setHost(host);
      this.el.$tboxHost.val(host);
    }
    /* set roomName */ {
      const roomName = localStorage.getItem('roomName') || 'websocket-planning-porker-room';
      this.setRoomName(roomName);
      this.el.$tboxRoomName.val(roomName);
    }
  }

  getCard(id) {
    return $(`.card-${id}`);
  }

  setAppColor(colorName) {
    const ac = 'app-color';
    const oldColor = this.el.$appColor.data(ac);
    this.el.$appColor.removeClass(oldColor);
    this.el.$appColor.addClass(colorName);
    // remeber current color className.
    this.el.$appColor.data(ac, colorName);
  }

  setDispName(val) {
    const dispName = String(val).trim();
    if (!dispName) { return; }

    this.dispName = dispName;
    this.el.$selfNameArea.text(`Your Name is ${dispName}`);
    localStorage.setItem('dispName', dispName);
  }

  setHost(val) {
    const host    = String(val).trim();
    const hostStr = host ? val : 'not set';
    this.el.$hostArea.text(`Socket host address is ${hostStr}`);

    this.host = val;
    localStorage.setItem('host', val);
  }

  setRoomName(val) {
    const roomName = String(val).trim();
    const roomStr = roomName ? val : 'not set';
    this.el.$roomNameArea.text(`Room is ${roomStr}`);

    this.roomName = val;
    localStorage.setItem('roomName', val);
  }

  putCard(num) {
    if (!this.socket) { return; }

    const data = { putCard: num, dispName: this.dispName };
    const $card = this.getCard(this.socketId);
    if ($card.length !== 0) { return; }

    this.receivePutCard(this.socketId, data);
    this.send(data);
  }

  receivePutCard(id, data) {
    const cardValue = data.putCard;
    const dispName  = data.dispName || id;
    const $card     = this.getCard(id);
    if (cardValue === undefined) { return; }
    if ($card.length !== 0)      { return; }

    this.el.$cardArea.append(`
      <span class="card-panel face-down card-${id}" data-value="${cardValue}" data-disp-name="${dispName}">
      </span>
    `);
  }

  pullCard() {
    if (!this.socket) { return; }
    const data = { pullCard: true };
    this.receivePullCard(this.socketId, data);
    this.send(data);
  }

  receivePullCard(id, data) {
    if (!data.pullCard) { return; }
    const $card = this.getCard(id);
    $card.remove();
  }

  faceup() {
    if (!this.socket) { return; }
    const data = { faceup: true };
    this.receiveFaceup(this.socketId, data);
    this.send(data);
  }

  receiveFaceup(id, data) {
    if (!data.faceup) { return; }

    const $card = this.getCard(id);
    const dispName  = $card.data('dispName');
    const cardValue = $card.data('value');

    $card.removeClass('face-down').addClass('face-up').html(`
      <svg width="100%" height="100%">
        <text x="50%" y="10%" font-size="1rem" text-anchor="middle">${dispName}</text>
        <text x="50%" y="50%" font-size="4.5rem" text-anchor="middle" dominant-baseline="middle">
          ${cardValue}
        </text>
        <rect fill="none" x="0%" y="0%" width="100%" height="100%" stroke-width="10" stroke="black">
      </svg>
    `);
  }

  facedown() {
    if (!this.socket) { return; }
    const data = { facedown: true };
    this.receiveFacedown(this.socketId, data);
    this.send(data);
  }

  receiveFacedown(id, data) {
    if (!data.facedown) { return; }

    const $card = this.getCard(id);
    $card.removeClass('face-up').addClass('face-down').html('');
  }

  sendMessage() {
    if (!this.socket) { return; }

    const message = String(this.el.$tboxMsg.val()).trim();
    const data    = { message, dispName: this.dispName };
    if (!message) { return; }

    this.receiveMessage(this.socketId, data);
    this.send(data);
    this.el.$tboxMsg.val('');
  }

  receiveMessage(id, data) {
    const message  = data.message;
    const dispName = data.dispName || id;
    const color = this.getClassNameById(id);
    if (!message) { return; }

    this.el.$chatArea.append(
      `<div class="card-panel ${color}">${dispName}:` +
        `<pre class="no-margin">${message}</pre>` +
      `</div>`
    );
    // scroll to bottom of chatArea.
    this.el.$chatAreaContainer.animate({
      scrollTop: this.el.$chatArea.height()
    }, 800);
  }

  memorizeName(id, data) {
    if (!(id && data.dispName)) { return; }
    if (!this.members) { this.members = {}; }
    this.members[id] = data.dispName;
  }

}
