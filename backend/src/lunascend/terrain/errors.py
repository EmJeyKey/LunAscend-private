"""Terrain errors usable without optional geospatial imports."""
from lunascend.contracts import AnalysisError


class TerrainError(Exception):
    def __init__(self, code: str, message: str):
        self.error = AnalysisError(code=code, message=message, module="terrain", recoverable=True)
        super().__init__(message)
