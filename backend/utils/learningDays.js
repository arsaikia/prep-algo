export const utcDay = value => new Date(value).toISOString().slice(0, 10);

export function calculateCurrentStreak(dailyActivity, now = new Date()) {
    const days = Object.keys(dailyActivity)
        .filter(day => dailyActivity[day].questionsCompleted > 0 && day <= utcDay(now))
        .sort();
    const active = new Set(days);
    const dayAt = offset => utcDay(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    let offset = active.has(dayAt(0)) ? 0 : 1;
    let currentStreak = 0;
    while (active.has(dayAt(offset++))) currentStreak++;
    let longestStreak = 0;
    let run = 0;
    let previous;
    for (const day of days) {
        run = previous && Date.parse(day) - Date.parse(previous) === 86400000 ? run + 1 : 1;
        longestStreak = Math.max(longestStreak, run);
        previous = day;
    }
    return {
        currentStreak, longestStreak, lastActivityDate: days.at(-1) || null,
        totalActiveDays: days.length,
    };
}
