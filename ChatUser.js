/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** make chat: store connection-device, room */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** send msgs to this client using underlying connection-send-function */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** handle joining: add to room members, announce join */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** handle a chat: broadcast to room. */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: "chat",
      text: text,
    });
  }

  handleMembersRequest() {
    const members = [...this.room.members].map((m) => m.name);
    this.send(
      JSON.stringify({
        name: "Server",
        type: "chat",
        text: `In this room: ${members}`,
      })
    );
  }

  handleNameChange(name) {
    this.room.broadcast({
      type: "note",
      text: `${this.name} changed name to "${name}".`,
    });

    this.name = name;
  }

  /** Handle messages from client:
   *
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * - {type: "chat", text: "/joke" } : chat
   * - {type: "chat", text: "/members" } : chat
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === "join") this.handleJoin(msg.name);
    else if (
      msg.type === "chat" &&
      msg.text !== "/joke" &&
      msg.text !== "/members" &&
      msg.text.indexOf("/name") === -1
    ) {
      this.handleChat(msg.text);
    } else if (msg.text === "/joke") {
      this.room.sendJoke(this);
    } else if (msg.text === "/members") {
      this.handleMembersRequest();
    } else if (msg.text.indexOf("/name") !== -1) {
      const name = msg.text.split(" ")[1];
      this.handleNameChange(name);
    } else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left ${this.room.name}.`,
    });
  }
}

module.exports = ChatUser;
