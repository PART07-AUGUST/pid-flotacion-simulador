"""Ecuaciones de nivel y control para una celda de flotación.

La ganancia, los retardos y la sintonización PI proceden de Quintanilla et al.
(MethodsX 10, 2023, 102081). Los límites físicos son supuestos de simulación.
"""

from __future__ import annotations


SAMPLE_S = 1
GAIN_CM_PER_S_LPM = 0.001018
DELAYS_S = (7, 6, 3)
KC_LPM_PER_CM = (-62.0, -76.0, -85.0)
TI_S = (56.0, 30.0, 44.0)
KFF = (0.8, 0.8, 1.0)

# Valores asumidos para completar las funciones de transferencia publicadas.
INITIAL_LEVELS_CM = (30.0, 33.5, 33.0)
MAX_LEVEL_CM = 45.0
MIN_PUMP_LPM = 0.0
MAX_PUMP_LPM = 90.0


def clip(value: float, minimum: float, maximum: float) -> float:
    """Limita una variable al rango físico usado en la simulación."""
    return max(minimum, min(maximum, value))


def next_level(level_cm: float, inlet_lpm: float, tailings_lpm: float) -> float:
    """Balance discreto: h[k+1] = h[k] + dt*g*(Qin[k]-Qout[k])."""
    return clip(
        level_cm + SAMPLE_S * GAIN_CM_PER_S_LPM * (inlet_lpm - tailings_lpm),
        0.0,
        MAX_LEVEL_CM,
    )


def next_pump_command(
    cell: int,
    command_lpm: float,
    error_cm: float,
    previous_error_cm: float,
    inlet_lpm: float,
    previous_inlet_lpm: float,
    *,
    feedforward: bool,
) -> float:
    """PI incremental y corrección anticipativa opcional, con antiwindup.

    Kc es negativo porque al aumentar la extracción de colas baja el nivel.
    La acción derivativa no forma parte del controlador publicado.
    """
    proportional = KC_LPM_PER_CM[cell] * (error_cm - previous_error_cm)
    integral = KC_LPM_PER_CM[cell] * SAMPLE_S / TI_S[cell] * error_cm
    anticipation = (
        KFF[cell] * (inlet_lpm - previous_inlet_lpm) if feedforward else 0.0
    )
    proposal = command_lpm + proportional + integral + anticipation
    if (proposal < MIN_PUMP_LPM and integral < 0.0) or (
        proposal > MAX_PUMP_LPM and integral > 0.0
    ):
        proposal -= integral
    return clip(proposal, MIN_PUMP_LPM, MAX_PUMP_LPM)
