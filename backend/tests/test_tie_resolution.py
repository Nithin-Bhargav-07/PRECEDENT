from unittest.mock import patch, MagicMock
from app.services.engine.matcher import evaluate_situation
from app.models.review import PrecedentMatch
from app.models.enums import CaseOutcomeType
import pytest

@pytest.fixture
def mock_case_a():
    case = MagicMock()
    case.id = "case_A"
    case.case_name = "Case A"
    case.outcome_type = CaseOutcomeType.MISSION_LOSS
    return case

@pytest.fixture
def mock_case_b():
    case = MagicMock()
    case.id = "case_B"
    case.case_name = "Case B"
    case.outcome_type = CaseOutcomeType.MISSION_LOSS
    return case

@pytest.fixture
def mock_precedent_match():
    def create_match(case_name, overlap, overmatch, categories=4):
        match = MagicMock(spec=PrecedentMatch)
        match.case_id = f"id_{case_name}"
        match.case_name = case_name
        match.overlap_score = overlap
        match.historical_overmatch = overmatch
        match.is_primary = False
        match.is_tied = False
        match.category_overlap = {1: 1, 2: 1, 3: 1, 4: 1} if categories == 4 else {1: 1, 2: 1, 3: 1}
        match.shared_factors = []
        return match
    return create_match

@patch("app.services.engine.matcher.should_abstain")
@patch("app.services.engine.matcher.evaluate_single_case")
@patch("app.services.engine.matcher.compute_case_ranking_tuple")
def test_exact_tie(mock_rank, mock_eval, mock_abstain, mock_case_a, mock_case_b, mock_precedent_match):
    mock_abstain.return_value = (False, None)
    # Setup
    mock_eval.side_effect = [
        mock_precedent_match("Case A", 7.5, 0, 4),
        mock_precedent_match("Case B", 7.5, 0, 4)
    ]
    mock_rank.side_effect = [
        (7.5, 4, 0, 2.0),
        (7.5, 4, 0, 2.0)
    ]
    
    result = evaluate_situation("session_1", "Test", "Test", {}, [mock_case_a, mock_case_b])
    assert result.is_exact_tie is True
    assert len([m for m in result.matched_cases if m.is_primary]) == 2
    assert [m.case_name for m in result.matched_cases if m.is_primary] == ["Case A", "Case B"]
    assert all(m.is_tied for m in result.matched_cases if m.is_primary)

@patch("app.services.engine.matcher.should_abstain")
@patch("app.services.engine.matcher.evaluate_single_case")
@patch("app.services.engine.matcher.compute_case_ranking_tuple")
def test_different_score_org(mock_rank, mock_eval, mock_abstain, mock_case_a, mock_case_b, mock_precedent_match):
    mock_abstain.return_value = (False, None)
    mock_eval.side_effect = [
        mock_precedent_match("Case A", 7.5, 0, 4),
        mock_precedent_match("Case B", 7.5, 0, 4)
    ]
    mock_rank.side_effect = [
        (7.5, 4, 0, 2.0),
        (7.5, 4, 0, 1.5)
    ]
    
    result = evaluate_situation("session_1", "Test", "Test", {}, [mock_case_a, mock_case_b])
    assert result.is_exact_tie is False
    primary = [m for m in result.matched_cases if m.is_primary]
    assert len(primary) == 1
    assert primary[0].case_name == "Case A"
    assert not primary[0].is_tied

@patch("app.services.engine.matcher.should_abstain")
@patch("app.services.engine.matcher.evaluate_single_case")
@patch("app.services.engine.matcher.compute_case_ranking_tuple")
def test_different_overlap(mock_rank, mock_eval, mock_abstain, mock_case_a, mock_case_b, mock_precedent_match):
    mock_abstain.return_value = (False, None)
    mock_eval.side_effect = [
        mock_precedent_match("Case A", 7.9, 0, 4),
        mock_precedent_match("Case B", 7.5, 0, 4)
    ]
    mock_rank.side_effect = [
        (7.9, 4, 0, 2.0),
        (7.5, 4, 0, 2.0)
    ]
    
    result = evaluate_situation("session_1", "Test", "Test", {}, [mock_case_a, mock_case_b])
    assert result.is_exact_tie is False
    primary = [m for m in result.matched_cases if m.is_primary]
    assert len(primary) == 1
    assert primary[0].case_name == "Case A"

@patch("app.services.engine.matcher.should_abstain")
@patch("app.services.engine.matcher.evaluate_single_case")
@patch("app.services.engine.matcher.compute_case_ranking_tuple")
def test_different_category_breadth(mock_rank, mock_eval, mock_abstain, mock_case_a, mock_case_b, mock_precedent_match):
    mock_abstain.return_value = (False, None)
    mock_eval.side_effect = [
        mock_precedent_match("Case A", 7.5, 0, 4),
        mock_precedent_match("Case B", 7.5, 0, 3)
    ]
    mock_rank.side_effect = [
        (7.5, 4, 0, 2.0),
        (7.5, 3, 0, 2.0)
    ]
    
    result = evaluate_situation("session_1", "Test", "Test", {}, [mock_case_a, mock_case_b])
    assert result.is_exact_tie is False
    primary = [m for m in result.matched_cases if m.is_primary]
    assert len(primary) == 1
    assert primary[0].case_name == "Case A"

@patch("app.services.engine.matcher.should_abstain")
@patch("app.services.engine.matcher.evaluate_single_case")
@patch("app.services.engine.matcher.compute_case_ranking_tuple")
def test_different_historical_overmatch(mock_rank, mock_eval, mock_abstain, mock_case_a, mock_case_b, mock_precedent_match):
    mock_abstain.return_value = (False, None)
    mock_eval.side_effect = [
        mock_precedent_match("Case A", 7.5, 0, 4),
        mock_precedent_match("Case B", 7.5, -2, 4)
    ]
    mock_rank.side_effect = [
        (7.5, 4, 0, 2.0),
        (7.5, 4, -2, 2.0)
    ]
    
    result = evaluate_situation("session_1", "Test", "Test", {}, [mock_case_a, mock_case_b])
    assert result.is_exact_tie is False
    primary = [m for m in result.matched_cases if m.is_primary]
    assert len(primary) == 1
    assert primary[0].case_name == "Case A"

@patch("app.services.engine.matcher.should_abstain")
@patch("app.services.engine.matcher.evaluate_single_case")
@patch("app.services.engine.matcher.compute_case_ranking_tuple")
def test_aurora_challenger_scenario(mock_rank, mock_eval, mock_abstain, mock_case_a, mock_case_b, mock_precedent_match):
    mock_abstain.return_value = (False, None)
    mock_eval.side_effect = [
        mock_precedent_match("Aurora", 7.5, 0, 4),
        mock_precedent_match("Challenger", 7.5, 0, 4)
    ]
    mock_rank.side_effect = [
        (7.5, 4, 0, 2.0),
        (7.5, 4, 0, 2.0)
    ]
    
    result = evaluate_situation("session_1", "Test", "Test", {}, [mock_case_a, mock_case_b])
    assert result.is_exact_tie is True
    primary = [m for m in result.matched_cases if m.is_primary]
    assert len(primary) == 2
    assert "Aurora" in [m.case_name for m in primary]
    assert "Challenger" in [m.case_name for m in primary]
