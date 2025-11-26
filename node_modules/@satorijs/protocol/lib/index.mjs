var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import Element from "@satorijs/element";
import { isNullable, pick } from "cosmokit";
function Field(name) {
  return { name };
}
__name(Field, "Field");
function Method(name, fields, isForm = false) {
  return { name, fields: fields.map(Field), isForm };
}
__name(Method, "Method");
var Methods = {
  "channel.get": Method("getChannel", ["channel_id", "guild_id"]),
  "channel.list": Method("getChannelList", ["guild_id", "next"]),
  "channel.create": Method("createChannel", ["guild_id", "data"]),
  "channel.update": Method("updateChannel", ["channel_id", "data"]),
  "channel.delete": Method("deleteChannel", ["channel_id"]),
  "channel.mute": Method("muteChannel", ["channel_id", "guild_id", "enable"]),
  "message.create": Method("createMessage", ["channel_id", "content", "referrer"]),
  "message.update": Method("editMessage", ["channel_id", "message_id", "content"]),
  "message.delete": Method("deleteMessage", ["channel_id", "message_id"]),
  "message.get": Method("getMessage", ["channel_id", "message_id"]),
  "message.list": Method("getMessageList", ["channel_id", "next", "direction", "limit", "order"]),
  "reaction.create": Method("createReaction", ["channel_id", "message_id", "emoji"]),
  "reaction.delete": Method("deleteReaction", ["channel_id", "message_id", "emoji", "user_id"]),
  "reaction.clear": Method("clearReaction", ["channel_id", "message_id", "emoji"]),
  "reaction.list": Method("getReactionList", ["channel_id", "message_id", "emoji", "next"]),
  "upload.create": Method("createUpload", [], true),
  "guild.get": Method("getGuild", ["guild_id"]),
  "guild.list": Method("getGuildList", ["next"]),
  "guild.member.get": Method("getGuildMember", ["guild_id", "user_id"]),
  "guild.member.list": Method("getGuildMemberList", ["guild_id", "next"]),
  "guild.member.kick": Method("kickGuildMember", ["guild_id", "user_id", "permanent"]),
  "guild.member.mute": Method("muteGuildMember", ["guild_id", "user_id", "duration", "reason"]),
  "guild.member.role.set": Method("setGuildMemberRole", ["guild_id", "user_id", "role_id"]),
  "guild.member.role.unset": Method("unsetGuildMemberRole", ["guild_id", "user_id", "role_id"]),
  "guild.member.role.list": Method("getGuildMemberRoleList", ["guild_id", "user_id", "next"]),
  "guild.role.list": Method("getGuildRoleList", ["guild_id", "next"]),
  "guild.role.create": Method("createGuildRole", ["guild_id", "data"]),
  "guild.role.update": Method("updateGuildRole", ["guild_id", "role_id", "data"]),
  "guild.role.delete": Method("deleteGuildRole", ["guild_id", "role_id"]),
  "login.get": Method("getLogin", []),
  "user.get": Method("getUser", ["user_id"]),
  "user.channel.create": Method("createDirectChannel", ["user_id", "guild_id"]),
  "friend.list": Method("getFriendList", ["next"]),
  "friend.delete": Method("deleteFriend", ["user_id"]),
  "friend.approve": Method("handleFriendRequest", ["message_id", "approve", "comment"]),
  "guild.approve": Method("handleGuildRequest", ["message_id", "approve", "comment"]),
  "guild.member.approve": Method("handleGuildMemberRequest", ["message_id", "approve", "comment"])
};
var Channel;
((Channel2) => {
  let Type;
  ((Type2) => {
    Type2[Type2["TEXT"] = 0] = "TEXT";
    Type2[Type2["DIRECT"] = 1] = "DIRECT";
    Type2[Type2["CATEGORY"] = 2] = "CATEGORY";
    Type2[Type2["VOICE"] = 3] = "VOICE";
  })(Type = Channel2.Type || (Channel2.Type = {}));
})(Channel || (Channel = {}));
function Resource(attrs = [], children = [], content) {
  return { attrs, children, content };
}
__name(Resource, "Resource");
((Resource2) => {
  const Definitions = {
    user: Resource2(["id", "name", "nick", "avatar", "isBot"]),
    member: Resource2(["name", "nick", "avatar"]),
    channel: Resource2(["id", "type", "name"]),
    guild: Resource2(["id", "name", "avatar"]),
    quote: Resource2(["id"], ["quote", "user", "member", "channel"], "content")
  };
  function encode(type, data) {
    const resource = Definitions[type];
    const element = Element(type, pick(data, resource.attrs));
    for (const key of resource.children) {
      if (isNullable(data[key])) continue;
      element.children.push(encode(key, data[key]));
    }
    if (resource.content && !isNullable(data[resource.content])) {
      element.children.push(...Element.parse(data[resource.content]));
    }
    return element;
  }
  Resource2.encode = encode;
  __name(encode, "encode");
  function decode(element) {
    const data = element.attrs;
    const resource = Definitions[element.type];
    for (const key of resource.children) {
      const index = element.children.findIndex((el) => el.type === key);
      if (index === -1) continue;
      const [child] = element.children.splice(index, 1);
      data[key] = decode(child);
    }
    if (resource.content && element.children.length) {
      data[resource.content] = element.children.join("");
    }
    return data;
  }
  Resource2.decode = decode;
  __name(decode, "decode");
})(Resource || (Resource = {}));
function transformKey(source, callback) {
  if (!source || typeof source !== "object") return source;
  if (Array.isArray(source)) return source.map((value) => transformKey(value, callback));
  return Object.fromEntries(Object.entries(source).map(([key, value]) => {
    if (key.startsWith("_") || key === "referrer") return [key, value];
    return [callback(key), transformKey(value, callback)];
  }));
}
__name(transformKey, "transformKey");
var Status = /* @__PURE__ */ ((Status2) => {
  Status2[Status2["OFFLINE"] = 0] = "OFFLINE";
  Status2[Status2["ONLINE"] = 1] = "ONLINE";
  Status2[Status2["CONNECT"] = 2] = "CONNECT";
  Status2[Status2["DISCONNECT"] = 3] = "DISCONNECT";
  Status2[Status2["RECONNECT"] = 4] = "RECONNECT";
  return Status2;
})(Status || {});
var Opcode = /* @__PURE__ */ ((Opcode2) => {
  Opcode2[Opcode2["EVENT"] = 0] = "EVENT";
  Opcode2[Opcode2["PING"] = 1] = "PING";
  Opcode2[Opcode2["PONG"] = 2] = "PONG";
  Opcode2[Opcode2["IDENTIFY"] = 3] = "IDENTIFY";
  Opcode2[Opcode2["READY"] = 4] = "READY";
  Opcode2[Opcode2["META"] = 5] = "META";
  return Opcode2;
})(Opcode || {});
var WebSocket;
((WebSocket2) => {
  WebSocket2.CONNECTING = 0;
  WebSocket2.OPEN = 1;
  WebSocket2.CLOSING = 2;
  WebSocket2.CLOSED = 3;
})(WebSocket || (WebSocket = {}));
export {
  Channel,
  Methods,
  Opcode,
  Resource,
  Status,
  WebSocket,
  transformKey
};
