"""Reject outbound sockets outside loopback, including hostname resolution."""
import socket

_connect = socket.socket.connect
_connect_ex = socket.socket.connect_ex
_resolve = socket.getaddrinfo
_local = {"localhost", "127.0.0.1", "::1"}


def _address(address):
    if not isinstance(address, tuple) or address[0] not in _local:
        raise PermissionError("Outbound connections are restricted to loopback")
    return ("127.0.0.1", *address[1:]) if address[0] == "localhost" else address


def _local_connect(self, address):
    return _connect(self, _address(address))


def _local_connect_ex(self, address):
    return _connect_ex(self, _address(address))


def _local_resolve(host, *args, **kwargs):
    if host not in _local:
        raise PermissionError("External DNS resolution is disabled")
    return _resolve("127.0.0.1" if host == "localhost" else host, *args, **kwargs)


socket.socket.connect = _local_connect
socket.socket.connect_ex = _local_connect_ex
socket.getaddrinfo = _local_resolve
