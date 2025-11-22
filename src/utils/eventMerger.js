export function mergeConsecutiveEvents(events) {
    const merged = [];

    for (let i = 0; i < events.length; i++) {
        const current = events[i];
        const next = events[i + 1];

        if (shouldMergeEvents(current, next)) {
            merged.push({
                ...current,
                end: next.end,
                endInputType: next.endInputType,
                endOutputType: next.endOutputType
            });
            i++;
        } else {
            merged.push(current);
        }
    }

    return merged;
}

function shouldMergeEvents(current, next) {
    if (!next) return false;

    return (
        current.title === next.title &&
        current.location === next.location &&
        current.description === next.description &&
        isSameDay(current, next) &&
        isDirectlyFollowing(current, next)
    );
}

function isSameDay(current, next) {
    return (
        current.start[0] === next.start[0] &&
        current.start[1] === next.start[1] &&
        current.start[2] === next.start[2]
    );
}

function isDirectlyFollowing(current, next) {
    return (
        current.end[3] === next.start[3] &&
        current.end[4] === next.start[4]
    );
}
