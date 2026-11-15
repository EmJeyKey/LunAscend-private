"""Describe returned products and omissions; never calculate or infer visibility."""
from lunascend.contracts.models import ProductAvailability, ScenarioResult


def describe_products(result: ScenarioResult) -> ScenarioResult:
    def status(code: str, reason: str) -> dict:
        return {"code": code, "reason": reason}

    def failure(module: str | None = None) -> dict:
        if not result.errors:
            return status("calculation_failed", "Requested product was not returned. No substitute result was generated.")
        error = next((e for e in result.errors if e.module == module), result.errors[0])
        code = {"MISSING_DATA": "dataset_unavailable", "OUTSIDE_COVERAGE": "outside_dataset_coverage",
                "FRAME_MISMATCH": "reference_frame_error", "PROVIDER_UNAVAILABLE": "unsupported"}.get(error.code, "calculation_failed")
        if error.code == "INVALID_REQUEST":
            code = "missing_observer_information" if "height" in error.message.lower() or "elevation" in error.message.lower() else "missing_user_settings"
        if error.code == "MISSING_DATA" and "Pinned terrain data is missing" in error.message:
            code = "dataset_not_installed"
        # Resource/module details remain in errors; this reason is not a coverage inference.
        return status(code, error.message)

    values = {}
    for body in ("sun", "earth"):
        present = any(getattr(row, body + "_elevation_deg").value is not None for row in result.observations or ())
        values[body + "_geometry"] = status("geometric_only", "SPICE center geometry relative to the ideal local horizon; not terrain visibility.") if present and result.provider_mode == "scientific" else status("unsupported", "Mock observations are illustrative, not scientific geometry.") if result.provider_mode == "mock" else failure()
        values[body + "_terrain_visibility"] = status("terrain_qualified", "Center classifications returned for finite modeled terrain. Read each sample's classification and coverage; clearance is not globally confirmed.") if result.terrain_visibility else status("not_requested", "Terrain analysis was disabled in this request. Geometry alone does not establish terrain visibility.") if not result.request.settings.terrain_enabled else failure()
    for name, enabled, product in (("power", result.request.settings.power_enabled, result.power), ("dte", result.request.settings.communication_enabled, result.communication)):
        values[name] = status("calculated", "Conditional engineering result returned under the requested settings; not a mission or radio-link guarantee.") if product else status("not_requested", "This engineering product was disabled in the request.") if not enabled else failure("power" if name == "power" else "communication")
    return ScenarioResult(**{**{key: value for key, value in result.__dict__.items()}, "availability": {key: ProductAvailability.model_validate(value) for key, value in values.items()}})
