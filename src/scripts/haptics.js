import { WebHaptics } from "web-haptics";

// Haptic feedback on phones. Android uses the Vibration API; iOS 18+ has no
// Vibration API, so web-haptics toggles a hidden switch control, which iOS
// answers with its native tick. Must be called from a tap handler.
//
// Only touch devices get an instance: on desktop there is nothing to feel,
// and this keeps the hidden switch out of the page.
const isTouch =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

let haptics = null;

/**
 * @param {"selection" | "light" | "soft" | "medium" | "success"} preset
 */
export function haptic(preset) {
    if (!isTouch) return;

    haptics ??= new WebHaptics();
    haptics.trigger(preset);
}
