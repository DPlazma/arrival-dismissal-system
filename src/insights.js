const { getAvailableDates, getEntriesForDate } = require('./activity-log');

// Analyze logs from the past N days and generate insights
async function generateInsights(days = 14) {
    const dates = await getAvailableDates();
    const recentDates = dates.slice(0, days);

    if (recentDates.length === 0) {
        return { summary: 'No activity data yet. Insights will appear after a day of use.', insights: [] };
    }

    // Gather all entries
    const allEntries = [];
    for (const date of recentDates) {
        const entries = await getEntriesForDate(date);
        allEntries.push(...entries.map(e => ({ ...e, date })));
    }

    const insights = [];

    // 1. Arrival time patterns per vehicle
    const arrivalTimes = {};
    for (const entry of allEntries) {
        if (entry.action === 'vehicle_arrived' && entry.vehicleType && entry.vehicleName) {
            const key = `${entry.vehicleType}:${entry.vehicleName}`;
            if (!arrivalTimes[key]) arrivalTimes[key] = [];
            const time = new Date(entry.timestamp);
            arrivalTimes[key].push(time.getHours() * 60 + time.getMinutes());
        }
    }

    for (const [key, times] of Object.entries(arrivalTimes)) {
        if (times.length < 3) continue; // need enough data
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const avgHour = Math.floor(avg / 60);
        const avgMin = Math.round(avg % 60);
        const [type, name] = key.split(':');
        const label = type === 'bus' ? `Bus ${name}` : `${type.charAt(0).toUpperCase() + type.slice(1)} ${name}`;

        insights.push({
            type: 'pattern',
            icon: '🕐',
            title: `${label} — usual arrival`,
            detail: `Typically arrives around ${avgHour}:${String(avgMin).padStart(2, '0')} (based on ${times.length} days)`
        });
    }

    // 2. Frequently absent vehicles
    const absentCounts = {};
    const totalDays = recentDates.length;
    for (const entry of allEntries) {
        if (entry.action === 'vehicle_absent' && entry.vehicleName) {
            const key = `${entry.vehicleType}:${entry.vehicleName}`;
            if (!absentCounts[key]) absentCounts[key] = new Set();
            absentCounts[key].add(entry.date);
        }
    }

    for (const [key, dates] of Object.entries(absentCounts)) {
        const rate = dates.size / totalDays;
        if (rate >= 0.3) { // absent 30%+ of the time
            const [type, name] = key.split(':');
            const label = type === 'bus' ? `Bus ${name}` : `${type.charAt(0).toUpperCase() + type.slice(1)} ${name}`;
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: `${label} — frequently absent`,
                detail: `Marked absent on ${dates.size} of ${totalDays} days (${Math.round(rate * 100)}%)`
            });
        }
    }

    // 3. Late arrivals (vehicles arriving after the average)
    for (const [key, times] of Object.entries(arrivalTimes)) {
        if (times.length < 5) continue;
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const stddev = Math.sqrt(times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length);
        const lateDays = times.filter(t => t > avg + stddev).length;
        const lateRate = lateDays / times.length;

        if (lateRate >= 0.3 && stddev > 15) { // late 30%+ and high variance
            const [type, name] = key.split(':');
            const label = type === 'bus' ? `Bus ${name}` : `${type.charAt(0).toUpperCase() + type.slice(1)} ${name}`;
            insights.push({
                type: 'info',
                icon: '📊',
                title: `${label} — inconsistent arrival`,
                detail: `Arrival time varies significantly (±${Math.round(stddev)} min). Late ${Math.round(lateRate * 100)}% of the time.`
            });
        }
    }

    // 4. Daily volume trends
    const dailyCounts = {};
    for (const entry of allEntries) {
        if (entry.action === 'vehicle_arrived') {
            if (!dailyCounts[entry.date]) dailyCounts[entry.date] = 0;
            dailyCounts[entry.date]++;
        }
    }

    const countValues = Object.values(dailyCounts);
    if (countValues.length >= 3) {
        const avgArrivals = Math.round(countValues.reduce((a, b) => a + b, 0) / countValues.length);
        insights.push({
            type: 'stat',
            icon: '📈',
            title: 'Daily average',
            detail: `About ${avgArrivals} vehicle arrivals per day over the last ${countValues.length} days`
        });
    }

    // 5. Busiest time of day
    const hourBuckets = {};
    for (const entry of allEntries) {
        if (entry.action === 'vehicle_arrived') {
            const hour = new Date(entry.timestamp).getHours();
            hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
        }
    }

    if (Object.keys(hourBuckets).length > 0) {
        const busiestHour = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
        const hour = parseInt(busiestHour[0]);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        insights.push({
            type: 'stat',
            icon: '⏰',
            title: 'Peak arrival time',
            detail: `Most vehicles arrive between ${displayHour}:00–${displayHour}:59 ${period}`
        });
    }

    // 6. Today's missing vehicles (if today has data)
    const today = new Date().toISOString().slice(0, 10);
    if (recentDates.includes(today)) {
        const todayArrivals = allEntries
            .filter(e => e.date === today && e.action === 'vehicle_arrived')
            .map(e => `${e.vehicleType}:${e.vehicleName}`);

        // Vehicles that usually arrive but haven't today
        const usualVehicles = Object.keys(arrivalTimes).filter(key => arrivalTimes[key].length >= 3);
        const missingToday = usualVehicles.filter(key => !todayArrivals.includes(key));

        if (missingToday.length > 0 && missingToday.length <= 5) {
            const names = missingToday.map(key => {
                const [type, name] = key.split(':');
                return type === 'bus' ? `Bus ${name}` : `${type.charAt(0).toUpperCase() + type.slice(1)} ${name}`;
            });
            insights.push({
                type: 'alert',
                icon: '🔍',
                title: 'Not yet arrived today',
                detail: `${names.join(', ')} — usually here by now based on past data`
            });
        }
    }

    // Sort: alerts first, then warnings, then patterns, then stats
    const order = { alert: 0, warning: 1, info: 2, pattern: 3, stat: 4 };
    insights.sort((a, b) => (order[a.type] ?? 5) - (order[b.type] ?? 5));

    return {
        summary: `Analyzed ${allEntries.length} events across ${recentDates.length} days`,
        daysAnalyzed: recentDates.length,
        insights
    };
}

module.exports = { generateInsights };
