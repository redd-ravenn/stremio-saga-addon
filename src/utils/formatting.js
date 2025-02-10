const formatVoteCount = (count) => {
    if (count >= 1000000) return `${Math.round(count / 1000000)}M`;
    if (count >= 1000) return `${Math.round(count / 1000)}k`;
    return count.toString();
};

const ratingToEmoji = (rating) => {
    if (rating >= 9) return '🏆';
    if (rating >= 8) return '🔥';
    if (rating >= 6) return '⭐';
    if (rating >= 5) return '😐';
    return '🥱';
};

module.exports = {
    formatVoteCount,
    ratingToEmoji
}; 