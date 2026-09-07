import http from "node:http";
import https from "node:https";
import net from "node:net";
const deny = () => { throw new Error("Network forbidden in onboarding CLI tests"); };
globalThis.fetch = deny;
http.request = deny;
https.request = deny;
net.Socket.prototype.connect = deny;
