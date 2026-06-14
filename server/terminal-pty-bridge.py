#!/usr/bin/env python3
"""Relay stdin/stdout to an interactive shell over a POSIX pseudo-terminal."""
from __future__ import annotations

import fcntl
import os
import pty
import select
import signal
import struct
import sys
import termios


def _set_winsize(fd: int, rows: int, cols: int) -> None:
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)


def _relay(master_fd: int, child_pid: int) -> int:
    stdin_fd = sys.stdin.fileno()
    status = 0
    try:
        while True:
            r, _, _ = select.select([master_fd, stdin_fd], [], [])
            if master_fd in r:
                try:
                    chunk = os.read(master_fd, 65536)
                except OSError:
                    break
                if not chunk:
                    break
                buf = sys.stdout.buffer
                buf.write(chunk)
                buf.flush()
            if stdin_fd in r:
                try:
                    chunk = os.read(stdin_fd, 65536)
                except OSError:
                    break
                if not chunk:
                    break
                os.write(master_fd, chunk)
    finally:
        try:
            _, status = os.waitpid(child_pid, 0)
        except ChildProcessError:
            pass
    return os.WEXITSTATUS(status) if os.WIFEXITED(status) else 1


def main() -> int:
    cwd = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    shell = os.environ.get("SHELL") or "/bin/zsh"
    rows = max(5, int(os.environ.get("LINES", "24")))
    cols = max(20, int(os.environ.get("COLUMNS", "80")))

    if not os.path.isdir(cwd):
        cwd = os.getcwd()

    master_fd, slave_fd = pty.openpty()
    _set_winsize(slave_fd, rows, cols)

    child_pid = os.fork()
    if child_pid == 0:
        try:
            os.setsid()
            # Become session leader with a controlling TTY so job control + Ctrl+C reach fg jobs.
            try:
                fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
            except OSError:
                pass
            os.close(master_fd)
            os.dup2(slave_fd, 0)
            os.dup2(slave_fd, 1)
            os.dup2(slave_fd, 2)
            if slave_fd > 2:
                os.close(slave_fd)
            os.chdir(cwd)
            os.execv(shell, [shell, "-il"])
        except OSError as exc:
            sys.stderr.write(f"terminal-pty-bridge: exec failed: {exc}\n")
            os._exit(127)

    os.close(slave_fd)

    def on_resize(_signum: int, _frame: object) -> None:
        rows_ = max(5, int(os.environ.get("LINES", "24")))
        cols_ = max(20, int(os.environ.get("COLUMNS", "80")))
        _set_winsize(master_fd, rows_, cols_)
        try:
            os.kill(child_pid, signal.SIGWINCH)
        except OSError:
            pass

    signal.signal(signal.SIGUSR1, on_resize)

    try:
        return _relay(master_fd, child_pid)
    finally:
        try:
            os.close(master_fd)
        except OSError:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
