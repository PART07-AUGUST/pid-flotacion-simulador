"""Retardos de bombas y conexión hidráulica de tres celdas en serie."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass

from model_math import DELAYS_S


@dataclass
class CellFlow:
    """Estado de las tres bombas: la orden aparece tras 7, 6 o 3 s.

    Cada ciclo se lee primero el caudal real de colas y después se guarda la
    nueva orden. La salida real de la celda 1 alimenta la 2; la de la 2, la 3.
    """

    histories: list[deque[float]]

    @classmethod
    def at_equilibrium(cls, feed_lpm: float) -> CellFlow:
        return cls([deque([feed_lpm] * delay) for delay in DELAYS_S])

    def read_flows(self, external_feed_lpm: float) -> tuple[list[float], list[float]]:
        tailings = [history.popleft() for history in self.histories]
        inlets = [external_feed_lpm, tailings[0], tailings[1]]
        return inlets, tailings

    def write_commands(self, commands_lpm: list[float]) -> None:
        for history, command in zip(self.histories, commands_lpm, strict=True):
            history.append(command)
