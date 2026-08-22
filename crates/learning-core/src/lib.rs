use chrono::{DateTime, Duration, Utc};
use fsrs::{ItemState, MemoryState, FSRS};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProductFeedback {
    Forgotten,
    Fuzzy,
    Remembered,
    TooEasy,
}

impl ProductFeedback {
    pub const fn fsrs_rating(self) -> u32 {
        match self {
            Self::Forgotten => 1,
            Self::Fuzzy => 2,
            Self::Remembered => 3,
            Self::TooEasy => 4,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedMemoryState {
    pub stability: f32,
    pub difficulty: f32,
}

impl From<MemoryState> for PersistedMemoryState {
    fn from(value: MemoryState) -> Self {
        Self {
            stability: value.stability,
            difficulty: value.difficulty,
        }
    }
}

impl From<PersistedMemoryState> for MemoryState {
    fn from(value: PersistedMemoryState) -> Self {
        Self {
            stability: value.stability,
            difficulty: value.difficulty,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsrsCardState {
    pub memory: Option<PersistedMemoryState>,
    pub last_reviewed_at: Option<DateTime<Utc>>,
    pub due_at: DateTime<Utc>,
    pub desired_retention: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleResult {
    pub state: FsrsCardState,
    pub interval_days: f32,
    pub fsrs_rating: u32,
}

#[derive(Debug, Error)]
pub enum LearningError {
    #[error("desired retention must be between 0.70 and 0.97")]
    InvalidRetention,
    #[error("review time cannot precede the previous review")]
    NonMonotonicReview,
    #[error("FSRS failed to compute the next state: {0}")]
    Fsrs(String),
}

pub fn schedule_review(
    previous: &FsrsCardState,
    reviewed_at: DateTime<Utc>,
    feedback: ProductFeedback,
) -> Result<ScheduleResult, LearningError> {
    if !(0.70..=0.97).contains(&previous.desired_retention) {
        return Err(LearningError::InvalidRetention);
    }
    let elapsed_days = match previous.last_reviewed_at {
        Some(last) if reviewed_at < last => return Err(LearningError::NonMonotonicReview),
        Some(last) => reviewed_at.signed_duration_since(last).num_days().max(0) as u32,
        None => 0,
    };
    let fsrs = FSRS::new(&[]).map_err(|error| LearningError::Fsrs(error.to_string()))?;
    let states = fsrs
        .next_states(
            previous.memory.map(Into::into),
            previous.desired_retention,
            elapsed_days,
        )
        .map_err(|error| LearningError::Fsrs(error.to_string()))?;
    let rating = feedback.fsrs_rating();
    let selected: ItemState = match feedback {
        ProductFeedback::Forgotten => states.again,
        ProductFeedback::Fuzzy => states.hard,
        ProductFeedback::Remembered => states.good,
        ProductFeedback::TooEasy => states.easy,
    };
    let interval_millis = (f64::from(selected.interval) * 86_400_000.0).round() as i64;
    Ok(ScheduleResult {
        state: FsrsCardState {
            memory: Some(selected.memory.into()),
            last_reviewed_at: Some(reviewed_at),
            due_at: reviewed_at + Duration::milliseconds(interval_millis.max(60_000)),
            desired_retention: previous.desired_retention,
        },
        interval_days: selected.interval,
        fsrs_rating: rating,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn new_card() -> FsrsCardState {
        FsrsCardState {
            memory: None,
            last_reviewed_at: None,
            due_at: Utc.with_ymd_and_hms(2026, 1, 1, 12, 0, 0).unwrap(),
            desired_retention: 0.9,
        }
    }

    #[test]
    fn product_feedback_maps_explicitly_to_fsrs() {
        assert_eq!(ProductFeedback::Forgotten.fsrs_rating(), 1);
        assert_eq!(ProductFeedback::Fuzzy.fsrs_rating(), 2);
        assert_eq!(ProductFeedback::Remembered.fsrs_rating(), 3);
        assert_eq!(ProductFeedback::TooEasy.fsrs_rating(), 4);
    }

    #[test]
    fn same_input_produces_the_same_schedule() {
        let now = Utc.with_ymd_and_hms(2026, 1, 1, 12, 0, 0).unwrap();
        let first = schedule_review(&new_card(), now, ProductFeedback::Remembered).unwrap();
        let second = schedule_review(&new_card(), now, ProductFeedback::Remembered).unwrap();
        assert_eq!(first, second);
        assert!(first.state.due_at > now);
    }

    #[test]
    fn easy_is_not_scheduled_before_again_for_a_new_card() {
        let now = Utc.with_ymd_and_hms(2026, 1, 1, 12, 0, 0).unwrap();
        let again = schedule_review(&new_card(), now, ProductFeedback::Forgotten).unwrap();
        let easy = schedule_review(&new_card(), now, ProductFeedback::TooEasy).unwrap();
        assert!(easy.interval_days >= again.interval_days);
    }

    #[test]
    fn rejects_non_monotonic_utc_reviews() {
        let mut card = new_card();
        card.last_reviewed_at = Some(Utc.with_ymd_and_hms(2026, 2, 2, 0, 0, 0).unwrap());
        let result = schedule_review(
            &card,
            Utc.with_ymd_and_hms(2026, 2, 1, 23, 0, 0).unwrap(),
            ProductFeedback::Fuzzy,
        );
        assert!(matches!(result, Err(LearningError::NonMonotonicReview)));
    }
}
