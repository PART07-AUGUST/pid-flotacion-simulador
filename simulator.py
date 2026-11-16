"""Ejecuta escenarios PI y PI+AA y reúne las series para la interfaz web."""

from __future__ import annotations

from dataclasses import asdict, dataclass

from cell_flow import CellFlow
from model_math import (
    DELAYS_S,
    GAIN_CM_PER_S_LPM,
    INITIAL_LEVELS_CM,
    KC_LPM_PER_CM,
    KFF,
    MAX_LEVEL_CM,
    MAX_PUMP_LPM,
    MIN_PUMP_LPM,
    SAMPLE_S,
    TI_S,
    next_level,
    next_pump_command,
)


@dataclass(frozen=True)
class Scenario:
    duration_s: int = 900
    feed_lpm: float = 45.0
    feed_step_lpm: float = 8.0
    feed_step_s: int = 180
    setpoints_after_cm: tuple[float, float, float] = (28.5, 32.5, 32.0)
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

    levels = list(INITIAL_LEVELS_CM)
    commands = [scenario.feed_lpm] * 3
    flow = CellFlow.at_equilibrium(scenario.feed_lpm)
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
            else INITIAL_LEVELS_CM[i]
            for i in range(3)
        ]
        inlets, tailings = flow.read_flows(feed)

        for i in range(3):
            error = setpoints[i] - levels[i]
            if closed_loop:
                commands[i] = next_pump_command(
                    i,
                    commands[i],
                    error,
                    previous_errors[i],
                    inlets[i],
                    previous_inlets[i],
                    feedforward=(mode == "pi_ff"),
                )

            previous_errors[i] = error
            previous_inlets[i] = inlets[i]

            series["levels_cm"][i].append(round(levels[i], 6))
            series["inlets_lpm"][i].append(round(inlets[i], 6))
            series["tailings_lpm"][i].append(round(tailings[i], 6))
            series["commands_lpm"][i].append(round(commands[i], 6))

            if second < scenario.duration_s:
                iae[i] += abs(error) * SAMPLE_S

        flow.write_commands(commands)
        if second < scenario.duration_s:
            for i in range(3):
                levels[i] = next_level(levels[i], inlets[i], tailings[i])

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
                else INITIAL_LEVELS_CM[i]
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
            "initial_levels_cm": INITIAL_LEVELS_CM,
            "max_level_cm": MAX_LEVEL_CM,
            "pump_range_lpm": [MIN_PUMP_LPM, MAX_PUMP_LPM],
        },
    }
