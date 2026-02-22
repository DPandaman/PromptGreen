export function countTokens(text) {
    // rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}

export function optimizePrompt(text) {
    if (!text) return text;

    // Basic local heuristics
    let optimized = text;

    // remove filler words
    const fillers = ["please", "kindly", "actually", "just", "literally"];
    fillers.forEach(f => {
        const re = new RegExp(`\\b${f}\\b`, "gi");
        optimized = optimized.replace(re, '');
    });

    // collapse multiple spaces
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // remove redundant phrases (simple heuristic)
    const redundantPhrases = ["Could you", "Can you", "Would you mind"];
    redundantPhrases.forEach(p => {
        optimized = optimized.replace(new RegExp(p, "gi"), '');
    });

    return optimized;
}