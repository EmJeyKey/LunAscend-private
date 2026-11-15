"""Bounded interpretation of submitted existing results; never launches science."""
from fastapi import APIRouter
from lunascend.contracts.assessment import AssessmentRequest, MissionAssessment
from lunascend.resilience.assessment import assess
router = APIRouter()
@router.post("/api/v1/scenarios/assess", response_model=MissionAssessment)
def mission_assessment(request: AssessmentRequest) -> MissionAssessment:
    return assess(request)
