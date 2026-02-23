# Metrics assumptions and defaults

## Formulas

- **Energy (kWh):**  
  `energySavedKwh = (tokensSaved / 1000) * kwh_per_1k_tokens`

- **CO₂ (grams):**  
  `co2SavedGrams = energySavedKwh * co2_grams_per_kwh`

- **Time saved (optional):**  
  `timeSavedSeconds = (tokensSaved / 1000) * time_saved_seconds_per_1k_tokens`

All three factors are configurable in Settings. Report and popup use the same settings.

## Defaults

| Setting | Default | Notes |
|--------|---------|------|
| `kwh_per_1k_tokens` | 0.003 | Rough estimate for inference; depends on model and hardware. |
| `co2_grams_per_kwh` | By region | See table below. |
| `time_saved_seconds_per_1k_tokens` | 5 | Optional “productivity” estimate; not used for energy/CO₂. |

## Regional CO₂ (grams per kWh)

| Region | Default g/kWh | Source idea |
|--------|----------------|-------------|
| US | 385 | EPA / grid average |
| EU | 275 | EU grid mix |
| IN | 708 | India grid |
| Custom | User-entered | Override in Settings |

## Disclaimer

Estimates depend on:

- Model size and inference path (e.g. MoE vs dense).
- Hardware (GPU type, utilization).
- Datacenter location and grid carbon intensity.
- What “tokens saved” represents (e.g. prompt optimization only).

PromptGreen does not send data to any server. All calculations use the factors above and the user’s chosen region/overrides. Treat all numbers as indicative, not certified.
