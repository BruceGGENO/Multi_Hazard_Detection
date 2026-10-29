// Loaded before Next.js. Application sockets may only connect to loopback.
import net from 'node:net';
import tls from 'node:tls';
const local = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);
function check(args) {
  const first = args[0];
  const options = typeof first === 'object' && first !== null ? (Array.isArray(first) ? first[0] : first) : null;
  if (typeof first === 'string' || options?.path) throw new Error('Outbound pipe connections are disabled');
  const host = options?.host ?? (typeof args[1] === 'string' ? args[1] : '127.0.0.1');
  if (!local.has(host)) throw new Error('Outbound connections are restricted to loopback');
  if (options?.host === 'localhost') options.host = '127.0.0.1';
  else if (args[1] === 'localhost') args[1] = '127.0.0.1';
}
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) { check(args); return Reflect.apply(connect, this, args); };
const secureConnect = tls.connect;
tls.connect = function (...args) { check(args); return Reflect.apply(secureConnect, this, args); };
