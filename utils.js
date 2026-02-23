export function countTokens(text) {
    // rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}

export function optimizePrompt(text) {
    if (!text) return text;

    // Basic local heuristics
    let optimized = text;
    // 1) Normalize whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // 2) Remove polite filler words/phrases that don't change intent
    const fillers = ["please", "kindly", "actually", "just", "literally", "thanks", "thank you"]; 
    fillers.forEach(f => {
        optimized = optimized.replace(new RegExp(`\\b${f}\\b`, 'gi'), '');
    });

    // 3) Shorten common opening phrases to imperative form
    const openings = ["Could you please", "Could you", "Can you please", "Can you", "Would you please", "Would you mind", "Would you"]; 
    openings.forEach(p => {
        optimized = optimized.replace(new RegExp(p, 'gi'), '');
    });

    // 4) Collapse repeated words (e.g., "very very" -> "very")
    optimized = optimized.replace(/\b(\w+)(?:\s+\1)+\b/gi, '$1');

    // 5) Trim leftover punctuation/spacing
    optimized = optimized.replace(/\s+([,.!?;:])/g, '$1');
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // If optimization removed everything, fall back to original
    if (!optimized) return text;

    return optimized;
}