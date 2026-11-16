"""Discrete level-control model for three flotation cells in series.

The identified pump-to-level model and PI settings come from Quintanilla et al.
(MethodsX 10, 2023, 102081). Flow limits, initial levels, and the symmetric
inlet-flow gain are explicit simulation assumptions, not measured article data.
"""

from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass


SAMPLE_S = 1
GAIN_CM_PER_S_LPM = 0.001018
DELAYS_S = (7, 6, 3)
KC_LPM_PER_CM = (-62.0, -76.0, -85.0)
TI_S = (56.0, 30.0, 44.0)
KFF = (0.8, 0.8, 1.0)

# Assumptions used to complete the published empirical transfer functions.
INITIAL_LEVEL_CM = 25.0
MAX_LEVEL_CM = 45.0
MIN_PUMP_LPM = 0.0
MAX_PUMP_LPM = 90.0


@dataclass(frozen=True)
class Scenario:
    duration_s: int = 900
    feed_lpm: float = 45.0
    feed_step_lpm: float = 8.0
    feed_step_s: int = 180
    setpoints_after_cm: tuple[float, float, float] = (25.4, 25.0, 25.0)
    setpoint_step_s: int = 450

    def validate(self) -> None:
        if not 120 <= self.duration_s <= 900:
            raise ValueError("La duración debe estar entre 120 y 900 s.")
        if not 20.0 <= self.feed_lpm <= 60.0:
            raise ValueError("El caudal inicial debe estar entre 20 y 60 L/min.")
        if not -15.0 <= self.feed_step_lpm <= 15.0:
            raise ValueError("El cambio de alimentación debe estar entre -15 y 15 L/min.")
        if not 0.0 <= self.feed_lpm + self.feed_step_lpm <= MAX_PUMP_LPM:
            raise ValueError("El caudal después del cambio queda fuera del rango simulado.")
        if not 0 <= self.feed_step_s < self.duration_s:
            raise ValueError("El instante del cambio de alimentación debe estar dentro del ensayo.")
        if not 0 <= self.setpoint_step_s < self.duration_s:
            raise ValueError("El instante del cambio de consigna debe estar dentro del ensayo.")
        if len(self.setpoints_after_cm) != 3 or any(
            not 5.0 <= value <= 40.0 for value in self.setpoints_after_cm
        ):
            raise ValueError("Indica tres consignas entre 5 y 40 cm.")


def _clip(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def run_scenario(
    scenario: Scenario,
    mode: str,
    *,
    closed_loop: bool = True,
) -> dict:
    """Run PI or PI+feedforward with identical initial conditions.

    At sample k the inlet to cells 2/3 is the *actual delayed* outflow of the
    previous cell. A command applied at k appears after theta_i samples.
    The incremental PI form accumulates changes in the pump command; the
    feedforward increment Kff*(d[k]-d[k-1]) therefore persists after a step.
    """
    scenario.validate()
    if mode not in {"pi", "pi_ff"}:
        raise ValueError("El modo debe ser 'pi' o 'pi_ff'.")

    levels = [INITIAL_LEVEL_CM] * 3
    commands = [scenario.feed_lpm] * 3
    histories = [deque([scenario.feed_lpm] * delay) for delay in DELAYS_S]
    previous_errors = [0.0] * 3
    previous_inlets = [scenario.feed_lpm] * 3
    iae = [0.0] * 3
    series = {
        "levels_cm": [[], [], []],
        "inlets_lpm": [[], [], []],
        "tailings_lpm": [[], [], []],
        "commands_lpm": [[], [], []],
    }

    for second in range(scenario.duration_s + 1):
        feed = scenario.feed_lpm + (
            scenario.feed_step_lpm if second >= scenario.feed_step_s else 0.0
        )
        setpoints = [
            scenario.setpoints_after_cm[i] if second >= scenario.setpoint_step_s
            else INITIAL_LEVEL_CM
            for i in range(3)
        ]
        tailings = [history.popleft() for history in histories]
        inlets = [feed, tailings[0], tailings[1]]

        for i in range(3):
            error = setpoints[i] - levels[i]
            if closed_loop:
                proportional = KC_LPM_PER_CM[i] * (error - previous_errors[i])
                integral = KC_LPM_PER_CM[i] * SAMPLE_S / TI_S[i] * error
                anticipation = (
                    KFF[i] * (inlets[i] - previous_inlets[i])
                    if mode == "pi_ff" else 0.0
                )
                proposal = commands[i] + proportional + integral + anticipation
                # Conditional integration prevents the integral increment from
                # driving an already saturated pump further into saturation.
                if (proposal < MIN_PUMP_LPM and integral < 0.0) or (
                    proposal > MAX_PUMP_LPM and integral > 0.0
                ):
                    proposal -= integral
                commands[i] = _clip(proposal, MIN_PUMP_LPM, MAX_PUMP_LPM)

            previous_errors[i] = error
            previous_inlets[i] = inlets[i]
            histories[i].append(commands[i])

            series["levels_cm"][i].append(round(levels[i], 6))
            series["inlets_lpm"][i].append(round(inlets[i], 6))
            series["tailings_lpm"][i].append(round(tailings[i], 6))
            series["commands_lpm"][i].append(round(commands[i], 6))

            if second < scenario.duration_s:
                iae[i] += abs(error) * SAMPLE_S

        if second < scenario.duration_s:
            for i in range(3):
                levels[i] = _clip(
                    levels[i] + SAMPLE_S * GAIN_CM_PER_S_LPM
                    * (inlets[i] - tailings[i]),
                    0.0,
                    MAX_LEVEL_CM,
                )

    return {
        **series,
        "iae_cm_s": [round(value, 6) for value in iae],
        "final_levels_cm": [round(value, 6) for value in levels],
    }


def compare_scenarios(scenario: Scenario) -> dict:
    """Return two independent runs plus shared scenario and model metadata."""
    scenario.validate()
    return {
        "scenario": asdict(scenario),
        "time_s": list(range(scenario.duration_s + 1)),
        "feed_lpm": [
            scenario.feed_lpm + (scenario.feed_step_lpm if k >= scenario.feed_step_s else 0.0)
            for k in range(scenario.duration_s + 1)
        ],
        "setpoints_cm": [
            [
                scenario.setpoints_after_cm[i] if k >= scenario.setpoint_step_s
                else INITIAL_LEVEL_CM
                for k in range(scenario.duration_s + 1)
            ]
            for i in range(3)
        ],
        "modes": {
            "pi": run_scenario(scenario, "pi"),
            "pi_ff": run_scenario(scenario, "pi_ff"),
        },
        "model": {
            "sample_s": SAMPLE_S,
            "gain_cm_per_s_lpm": GAIN_CM_PER_S_LPM,
            "delays_s": DELAYS_S,
            "kc_lpm_per_cm": KC_LPM_PER_CM,
            "ti_s": TI_S,
            "kff": KFF,
            "initial_level_cm": INITIAL_LEVEL_CM,
            "max_level_cm": MAX_LEVEL_CM,
            "pump_range_lpm": [MIN_PUMP_LPM, MAX_PUMP_LPM],
        },
    }
