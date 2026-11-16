"""Tests of the physical response and comparison used by the web app."""

import unittest

from simulator import (
    GAIN_CM_PER_S_LPM,
    INITIAL_LEVEL_CM,
    MAX_LEVEL_CM,
    MAX_PUMP_LPM,
    MIN_PUMP_LPM,
    Scenario,
    compare_scenarios,
    run_scenario,
)


class ModelTests(unittest.TestCase):
    def test_equilibrium_stays_at_initial_level(self):
        scenario = Scenario(
            duration_s=120,
            feed_step_lpm=0,
            setpoints_after_cm=(25, 25, 25),
            feed_step_s=0,
            setpoint_step_s=0,
        )
        for mode in ("pi", "pi_ff"):
            result = run_scenario(scenario, mode)
            self.assertEqual(result["iae_cm_s"], [0, 0, 0])
            for levels in result["levels_cm"]:
                self.assertTrue(all(value == INITIAL_LEVEL_CM for value in levels))

    def test_pump_step_has_published_delay_and_negative_level_gain(self):
        scenario = Scenario(
            duration_s=120,
            feed_step_lpm=0,
            feed_step_s=0,
            setpoints_after_cm=(25.2, 25, 25),
            setpoint_step_s=0,
        )
        result = run_scenario(scenario, "pi")
        tailings = result["tailings_lpm"][0]
        levels = result["levels_cm"][0]
        self.assertEqual(tailings[:7], [45] * 7)
        self.assertNotEqual(tailings[7], 45)
        self.assertEqual(levels[:8], [25] * 8)
        expected_increment = GAIN_CM_PER_S_LPM * (45 - tailings[7])
        self.assertAlmostEqual(levels[8] - levels[7], expected_increment, places=5)

    def test_downstream_inlets_equal_upstream_actual_tailings(self):
        result = compare_scenarios(Scenario(duration_s=180, feed_step_s=20, setpoint_step_s=80))
        for mode in result["modes"].values():
            self.assertEqual(mode["inlets_lpm"][1], mode["tailings_lpm"][0])
            self.assertEqual(mode["inlets_lpm"][2], mode["tailings_lpm"][1])

    def test_default_feedforward_reduces_iae_in_three_cells(self):
        result = compare_scenarios(Scenario())
        pi = result["modes"]["pi"]["iae_cm_s"]
        ff = result["modes"]["pi_ff"]["iae_cm_s"]
        self.assertTrue(all(ff[i] < pi[i] for i in range(3)))

    def test_extreme_setpoints_respect_simulation_limits(self):
        scenario = Scenario(
            duration_s=120,
            feed_step_s=0,
            setpoint_step_s=0,
            setpoints_after_cm=(40, 5, 40),
        )
        result = run_scenario(scenario, "pi_ff")
        for commands in result["commands_lpm"]:
            self.assertTrue(all(MIN_PUMP_LPM <= value <= MAX_PUMP_LPM for value in commands))
        for levels in result["levels_cm"]:
            self.assertTrue(all(0 <= value <= MAX_LEVEL_CM for value in levels))

    def test_invalid_event_time_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "dentro del ensayo"):
            run_scenario(Scenario(duration_s=120, feed_step_s=120), "pi")


if __name__ == "__main__":
    unittest.main()
