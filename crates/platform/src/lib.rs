use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicI64, Ordering};

#[derive(Debug, Default)]
pub struct ClipboardGate {
    authorized_until_millis: AtomicI64,
}

impl ClipboardGate {
    pub fn authorize_until(&self, deadline_millis: i64) {
        self.authorized_until_millis
            .store(deadline_millis, Ordering::SeqCst);
    }

    pub fn consume(&self, now_millis: i64) -> bool {
        self.authorized_until_millis.swap(0, Ordering::SeqCst) >= now_millis
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Size {
    pub width: u32,
    pub height: u32,
}

/// Fits a preferred inner-window size inside a monitor work area while reserving
/// a visible inset for the native frame, taskbar, and resize edges.
pub fn fit_window_to_work_area(preferred: Size, work_area: Size, inset: u32) -> Size {
    let reserved = inset.saturating_mul(2);
    Size {
        width: preferred
            .width
            .min(work_area.width.saturating_sub(reserved).max(1)),
        height: preferred
            .height
            .min(work_area.height.saturating_sub(reserved).max(1)),
    }
}

pub fn clamp_window_to_monitor(window: Rect, monitor: Rect, margin: i32) -> Rect {
    let max_x = monitor.x + monitor.width as i32 - window.width as i32 - margin;
    let max_y = monitor.y + monitor.height as i32 - window.height as i32 - margin;
    Rect {
        x: window
            .x
            .clamp(monitor.x + margin, max_x.max(monitor.x + margin)),
        y: window
            .y
            .clamp(monitor.y + margin, max_y.max(monitor.y + margin)),
        ..window
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn corrects_an_offscreen_card_without_changing_size() {
        let monitor = Rect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };
        let card = Rect {
            x: 2200,
            y: -300,
            width: 320,
            height: 190,
        };
        assert_eq!(
            clamp_window_to_monitor(card, monitor, 12),
            Rect {
                x: 1588,
                y: 12,
                width: 320,
                height: 190
            }
        );
    }

    #[test]
    fn supports_monitors_with_negative_coordinates() {
        let monitor = Rect {
            x: -1920,
            y: 0,
            width: 1920,
            height: 1080,
        };
        let card = Rect {
            x: -2500,
            y: 900,
            width: 320,
            height: 190,
        };
        let clamped = clamp_window_to_monitor(card, monitor, 12);
        assert!(clamped.x >= -1908);
        assert!(clamped.y <= 878);
    }

    #[test]
    fn expanded_window_fits_a_short_laptop_work_area() {
        assert_eq!(
            fit_window_to_work_area(
                Size {
                    width: 1080,
                    height: 680,
                },
                Size {
                    width: 1093,
                    height: 582,
                },
                24,
            ),
            Size {
                width: 1045,
                height: 534,
            }
        );
    }

    #[test]
    fn expanded_window_keeps_its_preferred_size_when_space_allows() {
        assert_eq!(
            fit_window_to_work_area(
                Size {
                    width: 1080,
                    height: 680,
                },
                Size {
                    width: 1920,
                    height: 1040,
                },
                24,
            ),
            Size {
                width: 1080,
                height: 680,
            }
        );
    }

    #[test]
    fn window_fit_does_not_underflow_on_an_unusually_small_work_area() {
        assert_eq!(
            fit_window_to_work_area(
                Size {
                    width: 1080,
                    height: 680,
                },
                Size {
                    width: 40,
                    height: 30,
                },
                24,
            ),
            Size {
                width: 1,
                height: 1,
            }
        );
    }

    #[test]
    fn clipboard_gate_rejects_reads_without_explicit_authorization() {
        let gate = ClipboardGate::default();
        assert!(!gate.consume(1_000));
    }

    #[test]
    fn clipboard_gate_is_time_limited_and_single_use() {
        let gate = ClipboardGate::default();
        gate.authorize_until(4_000);
        assert!(gate.consume(2_000));
        assert!(!gate.consume(2_001));
        gate.authorize_until(4_000);
        assert!(!gate.consume(4_001));
    }
}
